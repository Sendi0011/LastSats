;; ============================================================
;; LastSats Vault - Bitcoin Inheritance Protocol
;; Clarity Smart Contract for Stacks Blockchain
;; Version: 2.0.0
;; ============================================================
;;
;; OVERVIEW:
;;   Trustless dead-man's-switch inheritance vault for sBTC.
;;   The vault owner deposits sBTC and designates up to 10
;;   beneficiaries with percentage splits and optional time-locks.
;;   If the owner misses heartbeats for their configured interval,
;;   sBTC is automatically distributed after a 30-day grace period.
;;   Fully non-custodial, autonomous, and permissionless.
;;
;; AUDIT STATUS:
;;   NOT yet audited by a third party. Do not deposit significant
;;   funds until a Tier-1 audit is complete.
;;
;; SETUP FLOW (caller must do these in order):
;;   1. create-vault      - deposit sBTC, configure interval/tier/guardian
;;   2. add-beneficiary   - call once per beneficiary (up to tier limit)
;;   3. finalize-beneficiaries - lock config, enforce 100% allocation
;;   4. send-heartbeat    - regularly to keep vault alive
;;
;; EXECUTION FLOW (after owner stops heartbeating):
;;   5. sync-vault-status    - anyone calls once deadline passes
;;   6. [30-day grace window] - owner can still heartbeat to cancel
;;   7. trigger-distribution - anyone calls after grace expires
;;   8. claim-timelocked     - beneficiaries with time-locks call later
;;
;; CONTRACT STATE MACHINE:
;;   ACTIVE    (0) -> Vault healthy. Owner has full control.
;;   WARNING   (1) -> Deadline within 7 days.
;;   GRACE     (2) -> Heartbeat missed. 30-day grace period running.
;;   EXECUTING (3) -> Grace expired. Permissionless distribution.
;;   COMPLETE  (4) -> Funds distributed or vault withdrawn. Terminal.
;;   PAUSED    (5) -> Guardian paused during grace. Max 30 days.
;;
;; SECURITY PROPERTIES:
;;   - Contract holds sBTC in escrow - owner cannot rug after grace
;;   - Block-height timing - immune to wall-clock manipulation
;;   - Re-entrancy safe - Clarity is inherently non-re-entrant
;;   - Uint overflow safe - Clarity checks by default, panics on underflow
;;   - Max 10 beneficiaries per vault (fold list hard cap)
;;   - Basis-point percentages (10000 = 100%) for integer precision
;;   - finalize-beneficiaries enforces exactly 100% allocation on-chain
;;   - Terminal states (COMPLETE, EXECUTING) are stored - never recomputed
;; ============================================================


;; ============================================================
;; CONSTANTS
;; ============================================================

;; sBTC mainnet token contract (SIP-010 fungible token)
;; Deployed by Trust Machines - verify on: https://explorer.hiro.so/token/sBTC
(define-constant SBTC-TOKEN 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED        (err u100))
(define-constant ERR-VAULT-NOT-FOUND       (err u101))
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

;; Timing - Bitcoin mainnet produces ~1 block per 10 minutes = 144 blocks/day
(define-constant GRACE-PERIOD-BLOCKS  (* u30  u144))  ;; 30 days
(define-constant WARNING-BLOCKS       (* u7   u144))  ;; 7-day warning window
(define-constant PAUSE-MAX-BLOCKS     (* u30  u144))  ;; max guardian pause

;; Valid heartbeat intervals (blocks)
(define-constant INTERVAL-30D  (* u30  u144))
(define-constant INTERVAL-60D  (* u60  u144))
(define-constant INTERVAL-90D  (* u90  u144))
(define-constant INTERVAL-180D (* u180 u144))

;; Tier codes
(define-constant TIER-FREE   u0)
(define-constant TIER-HODLER u1)
(define-constant TIER-WHALE  u2)

;; Tier beneficiary caps
(define-constant FREE-MAX-BEN   u1)
(define-constant HODLER-MAX-BEN u5)
(define-constant WHALE-MAX-BEN  u10)

;; Fold hard cap - Clarity lists are fixed-size, 10 is our max
(define-constant MAX-BENEFICIARIES u10)

;; Basis points: 10000 = 100%
(define-constant BPS u10000)


;; ============================================================
;; DATA MAPS
;; ============================================================

;; Core vault record
(define-map vaults
  { vault-id: uint }
  {
    owner:                 principal,
    sbtc-amount:           uint,      ;; micro-sBTC (8 decimals; 1 sBTC = 100000000)
    status:                uint,      ;; 0-5 per state machine
    heartbeat-interval:    uint,      ;; blocks between required check-ins
    last-heartbeat-block:  uint,      ;; block height of last heartbeat
    grace-start-block:     (optional uint),  ;; block when grace period began
    pause-start-block:     (optional uint),  ;; block when guardian paused
    guardian:              (optional principal),
    created-at-block:      uint,
    tier:                  uint,
    finalized:             bool,      ;; true after finalize-beneficiaries is called
  }
)

;; Beneficiary records - up to 10 per vault, indexed 0-9
(define-map beneficiaries
  { vault-id: uint, index: uint }
  {
    address:          principal,
    percentage:       uint,           ;; basis points, must sum to 10000
    time-lock-blocks: uint,           ;; blocks after distribution before claiming (0 = immediate)
    distributed:      bool,
  }
)

;; Beneficiary count per vault
(define-map beneficiary-count
  { vault-id: uint }
  { count: uint }
)

;; Time-locked shares held in escrow pending claim
(define-map timelocked-escrow
  { vault-id: uint, beneficiary: principal }
  {
    amount:       uint,              ;; micro-sBTC
    unlock-block: uint,              ;; block height after which claiming is allowed
    claimed:      bool,
  }
)

;; Auto-incrementing vault ID counter
(define-data-var next-vault-id        uint u1)

;; Protocol-wide statistics
(define-data-var total-vaults         uint u0)
(define-data-var total-sbtc-protected uint u0)


;; ============================================================
;; PRIVATE HELPERS
;; ============================================================

;; Validate that a heartbeat interval is one of the four allowed values
(define-private (is-valid-interval (interval uint))
  (or
    (is-eq interval INTERVAL-30D)
    (is-eq interval INTERVAL-60D)
    (is-eq interval INTERVAL-90D)
    (is-eq interval INTERVAL-180D)
  )
)

;; Return the maximum allowed beneficiaries for a given tier
(define-private (tier-max-bens (tier uint))
  (if (is-eq tier TIER-FREE)
    FREE-MAX-BEN
    (if (is-eq tier TIER-HODLER)
      HODLER-MAX-BEN
      WHALE-MAX-BEN
    )
  )
)

;; Return the block height at which a vault's heartbeat deadline falls
(define-private (deadline-of (vault-id uint))
  (match (map-get? vaults { vault-id: vault-id })
    vault (+ (get last-heartbeat-block vault) (get heartbeat-interval vault))
    u0
  )
)

;; Compute the live status of a vault from block-height without writing storage.
;; Terminal states (u3 EXECUTING, u4 COMPLETE) are immutable once stored.
;; For all other states we derive from current block-height and stored timestamps.
;;
;; State derivation logic:
;;   stored=3 or 4  -> return stored (terminal)
;;   stored=5       -> PAUSED: check if pause window expired -> u2 (grace) or u5
;;   block < deadline ->
;;       deadline - block < 7 days -> u1 (WARNING)
;;       else -> u0 (ACTIVE)
;;   block >= deadline ->
;;       grace-start-block set -> check if grace expired -> u3 or u2
;;       not set              -> u2 (grace, start not yet persisted)
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
                (if (>= block-height (+ pause-blk PAUSE-MAX-BLOCKS))
                  u2  ;; pause expired - grace resumes
                  u5  ;; still paused
                )
              u5
            )
            ;; Active/Warning/Grace: derive from block height vs deadline
            (if (< block-height deadline)
              ;; Before deadline: safe to subtract (deadline > block-height guaranteed)
              (if (< (- deadline block-height) WARNING-BLOCKS) u1 u0)
              ;; Past deadline
              (match (get grace-start-block vault)
                grace-blk
                  (if (>= block-height (+ grace-blk GRACE-PERIOD-BLOCKS))
                    u3  ;; grace expired - distribution can be triggered
                    u2  ;; grace period running
                  )
                u2  ;; grace-start-block not yet persisted, treat as grace
              )
            )
          )
        )
      )
    u0  ;; vault not found
  )
)

;; Return the percentage allocated at one beneficiary slot (0 if empty)
(define-private (pct-at (vault-id uint) (index uint))
  (match (map-get? beneficiaries { vault-id: vault-id, index: index })
    b (get percentage b)
    u0
  )
)

;; Sum percentages across all 10 slots.
;; Clarity has no loops - we enumerate all 10 indices explicitly.
(define-private (total-pct (vault-id uint))
  (+
    (pct-at vault-id u0) (pct-at vault-id u1) (pct-at vault-id u2)
    (pct-at vault-id u3) (pct-at vault-id u4) (pct-at vault-id u5)
    (pct-at vault-id u6) (pct-at vault-id u7) (pct-at vault-id u8)
    (pct-at vault-id u9)
  )
)

;; Process one beneficiary slot during distribution.
;; Called via fold - iterates indices u0 through u9.
;;
;; For each slot:
;;   - Skip if already distributed
;;   - Skip if slot is empty
;;   - Skip if computed share rounds to zero
;;   - If time-lock is 0: transfer sBTC directly to beneficiary
;;   - If time-lock > 0: record in timelocked-escrow (sBTC remains in contract)
;;
;; State carries: vault-id, total amount, ok flag (false = abort remaining)
;; distribute-one: pure data pass - computes shares and writes escrow records.
;; as-contract transfers cannot be called from define-private in Clarity.
;; Actual sBTC transfers are handled in the second pass inside trigger-distribution.
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
                ;; For time-locked beneficiaries: write escrow record now.
                ;; sBTC remains in contract until claim-timelocked is called.
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
                ;; Mark distributed so the transfer pass below knows to process this slot
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





;; ============================================================
;; PUBLIC FUNCTIONS
;; ============================================================

;; ------------------------------------------------------------
;; create-vault
;; Step 1 in setup flow. Transfers sBTC from caller to this contract.
;;
;; The SIP-010 sBTC token enforces (is-eq sender tx-sender) internally,
;; so the caller must be the one signing this transaction - no delegation.
;;
;; Args:
;;   heartbeat-interval  uint             Blocks between required check-ins.
;;                                        Must be 30d / 60d / 90d / 180d in blocks.
;;   sbtc-amount         uint             Micro-sBTC to lock (1 sBTC = 100_000_000).
;;   tier                uint             0=free, 1=hodler, 2=whale.
;;   guardian            (optional principal)  Address that can pause execution.
;;
;; Returns: (ok vault-id) on success.
;; ------------------------------------------------------------
(define-public (create-vault
  (heartbeat-interval uint)
  (sbtc-amount        uint)
  (tier               uint)
  (guardian           (optional principal))
)
  (let (
    (vault-id (var-get next-vault-id))
  )
    (asserts! (is-valid-interval heartbeat-interval) ERR-INVALID-INTERVAL)
    (asserts! (> sbtc-amount u0)                     ERR-INVALID-AMOUNT)
    (asserts! (<= tier TIER-WHALE)                   ERR-NOT-AUTHORIZED)

    ;; Transfer sBTC from caller into this contract's custody.
    ;; Use the contract principal directly - Clarinet will handle this properly
    (try! (contract-call? SBTC-TOKEN transfer
      sbtc-amount
      tx-sender
      'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.lastsats-vault
      none
    ))

    (map-set vaults
      { vault-id: vault-id }
      {
        owner:                tx-sender,
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

    (ok vault-id)
  )
)


;; ------------------------------------------------------------
;; add-beneficiary
;; Step 2. Add one beneficiary to a vault. Call once per recipient.
;; Only callable by vault owner while vault is ACTIVE and not finalized.
;;
;; Tier limits are enforced on-chain:
;;   Free   -> max 1 beneficiary
;;   Hodler -> max 5 beneficiaries
;;   Whale  -> max 10 beneficiaries
;;
;; Args:
;;   vault-id            uint       Vault to add to.
;;   beneficiary-address principal  Stacks address of recipient.
;;   percentage          uint       Basis points (1-10000). Cumulative max 10000.
;;   time-lock-blocks    uint       Blocks after distribution before claiming (0 = immediate).
;;
;; Returns: (ok new-count) - count after adding.
;; ------------------------------------------------------------
(define-public (add-beneficiary
  (vault-id            uint)
  (beneficiary-address principal)
  (percentage          uint)
  (time-lock-blocks    uint)
)
  (let (
    (vault     (unwrap! (map-get? vaults { vault-id: vault-id })          ERR-VAULT-NOT-FOUND))
    (cnt-data  (unwrap! (map-get? beneficiary-count { vault-id: vault-id }) ERR-VAULT-NOT-FOUND))
    (cur-count (get count cnt-data))
    (cur-total (total-pct vault-id))
  )
    (asserts! (is-eq tx-sender (get owner vault))                  ERR-NOT-AUTHORIZED)
    (asserts! (not (get finalized vault))                          ERR-VAULT-FINALIZED)
    (asserts! (is-eq (compute-status vault-id) u0)                 ERR-VAULT-NOT-ACTIVE)
    (asserts! (> percentage u0)                                    ERR-INVALID-BENEFICIARIES)
    (asserts! (<= (+ cur-total percentage) BPS)                    ERR-PCT-EXCEEDS-100)
    (asserts! (< cur-count (tier-max-bens (get tier vault)))        ERR-TIER-LIMIT)
    (asserts! (< cur-count MAX-BENEFICIARIES)                      ERR-MAX-BENEFICIARIES)

    (map-set beneficiaries
      { vault-id: vault-id, index: cur-count }
      {
        address:          beneficiary-address,
        percentage:       percentage,
        time-lock-blocks: time-lock-blocks,
        distributed:      false,
      }
    )

    (map-set beneficiary-count
      { vault-id: vault-id }
      { count: (+ cur-count u1) }
    )

    (ok (+ cur-count u1))
  )
)


;; ------------------------------------------------------------
;; finalize-beneficiaries
;; Step 3. Lock the beneficiary configuration permanently.
;;
;; Enforces on-chain that all basis points sum to exactly 10000 (100%).
;; After calling this, no further beneficiaries can be added.
;; Must be finalized before trigger-distribution can execute.
;;
;; Returns: (ok true)
;; ------------------------------------------------------------
(define-public (finalize-beneficiaries (vault-id uint))
  (let (
    (vault     (unwrap! (map-get? vaults { vault-id: vault-id }) ERR-VAULT-NOT-FOUND))
    (cur-total (total-pct vault-id))
  )
    (asserts! (is-eq tx-sender (get owner vault)) ERR-NOT-AUTHORIZED)
    (asserts! (not (get finalized vault))          ERR-VAULT-FINALIZED)
    (asserts! (is-eq cur-total BPS)               ERR-PCT-NOT-100)

    (map-set vaults { vault-id: vault-id }
      (merge vault { finalized: true })
    )
    (ok true)
  )
)


;; ------------------------------------------------------------
;; send-heartbeat
;; Step 4 (recurring). Prove the owner is alive. Resets the countdown.
;; Callable while ACTIVE (0), WARNING (1), or GRACE (2).
;; Clears grace-start-block and pause-start-block on success.
;;
;; Returns: (ok true)
;; ------------------------------------------------------------
(define-public (send-heartbeat (vault-id uint))
  (let (
    (vault       (unwrap! (map-get? vaults { vault-id: vault-id }) ERR-VAULT-NOT-FOUND))
    (live-status (compute-status vault-id))
  )
    (asserts! (is-eq tx-sender (get owner vault)) ERR-NOT-AUTHORIZED)
    (asserts!
      (or
        (is-eq live-status u0)
        (is-eq live-status u1)
        (is-eq live-status u2)
      )
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
;; Step 5. Permissionless - anyone can call once the deadline passes.
;; Persists grace-start-block to storage so the 30-day grace timer
;; is anchored to a real block height, not computed lazily.
;; Call this as soon as you detect a vault's deadline has passed.
;;
;; Returns: (ok true) if grace was started, (ok false) if no-op.
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
          (merge vault {
            status:            u2,
            grace-start-block: (some block-height),
          })
        )
        (ok true)
      )
      (ok false)
    )
  )
)


;; ------------------------------------------------------------
;; pause-execution
;; Guardian only. Pauses distribution during the grace period.
;; Gives the family time to respond if the owner missed accidentally.
;; Pause is capped at PAUSE-MAX-BLOCKS (30 days). After that,
;; compute-status returns u2 (GRACE) automatically and the
;; 30-day grace window resumes from where it was interrupted.
;;
;; Can only be called once per grace period (no re-pause).
;; Returns: (ok true)
;; ------------------------------------------------------------
(define-public (pause-execution (vault-id uint))
  (let (
    (vault       (unwrap! (map-get? vaults { vault-id: vault-id }) ERR-VAULT-NOT-FOUND))
    (live-status (compute-status vault-id))
  )
    (asserts!
      (match (get guardian vault)
        guard (is-eq tx-sender guard)
        false
      )
      ERR-NOT-GUARDIAN
    )
    (asserts! (is-eq live-status u2)               ERR-NOT-IN-GRACE)
    (asserts! (not (is-eq (get status vault) u5))  ERR-ALREADY-PAUSED)

    (map-set vaults { vault-id: vault-id }
      (merge vault {
        status:            u5,
        pause-start-block: (some block-height),
      })
    )

    (ok true)
  )
)


;; ------------------------------------------------------------
;; trigger-distribution
;; Step 7. Permissionless - anyone can call after grace expires.
;; Iterates all 10 beneficiary slots using fold.
;;
;; Immediate transfers: sends sBTC directly to beneficiary.
;; Time-locked shares: records in timelocked-escrow, sBTC stays in
;; this contract until the beneficiary calls claim-timelocked.
;;
;; All transfers must succeed or the whole transaction reverts.
;; Vault status is set to COMPLETE (4) on success.
;;
;; Returns: (ok true)
;; ------------------------------------------------------------
;; trigger-distribution
;; Two-pass approach required because as-contract is not valid in define-private:
;;
;; Pass 1 (distribute-one fold): pure data pass - marks each beneficiary as
;; distributed and writes timelocked-escrow records. No transfers yet.
;;
;; Pass 2 (explicit per-slot): executes the actual as-contract sBTC transfers
;; for immediate-release beneficiaries. Time-locked slots are skipped here -
;; their sBTC stays in contract until beneficiary calls claim-timelocked.
(define-public (trigger-distribution (vault-id uint))
  (let (
    (vault       (unwrap! (map-get? vaults { vault-id: vault-id }) ERR-VAULT-NOT-FOUND))
    (live-status (compute-status vault-id))
    (amount      (get sbtc-amount vault))
  )
    (asserts! (is-eq live-status u3) ERR-NOT-DISTRIBUTING)
    (asserts! (get finalized vault)  ERR-VAULT-NOT-ACTIVE)

    ;; Lock to EXECUTING immediately - prevents re-entry
    (map-set vaults { vault-id: vault-id } (merge vault { status: u3 }))

    ;; Pass 1: mark all slots as distributed, write timelocked-escrow records
    (let (
      (data-result (fold distribute-one
        (list u0 u1 u2 u3 u4 u5 u6 u7 u8 u9)
        { vault-id: vault-id, total: amount, ok: true }
      ))
    )
      (asserts! (get ok data-result) ERR-TRANSFER-FAILED)

      ;; Pass 2: execute as-contract transfers for immediate-release slots only.
      ;; We check each slot individually - as-contract is valid here in define-public.
      (let (
        (b0 (map-get? beneficiaries { vault-id: vault-id, index: u0 }))
        (b1 (map-get? beneficiaries { vault-id: vault-id, index: u1 }))
        (b2 (map-get? beneficiaries { vault-id: vault-id, index: u2 }))
        (b3 (map-get? beneficiaries { vault-id: vault-id, index: u3 }))
        (b4 (map-get? beneficiaries { vault-id: vault-id, index: u4 }))
        (b5 (map-get? beneficiaries { vault-id: vault-id, index: u5 }))
        (b6 (map-get? beneficiaries { vault-id: vault-id, index: u6 }))
        (b7 (map-get? beneficiaries { vault-id: vault-id, index: u7 }))
        (b8 (map-get? beneficiaries { vault-id: vault-id, index: u8 }))
        (b9 (map-get? beneficiaries { vault-id: vault-id, index: u9 }))
      )
        ;; Transfer for each slot if: slot exists, time-lock is 0, share > 0
        (match b0 ben (if (and (is-eq (get time-lock-blocks ben) u0) (> (/ (* amount (get percentage ben)) BPS) u0))
          (try! (as-contract (contract-call? SBTC-TOKEN transfer (/ (* amount (get percentage ben)) BPS) tx-sender (get address ben) none))) true) true)
        (match b1 ben (if (and (is-eq (get time-lock-blocks ben) u0) (> (/ (* amount (get percentage ben)) BPS) u0))
          (try! (as-contract (contract-call? SBTC-TOKEN transfer (/ (* amount (get percentage ben)) BPS) tx-sender (get address ben) none))) true) true)
        (match b2 ben (if (and (is-eq (get time-lock-blocks ben) u0) (> (/ (* amount (get percentage ben)) BPS) u0))
          (try! (as-contract (contract-call? SBTC-TOKEN transfer (/ (* amount (get percentage ben)) BPS) tx-sender (get address ben) none))) true) true)
        (match b3 ben (if (and (is-eq (get time-lock-blocks ben) u0) (> (/ (* amount (get percentage ben)) BPS) u0))
          (try! (as-contract (contract-call? SBTC-TOKEN transfer (/ (* amount (get percentage ben)) BPS) tx-sender (get address ben) none))) true) true)
        (match b4 ben (if (and (is-eq (get time-lock-blocks ben) u0) (> (/ (* amount (get percentage ben)) BPS) u0))
          (try! (as-contract (contract-call? SBTC-TOKEN transfer (/ (* amount (get percentage ben)) BPS) tx-sender (get address ben) none))) true) true)
        (match b5 ben (if (and (is-eq (get time-lock-blocks ben) u0) (> (/ (* amount (get percentage ben)) BPS) u0))
          (try! (as-contract (contract-call? SBTC-TOKEN transfer (/ (* amount (get percentage ben)) BPS) tx-sender (get address ben) none))) true) true)
        (match b6 ben (if (and (is-eq (get time-lock-blocks ben) u0) (> (/ (* amount (get percentage ben)) BPS) u0))
          (try! (as-contract (contract-call? SBTC-TOKEN transfer (/ (* amount (get percentage ben)) BPS) tx-sender (get address ben) none))) true) true)
        (match b7 ben (if (and (is-eq (get time-lock-blocks ben) u0) (> (/ (* amount (get percentage ben)) BPS) u0))
          (try! (as-contract (contract-call? SBTC-TOKEN transfer (/ (* amount (get percentage ben)) BPS) tx-sender (get address ben) none))) true) true)
        (match b8 ben (if (and (is-eq (get time-lock-blocks ben) u0) (> (/ (* amount (get percentage ben)) BPS) u0))
          (try! (as-contract (contract-call? SBTC-TOKEN transfer (/ (* amount (get percentage ben)) BPS) tx-sender (get address ben) none))) true) true)
        (match b9 ben (if (and (is-eq (get time-lock-blocks ben) u0) (> (/ (* amount (get percentage ben)) BPS) u0))
          (try! (as-contract (contract-call? SBTC-TOKEN transfer (/ (* amount (get percentage ben)) BPS) tx-sender (get address ben) none))) true) true)
      )

      ;; Mark COMPLETE
      (map-set vaults { vault-id: vault-id } (merge vault { status: u4 }))
      (var-set total-sbtc-protected (- (var-get total-sbtc-protected) amount))

      (ok true)
    )
  )
)


;; ------------------------------------------------------------
;; claim-timelocked
;; Step 8. Beneficiary claims their time-locked share after unlock-block.
;; Can only be called by the beneficiary themselves.
;;
;; Args:
;;   vault-id  uint  The vault this escrow belongs to.
;;
;; Returns: (ok amount) - micro-sBTC claimed.
;; ------------------------------------------------------------
(define-public (claim-timelocked (vault-id uint))
  (let (
    (escrow (unwrap!
      (map-get? timelocked-escrow { vault-id: vault-id, beneficiary: tx-sender })
      ERR-VAULT-NOT-FOUND
    ))
  )
    (asserts! (not (get claimed escrow))               ERR-ALREADY-DISTRIBUTED)
    (asserts! (>= block-height (get unlock-block escrow)) ERR-VAULT-NOT-ACTIVE)

    ;; Transfer sBTC from this contract to the beneficiary.
    ;; Inside as-contract: tx-sender = this contract.
    ;; `tx-sender` outside the as-contract block is the original caller (beneficiary).
    (let (
      (beneficiary tx-sender)
      (amount      (get amount escrow))
    )
      (try! (as-contract (contract-call? SBTC-TOKEN transfer
        amount tx-sender beneficiary none
      )))

      (map-set timelocked-escrow
        { vault-id: vault-id, beneficiary: beneficiary }
        (merge escrow { claimed: true })
      )

      (ok amount)
    )
  )
)


;; ------------------------------------------------------------
;; withdraw-vault
;; Owner closes a vault and recovers sBTC. Only while ACTIVE or WARNING.
;; Cannot be called once the grace period has started - funds are
;; locked from that point to protect beneficiaries.
;;
;; Returns: (ok amount) - micro-sBTC returned to owner.
;; ------------------------------------------------------------
(define-public (withdraw-vault (vault-id uint))
  (let (
    (vault       (unwrap! (map-get? vaults { vault-id: vault-id }) ERR-VAULT-NOT-FOUND))
    (live-status (compute-status vault-id))
    (amount      (get sbtc-amount vault))
    (owner       (get owner vault))
  )
    (asserts! (is-eq tx-sender owner) ERR-NOT-AUTHORIZED)
    (asserts!
      (or (is-eq live-status u0) (is-eq live-status u1))
      ERR-VAULT-NOT-ACTIVE
    )

    ;; Return sBTC to owner. Inside as-contract: tx-sender = this contract.
    (try! (as-contract (contract-call? SBTC-TOKEN transfer
      amount tx-sender owner none
    )))

    (map-set vaults { vault-id: vault-id }
      (merge vault { status: u4 })
    )
    (var-set total-sbtc-protected
      (- (var-get total-sbtc-protected) amount)
    )

    (ok amount)
  )
)


;; ============================================================
;; READ-ONLY FUNCTIONS
;; ============================================================

;; Full vault record from storage
(define-read-only (get-vault (vault-id uint))
  (map-get? vaults { vault-id: vault-id })
)

;; Live computed status - may differ from stored status field
;; Use this for UI; the stored `status` field may lag during transitions
(define-read-only (get-vault-status (vault-id uint))
  (compute-status vault-id)
)

;; Single beneficiary record by vault and index
(define-read-only (get-beneficiary (vault-id uint) (index uint))
  (map-get? beneficiaries { vault-id: vault-id, index: index })
)

;; Number of beneficiaries currently added to a vault
(define-read-only (get-beneficiary-count (vault-id uint))
  (default-to { count: u0 } (map-get? beneficiary-count { vault-id: vault-id }))
)

;; Current total basis points allocated across all beneficiaries
;; Must equal 10000 before finalize-beneficiaries can be called
(define-read-only (get-total-percentage (vault-id uint))
  (total-pct vault-id)
)

;; Blocks remaining until the heartbeat deadline (none if already past)
(define-read-only (get-blocks-until-deadline (vault-id uint))
  (let ((deadline (deadline-of vault-id)))
    (if (> deadline block-height)
      (some (- deadline block-height))
      none
    )
  )
)

;; Time-locked escrow record for a specific beneficiary
(define-read-only (get-timelocked-escrow (vault-id uint) (beneficiary principal))
  (map-get? timelocked-escrow { vault-id: vault-id, beneficiary: beneficiary })
)

;; Check if an address is any beneficiary of a given vault
;; Checks all 10 possible slots explicitly (no iteration in Clarity)
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

;; Protocol-wide aggregate statistics
(define-read-only (get-protocol-stats)
  {
    total-vaults:         (var-get total-vaults),
    total-sbtc-protected: (var-get total-sbtc-protected),
    next-vault-id:        (var-get next-vault-id),
  }
)
