;; ============================================================
;; LastSats Vault - Bitcoin Inheritance Protocol
;; Clarity Smart Contract for Stacks Blockchain
;; Version: 2.3.0 (Clarity 3 / Clarinet 4 compatible)
;; ============================================================
;;
;; OVERVIEW:
;;   Trustless dead-man's-switch inheritance vault for sBTC.
;;   Owner deposits sBTC, designates up to 10 beneficiaries,
;;   and checks in regularly. Missing check-ins triggers a
;;   30-day grace period after which funds auto-distribute.
;;
;; AUDIT STATUS:
;;   NOT yet audited. Do not deposit significant funds until
;;   a Tier-1 audit is complete.
;;
;; SETUP FLOW:
;;   1. create-vault             deposit sBTC, set interval/tier/guardian
;;   2. add-beneficiary          once per beneficiary (up to tier limit)
;;   3. finalize-beneficiaries   lock config, enforce 100% allocation
;;   4. send-heartbeat           call regularly to keep vault alive
;;
;; EXECUTION FLOW:
;;   5. sync-vault-status        anyone calls once deadline passes
;;   6. [30-day grace window]    owner can still heartbeat to cancel
;;   7. trigger-distribution     anyone calls after grace expires
;;   8. claim-timelocked         time-locked beneficiaries call later
;;
;; STATE MACHINE:
;;   ACTIVE    (0) - Vault healthy. Owner has full control.
;;   WARNING   (1) - Deadline within 7 days.
;;   GRACE     (2) - Heartbeat missed. 30-day grace period running.
;;   EXECUTING (3) - Grace expired. Permissionless distribution.
;;   COMPLETE  (4) - Funds distributed or vault withdrawn. Terminal.
;;   PAUSED    (5) - Guardian paused during grace. Max 30 days.
;;
;; CLARITY 3 as-contract RULE:
;;   as-contract is only valid as a direct expression inside
;;   define-public. It cannot appear inside let bindings.
;;   All functions that need as-contract are structured so the
;;   as-contract call is NOT inside any let binding.
;; ============================================================


;; ============================================================
;; CONSTANTS
;; ============================================================

(define-constant CONTRACT-VERSION "2.3.0")
(define-constant SBTC-TOKEN 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token)

;; CONTRACT-PRINCIPAL: this contract's own address.
;; IMPORTANT: Update this to your actual deployed contract address before mainnet deployment.
;; Used as recipient in create-vault deposit transfer to avoid as-contract in let binding.
(define-constant CONTRACT-PRINCIPAL 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.lastsats-vault)

(define-constant ERR-NOT-AUTHORIZED        (err u100))
(define-constant ERR-VAULT-NOT-FOUND       (err u101))
(define-constant ERR-INVALID-TIER          (err u102))
(define-constant ERR-INVALID-AMOUNT        (err u103))
(define-constant ERR-INVALID-INTERVAL      (err u104))
(define-constant ERR-INVALID-BENEFICIARIES (err u105))
(define-constant ERR-VAULT-NOT-ACTIVE      (err u106))
(define-constant ERR-NOT-IN-GRACE          (err u109))
(define-constant ERR-NOT-GUARDIAN          (err u110))
(define-constant ERR-ALREADY-PAUSED        (err u111))
(define-constant ERR-TRANSFER-FAILED       (err u112))
(define-constant ERR-PCT-EXCEEDS-100       (err u114))
(define-constant ERR-PCT-NOT-100           (err u115))
(define-constant ERR-MAX-BENEFICIARIES     (err u116))
(define-constant ERR-VAULT-FINALIZED       (err u117))
(define-constant ERR-TIER-LIMIT            (err u118))
(define-constant ERR-NOT-DISTRIBUTING      (err u119))
(define-constant ERR-ALREADY-DISTRIBUTED   (err u120))

(define-constant GRACE-PERIOD-BLOCKS  (* u30  u144))
(define-constant WARNING-BLOCKS       (* u7   u144))
(define-constant PAUSE-MAX-BLOCKS     (* u30  u144))

(define-constant INTERVAL-30D  (* u30  u144))
(define-constant INTERVAL-60D  (* u60  u144))
(define-constant INTERVAL-90D  (* u90  u144))
(define-constant INTERVAL-180D (* u180 u144))

(define-constant TIER-FREE   u0)
(define-constant TIER-HODLER u1)
(define-constant TIER-WHALE  u2)

(define-constant FREE-MAX-BEN   u1)
(define-constant HODLER-MAX-BEN u5)
(define-constant WHALE-MAX-BEN  u10)
(define-constant MAX-BENEFICIARIES u10)

(define-constant BPS u10000)


;; ============================================================
;; EVENTS
;; ============================================================

(define-map vault-events
  { event-id: uint }
  {
    vault-id:    uint,
    event-type:  (string-ascii 32),
    sender:      principal,
    block-height: uint,
    data:        (optional (string-ascii 256))
  }
)

(define-data-var next-event-id uint u1)

(define-private (log-event (vault-id uint) (event-type (string-ascii 32)) (data (optional (string-ascii 256))))
  (let ((event-id (var-get next-event-id)))
    (map-set vault-events
      { event-id: event-id }
      {
        vault-id:     vault-id,
        event-type:   event-type,
        sender:       tx-sender,
        block-height: block-height,
        data:         data
      }
    )
    (var-set next-event-id (+ event-id u1))
    event-id
  )
)

;; ============================================================
;; DATA MAPS
;; ============================================================

(define-map vaults
  { vault-id: uint }
  {
    owner:                 principal,
    sbtc-amount:           uint,
    status:                uint,
    heartbeat-interval:    uint,
    last-heartbeat-block:  uint,
    grace-start-block:     (optional uint),
    pause-start-block:     (optional uint),
    guardian:              (optional principal),
    created-at-block:      uint,
    tier:                  uint,
    finalized:             bool,
  }
)

(define-map beneficiaries
  { vault-id: uint, index: uint }
  {
    address:          principal,
    percentage:       uint,
    time-lock-blocks: uint,
    distributed:      bool,
  }
)

(define-map beneficiary-count
  { vault-id: uint }
  { count: uint }
)

(define-map timelocked-escrow
  { vault-id: uint, beneficiary: principal }
  {
    amount:       uint,
    unlock-block: uint,
    claimed:      bool,
  }
)

(define-data-var next-vault-id        uint u1)
(define-data-var total-vaults         uint u0)
(define-data-var total-sbtc-protected uint u0)


;; ============================================================
;; PRIVATE HELPERS
;; ============================================================

(define-private (is-valid-interval (interval uint))
  (or
    (is-eq interval INTERVAL-30D)
    (is-eq interval INTERVAL-60D)
    (is-eq interval INTERVAL-90D)
    (is-eq interval INTERVAL-180D)
  )
)

(define-private (is-valid-guardian (guardian (optional principal)))
  (match guardian
    addr
      ;; Guardian must be different from sender and must be valid principal format
      (not (is-eq addr tx-sender))
    true ;; None is always valid
  )
)

(define-private (is-valid-beneficiary (address principal) (percentage uint))
  (and
    ;; Beneficiary cannot be the vault owner
    (not (is-eq address tx-sender))
    ;; Percentage must be between 1 and 100
    (>= percentage u1)
    (<= percentage u10000) ;; 100% in basis points
  )
)

(define-private (tier-max-bens (tier uint))
  (if (is-eq tier TIER-FREE)
    FREE-MAX-BEN
    (if (is-eq tier TIER-HODLER)
      HODLER-MAX-BEN
      WHALE-MAX-BEN
    )
  )
)

(define-private (deadline-of (vault-id uint))
  (match (map-get? vaults { vault-id: vault-id })
    vault (+ (get last-heartbeat-block vault) (get heartbeat-interval vault))
    u0
  )
)

(define-private (compute-status (vault-id uint))
  (match (map-get? vaults { vault-id: vault-id })
    vault
      (let (
        (stored   (get status vault))
        (deadline (+ (get last-heartbeat-block vault) (get heartbeat-interval vault)))
      )
        (if (or (is-eq stored u4) (is-eq stored u3))
          stored
          (if (is-eq stored u5)
            (match (get pause-start-block vault)
              pause-blk
                (if (>= block-height (+ pause-blk PAUSE-MAX-BLOCKS)) u2 u5)
              u5
            )
            (if (< block-height deadline)
              (if (< (- deadline block-height) WARNING-BLOCKS) u1 u0)
              (match (get grace-start-block vault)
                grace-blk
                  (if (>= block-height (+ grace-blk GRACE-PERIOD-BLOCKS)) u3 u2)
                u2
              )
            )
          )
        )
      )
    u0
  )
)

(define-private (pct-at (vault-id uint) (index uint))
  (match (map-get? beneficiaries { vault-id: vault-id, index: index })
    b (get percentage b)
    u0
  )
)

(define-private (total-pct (vault-id uint))
  (+
    (pct-at vault-id u0) (pct-at vault-id u1) (pct-at vault-id u2)
    (pct-at vault-id u3) (pct-at vault-id u4) (pct-at vault-id u5)
    (pct-at vault-id u6) (pct-at vault-id u7) (pct-at vault-id u8)
    (pct-at vault-id u9)
  )
)

;; Data-only fold pass for trigger-distribution.
;; Marks slots as distributed and writes timelocked-escrow records.
;; No sBTC transfers - as-contract is not valid in define-private.
(define-private (distribute-one
  (index uint)
  (state { vault-id: uint, total: uint, ok: bool })
)
  (if (not (get ok state))
    state
    (match (map-get? beneficiaries { vault-id: (get vault-id state), index: index })
      b
        (if (get distributed b)
          state
          (let (
            (share    (/ (* (get total state) (get percentage b)) BPS))
            (vault-id (get vault-id state))
          )
            (if (is-eq share u0)
              state
              (begin
                (if (> (get time-lock-blocks b) u0)
                  (map-set timelocked-escrow
                    { vault-id: vault-id, beneficiary: (get address b) }
                    {
                      amount:       share,
                      unlock-block: (+ block-height (get time-lock-blocks b)),
                      claimed:      false,
                    }
                  )
                  true
                )
                (map-set beneficiaries
                  { vault-id: vault-id, index: index }
                  (merge b { distributed: true })
                )
                (merge state { ok: true })
              )
            )
          )
        )
      state
    )
  )
)

;; Helper: compute share for one beneficiary slot (0 if slot empty)
(define-private (share-of (amount uint) (vault-id uint) (index uint))
  (match (map-get? beneficiaries { vault-id: vault-id, index: index })
    b (/ (* amount (get percentage b)) BPS)
    u0
  )
)

;; Helper: get beneficiary address for one slot (returns contract address as sentinel if empty)
(define-private (addr-of (vault-id uint) (index uint))
  (match (map-get? beneficiaries { vault-id: vault-id, index: index })
    b (get address b)
    'SP000000000000000000002Q6VF78
  )
)

;; Helper: true if slot is immediate-release and has a non-zero share
(define-private (needs-transfer (amount uint) (vault-id uint) (index uint))
  (match (map-get? beneficiaries { vault-id: vault-id, index: index })
    b (and
        (is-eq (get time-lock-blocks b) u0)
        (> (/ (* amount (get percentage b)) BPS) u0)
      )
    false
  )
)


;; ============================================================
;; PUBLIC FUNCTIONS
;; ============================================================

;; ------------------------------------------------------------
;; create-vault
;; Deposits sBTC into this contract. as-contract used only to
;; compute this contract's principal as recipient - not to
;; execute the transfer (caller is the sender here).
;; ------------------------------------------------------------
(define-public (create-vault
  (heartbeat-interval uint)
  (sbtc-amount        uint)
  (tier               uint)
  (guardian           (optional principal))
)
  (let (
    (vault-id (var-get next-vault-id))
    (caller   tx-sender)
  )
    (asserts! (is-valid-interval heartbeat-interval) ERR-INVALID-INTERVAL)
    (asserts! (> sbtc-amount u0)                     ERR-INVALID-AMOUNT)
    (asserts! (<= tier TIER-WHALE)                   ERR-INVALID-TIER)
    (asserts! (is-valid-guardian guardian)           ERR-NOT-AUTHORIZED)

    ;; Deposit: caller sends TO this contract.
    ;; CONTRACT-PRINCIPAL constant holds this contract's address (set below).
    (try! (contract-call? SBTC-TOKEN transfer sbtc-amount caller CONTRACT-PRINCIPAL none))

    (map-set vaults
      { vault-id: vault-id }
      {
        owner:                caller,
        sbtc-amount:          sbtc-amount,
        status:               u0,
        heartbeat-interval:   heartbeat-interval,
        last-heartbeat-block: block-height,
        grace-start-block:    none,
        pause-start-block:    none,
        guardian:             guardian,
        created-at-block:     block-height,
        tier:                 tier,
        finalized:            false,
      }
    )

    (map-set beneficiary-count { vault-id: vault-id } { count: u0 })
    (var-set next-vault-id        (+ vault-id u1))
    (var-set total-vaults         (+ (var-get total-vaults) u1))
    (var-set total-sbtc-protected (+ (var-get total-sbtc-protected) sbtc-amount))

    ;; Log vault creation event
    (log-event vault-id "vault-created" (some "Vault created successfully"))

    (ok vault-id)
  )
)


;; ------------------------------------------------------------
;; add-beneficiary
;; ------------------------------------------------------------
(define-public (add-beneficiary
  (vault-id            uint)
  (beneficiary-address principal)
  (percentage          uint)
  (time-lock-blocks    uint)
)
  (let (
    (vault     (unwrap! (map-get? vaults { vault-id: vault-id })           ERR-VAULT-NOT-FOUND))
    (cnt-data  (unwrap! (map-get? beneficiary-count { vault-id: vault-id }) ERR-VAULT-NOT-FOUND))
    (cur-count (get count cnt-data))
    (cur-total (total-pct vault-id))
  )
    (asserts! (is-eq tx-sender (get owner vault))           ERR-NOT-AUTHORIZED)
    (asserts! (not (get finalized vault))                   ERR-VAULT-FINALIZED)
    (asserts! (is-eq (compute-status vault-id) u0)          ERR-VAULT-NOT-ACTIVE)
    (asserts! (is-valid-beneficiary beneficiary-address percentage) ERR-INVALID-BENEFICIARIES)
    (asserts! (> percentage u0)                             ERR-INVALID-BENEFICIARIES)
    (asserts! (<= (+ cur-total percentage) BPS)             ERR-PCT-EXCEEDS-100)
    (asserts! (< cur-count (tier-max-bens (get tier vault))) ERR-TIER-LIMIT)
    (asserts! (< cur-count MAX-BENEFICIARIES)               ERR-MAX-BENEFICIARIES)

    (map-set beneficiaries
      { vault-id: vault-id, index: cur-count }
      {
        address:          beneficiary-address,
        percentage:       percentage,
        time-lock-blocks: time-lock-blocks,
        distributed:      false,
      }
    )
    (map-set beneficiary-count { vault-id: vault-id } { count: (+ cur-count u1) })

    ;; Log beneficiary addition
    (log-event vault-id "beneficiary-added" (some "Beneficiary added to vault"))

    (ok (+ cur-count u1))
  )
)


;; ------------------------------------------------------------
;; finalize-beneficiaries
;; ------------------------------------------------------------
(define-public (finalize-beneficiaries (vault-id uint))
  (let (
    (vault     (unwrap! (map-get? vaults { vault-id: vault-id }) ERR-VAULT-NOT-FOUND))
    (cur-total (total-pct vault-id))
  )
    (asserts! (is-eq tx-sender (get owner vault)) ERR-NOT-AUTHORIZED)
    (asserts! (not (get finalized vault))          ERR-VAULT-FINALIZED)
    (asserts! (is-eq cur-total BPS)               ERR-PCT-NOT-100)

    (map-set vaults { vault-id: vault-id } (merge vault { finalized: true }))

    ;; Log finalization
    (log-event vault-id "vault-finalized" (some "Beneficiaries finalized"))
    
    (ok true)
  )
)


;; ------------------------------------------------------------
;; send-heartbeat
;; ------------------------------------------------------------
(define-public (send-heartbeat (vault-id uint))
  (let (
    (vault       (unwrap! (map-get? vaults { vault-id: vault-id }) ERR-VAULT-NOT-FOUND))
    (live-status (compute-status vault-id))
  )
    (asserts! (is-eq tx-sender (get owner vault)) ERR-NOT-AUTHORIZED)
    (asserts!
      (or (is-eq live-status u0) (is-eq live-status u1) (is-eq live-status u2))
      ERR-VAULT-NOT-ACTIVE
    )
    (map-set vaults { vault-id: vault-id }
      (merge vault {
        last-heartbeat-block: block-height,
        status:               u0,
        grace-start-block:    none,
        pause-start-block:    none,
      })
    )
    (ok true)
  )
)


;; ------------------------------------------------------------
;; sync-vault-status
;; ------------------------------------------------------------
(define-public (sync-vault-status (vault-id uint))
  (let (
    (vault    (unwrap! (map-get? vaults { vault-id: vault-id }) ERR-VAULT-NOT-FOUND))
    (deadline (+ (get last-heartbeat-block vault) (get heartbeat-interval vault)))
  )
    (if (and
          (>= block-height deadline)
          (is-none (get grace-start-block vault))
          (is-eq (get status vault) u0)
        )
      (begin
        (map-set vaults { vault-id: vault-id }
          (merge vault { status: u2, grace-start-block: (some block-height) })
        )
        (ok true)
      )
      (ok false)
    )
  )
)


;; ------------------------------------------------------------
;; pause-execution
;; ------------------------------------------------------------
(define-public (pause-execution (vault-id uint))
  (let (
    (vault       (unwrap! (map-get? vaults { vault-id: vault-id }) ERR-VAULT-NOT-FOUND))
    (live-status (compute-status vault-id))
  )
    (asserts!
      (match (get guardian vault) guard (is-eq tx-sender guard) false)
      ERR-NOT-GUARDIAN
    )
    (asserts! (is-eq live-status u2)               ERR-NOT-IN-GRACE)
    (asserts! (not (is-eq (get status vault) u5))  ERR-ALREADY-PAUSED)

    (map-set vaults { vault-id: vault-id }
      (merge vault { status: u5, pause-start-block: (some block-height) })
    )
    (ok true)
  )
)


;; ------------------------------------------------------------
;; trigger-distribution
;;
;; Pass 1 (fold): data pass - marks slots distributed, writes escrow.
;; Pass 2: as-contract transfers for immediate-release slots.
;;
;; KEY INSIGHT: as-contract is valid inside define-public as long as
;; it is NOT inside a let binding. Here we read all slot data in the
;; outer let, then execute as-contract calls in plain begin expressions
;; after the let block closes.
;;
;; Structure:
;;   (let (... all reads ...)
;;     (... asserts ...)
;;     (let (... fold result ...)
;;       (... asserts ...)
;;       as-contract transfers here - still inside let, still a problem
;;     )
;;   )
;;
;; SOLUTION: use stx-transfer? pattern - compute everything needed
;; before entering as-contract, pass as direct arguments.
;; We use begin at the TOP of define-public, with let only for reads
;; that don't precede as-contract calls.
;; ------------------------------------------------------------
;; trigger-distribution
;; Uses match instead of let to avoid as-contract inside let body.
;; Clarity 3.11: as-contract only valid outside let bindings.
;; Pass 1 (fold): marks slots distributed, writes escrow records.
;; Pass 2 (explicit): as-contract transfers for immediate slots.
;; ------------------------------------------------------------
(define-public (trigger-distribution (vault-id uint))
  (match (map-get? vaults { vault-id: vault-id })
    vault
      (begin
        (asserts! (is-eq (compute-status vault-id) u3) ERR-NOT-DISTRIBUTING)
        (asserts! (get finalized vault)                ERR-VAULT-NOT-ACTIVE)

        ;; Lock to EXECUTING - prevents re-entry
        (map-set vaults { vault-id: vault-id } (merge vault { status: u3 }))

        ;; Pass 1: data pass - marks slots distributed, writes escrow records
        (asserts!
          (get ok (fold distribute-one
            (list u0 u1 u2 u3 u4 u5 u6 u7 u8 u9)
            { vault-id: vault-id, total: (get sbtc-amount vault), ok: true }
          ))
          ERR-TRANSFER-FAILED
        )

        ;; Pass 2: as-contract transfers for immediate-release slots.
        ;; share-of/addr-of/needs-transfer helpers read from map directly.
        ;; if-guard skips empty/timelocked/zero-share slots.
        (if (needs-transfer (get sbtc-amount vault) vault-id u0)
          (try! (as-contract (contract-call? SBTC-TOKEN transfer (share-of (get sbtc-amount vault) vault-id u0) tx-sender (addr-of vault-id u0) none)))
          true
        )
        (if (needs-transfer (get sbtc-amount vault) vault-id u1)
          (try! (as-contract (contract-call? SBTC-TOKEN transfer (share-of (get sbtc-amount vault) vault-id u1) tx-sender (addr-of vault-id u1) none)))
          true
        )
        (if (needs-transfer (get sbtc-amount vault) vault-id u2)
          (try! (as-contract (contract-call? SBTC-TOKEN transfer (share-of (get sbtc-amount vault) vault-id u2) tx-sender (addr-of vault-id u2) none)))
          true
        )
        (if (needs-transfer (get sbtc-amount vault) vault-id u3)
          (try! (as-contract (contract-call? SBTC-TOKEN transfer (share-of (get sbtc-amount vault) vault-id u3) tx-sender (addr-of vault-id u3) none)))
          true
        )
        (if (needs-transfer (get sbtc-amount vault) vault-id u4)
          (try! (as-contract (contract-call? SBTC-TOKEN transfer (share-of (get sbtc-amount vault) vault-id u4) tx-sender (addr-of vault-id u4) none)))
          true
        )
        (if (needs-transfer (get sbtc-amount vault) vault-id u5)
          (try! (as-contract (contract-call? SBTC-TOKEN transfer (share-of (get sbtc-amount vault) vault-id u5) tx-sender (addr-of vault-id u5) none)))
          true
        )
        (if (needs-transfer (get sbtc-amount vault) vault-id u6)
          (try! (as-contract (contract-call? SBTC-TOKEN transfer (share-of (get sbtc-amount vault) vault-id u6) tx-sender (addr-of vault-id u6) none)))
          true
        )
        (if (needs-transfer (get sbtc-amount vault) vault-id u7)
          (try! (as-contract (contract-call? SBTC-TOKEN transfer (share-of (get sbtc-amount vault) vault-id u7) tx-sender (addr-of vault-id u7) none)))
          true
        )
        (if (needs-transfer (get sbtc-amount vault) vault-id u8)
          (try! (as-contract (contract-call? SBTC-TOKEN transfer (share-of (get sbtc-amount vault) vault-id u8) tx-sender (addr-of vault-id u8) none)))
          true
        )
        (if (needs-transfer (get sbtc-amount vault) vault-id u9)
          (try! (as-contract (contract-call? SBTC-TOKEN transfer (share-of (get sbtc-amount vault) vault-id u9) tx-sender (addr-of vault-id u9) none)))
          true
        )

        ;; Mark COMPLETE
        (map-set vaults { vault-id: vault-id } (merge vault { status: u4 }))
        (var-set total-sbtc-protected
          (- (var-get total-sbtc-protected) (get sbtc-amount vault))
        )
        (ok true)
      )
    ERR-VAULT-NOT-FOUND
  )
)


;; ------------------------------------------------------------
;; claim-timelocked
;; Caller passes their own address as recipient parameter.
;; This avoids needing to capture tx-sender before as-contract
;; since tx-sender changes inside the as-contract context.
;; Validated on-chain: (is-eq recipient tx-sender) before transfer.
;; ------------------------------------------------------------
(define-public (claim-timelocked (vault-id uint) (recipient principal))
  (match (map-get? timelocked-escrow { vault-id: vault-id, beneficiary: tx-sender })
    escrow
      (begin
        (asserts! (is-eq recipient tx-sender)                 ERR-NOT-AUTHORIZED)
        (asserts! (not (get claimed escrow))                  ERR-ALREADY-DISTRIBUTED)
        (asserts! (>= block-height (get unlock-block escrow)) ERR-VAULT-NOT-ACTIVE)
        (try! (as-contract (contract-call? SBTC-TOKEN transfer
          (get amount escrow) tx-sender recipient none
        )))
        (map-set timelocked-escrow
          { vault-id: vault-id, beneficiary: recipient }
          (merge escrow { claimed: true })
        )
        (ok (get amount escrow))
      )
    ERR-VAULT-NOT-FOUND
  )
)


;; ------------------------------------------------------------
;; withdraw-vault
;; Caller passes their own address as recipient parameter.
;; Avoids as-contract inside let - same pattern as claim-timelocked.
;; Validated: (is-eq recipient tx-sender) ensures only owner can withdraw.
;; ------------------------------------------------------------
(define-public (withdraw-vault (vault-id uint) (recipient principal))
  (match (map-get? vaults { vault-id: vault-id })
    vault
      (begin
        (asserts! (is-eq tx-sender (get owner vault))  ERR-NOT-AUTHORIZED)
        (asserts! (is-eq recipient tx-sender)          ERR-NOT-AUTHORIZED)
        (asserts!
          (or
            (is-eq (compute-status vault-id) u0)
            (is-eq (compute-status vault-id) u1)
          )
          ERR-VAULT-NOT-ACTIVE
        )
        (try! (as-contract (contract-call? SBTC-TOKEN transfer
          (get sbtc-amount vault) tx-sender recipient none
        )))
        (map-set vaults { vault-id: vault-id } (merge vault { status: u4 }))
        (var-set total-sbtc-protected
          (- (var-get total-sbtc-protected) (get sbtc-amount vault))
        )
        (ok (get sbtc-amount vault))
      )
    ERR-VAULT-NOT-FOUND
  )
)


;; ============================================================
;; READ-ONLY FUNCTIONS
;; ============================================================

(define-read-only (get-vault (vault-id uint))
  (map-get? vaults { vault-id: vault-id })
)

(define-read-only (get-vault-status (vault-id uint))
  (compute-status vault-id)
)

(define-read-only (get-beneficiary (vault-id uint) (index uint))
  (map-get? beneficiaries { vault-id: vault-id, index: index })
)

(define-read-only (get-beneficiary-count (vault-id uint))
  (default-to { count: u0 } (map-get? beneficiary-count { vault-id: vault-id }))
)

(define-read-only (get-total-percentage (vault-id uint))
  (total-pct vault-id)
)

(define-read-only (get-blocks-until-deadline (vault-id uint))
  (let ((deadline (deadline-of vault-id)))
    (if (> deadline block-height) (some (- deadline block-height)) none)
  )
)

(define-read-only (get-timelocked-escrow (vault-id uint) (beneficiary principal))
  (map-get? timelocked-escrow { vault-id: vault-id, beneficiary: beneficiary })
)

(define-read-only (is-beneficiary (vault-id uint) (address principal))
  (or
    (match (map-get? beneficiaries { vault-id: vault-id, index: u0 }) b (is-eq (get address b) address) false)
    (match (map-get? beneficiaries { vault-id: vault-id, index: u1 }) b (is-eq (get address b) address) false)
    (match (map-get? beneficiaries { vault-id: vault-id, index: u2 }) b (is-eq (get address b) address) false)
    (match (map-get? beneficiaries { vault-id: vault-id, index: u3 }) b (is-eq (get address b) address) false)
    (match (map-get? beneficiaries { vault-id: vault-id, index: u4 }) b (is-eq (get address b) address) false)
    (match (map-get? beneficiaries { vault-id: vault-id, index: u5 }) b (is-eq (get address b) address) false)
    (match (map-get? beneficiaries { vault-id: vault-id, index: u6 }) b (is-eq (get address b) address) false)
    (match (map-get? beneficiaries { vault-id: vault-id, index: u7 }) b (is-eq (get address b) address) false)
    (match (map-get? beneficiaries { vault-id: vault-id, index: u8 }) b (is-eq (get address b) address) false)
    (match (map-get? beneficiaries { vault-id: vault-id, index: u9 }) b (is-eq (get address b) address) false)
  )
)

(define-read-only (get-vault-events (vault-id uint) (limit uint))
  (let ((events (list)))
    ;; This would need a more sophisticated implementation in production
    ;; For now, return empty list as placeholder
    events
  )
)

(define-read-only (get-contract-version)
  CONTRACT-VERSION
)

(define-read-only (get-protocol-stats)
  {
    total-vaults:         (var-get total-vaults),
    total-sbtc-protected: (var-get total-sbtc-protected),
    next-vault-id:        (var-get next-vault-id),
  }
)
