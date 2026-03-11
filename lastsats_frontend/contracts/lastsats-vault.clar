;; ============================================================
;; LastSats Vault — Bitcoin Inheritance Protocol
;; Clarity Smart Contract for Stacks Blockchain
;; Version: 1.0.0
;; ============================================================
;;
;; OVERVIEW:
;;   This contract implements a trustless dead-man's-switch vault.
;;   The vault owner deposits sBTC and designates beneficiaries.
;;   If the owner fails to send a heartbeat within the configured
;;   interval, funds are automatically distributed after a grace
;;   period. The contract is non-custodial and fully autonomous.
;;
;; CONTRACT STATE MACHINE:
;;   ACTIVE (0)    → Vault is healthy. Owner has full control.
;;   WARNING (1)   → Deadline within 7 days. Reminders sent.
;;   GRACE (2)     → Deadline passed. 30-day grace period active.
;;   EXECUTING (3) → Grace period expired. Distributing funds.
;;   COMPLETE (4)  → All funds distributed. Vault closed.
;;   PAUSED (5)    → Guardian paused execution. 30-day hold.
;; ============================================================

;; ---- CONSTANTS ----

(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-VAULT-NOT-FOUND (err u101))
(define-constant ERR-VAULT-ALREADY-EXISTS (err u102))
(define-constant ERR-INVALID-AMOUNT (err u103))
(define-constant ERR-INVALID-INTERVAL (err u104))
(define-constant ERR-INVALID-BENEFICIARIES (err u105))
(define-constant ERR-VAULT-NOT-ACTIVE (err u106))
(define-constant ERR-HEARTBEAT-TOO-EARLY (err u107))
(define-constant ERR-GRACE-PERIOD-ACTIVE (err u108))
(define-constant ERR-NOT-IN-GRACE (err u109))
(define-constant ERR-NOT-GUARDIAN (err u110))
(define-constant ERR-ALREADY-PAUSED (err u111))
(define-constant ERR-TRANSFER-FAILED (err u112))
(define-constant ERR-INSUFFICIENT-BALANCE (err u113))

;; Timing constants (in blocks; ~10 min per block on Bitcoin)
(define-constant BLOCKS-PER-DAY u144)
(define-constant GRACE-PERIOD-BLOCKS (* u30 u144))       ;; 30 days
(define-constant WARNING-THRESHOLD-BLOCKS (* u7 u144))   ;; 7 days
(define-constant PAUSE-DURATION-BLOCKS (* u30 u144))     ;; 30 days pause max

;; Valid heartbeat intervals (in blocks)
(define-constant INTERVAL-30D (* u30 u144))
(define-constant INTERVAL-60D (* u60 u144))
(define-constant INTERVAL-90D (* u90 u144))
(define-constant INTERVAL-180D (* u180 u144))

;; ---- DATA MAPS ----

;; Core vault data
(define-map vaults
  { vault-id: uint }
  {
    owner: principal,
    sbtc-amount: uint,          ;; in micro-sBTC (8 decimal places)
    status: uint,               ;; 0=active 1=warning 2=grace 3=executing 4=complete 5=paused
    heartbeat-interval: uint,   ;; in blocks
    last-heartbeat-block: uint,
    grace-start-block: (optional uint),
    pause-start-block: (optional uint),
    guardian: (optional principal),
    created-at-block: uint,
    tier: uint,                 ;; 0=free 1=hodler 2=whale
  }
)

;; Beneficiary data (stored separately for gas efficiency)
(define-map beneficiaries
  { vault-id: uint, index: uint }
  {
    address: principal,
    percentage: uint,           ;; out of 10000 (basis points) for precision
    time-lock-blocks: uint,     ;; 0 = immediate release
    distributed: bool,
  }
)

;; Number of beneficiaries per vault
(define-map beneficiary-count
  { vault-id: uint }
  { count: uint }
)

;; Vault ID counter
(define-data-var next-vault-id uint u1)

;; Protocol stats
(define-data-var total-vaults uint u0)
(define-data-var total-sbtc-protected uint u0)

;; ---- PRIVATE HELPERS ----

;; Check if heartbeat interval is valid
(define-private (is-valid-interval (interval uint))
  (or
    (is-eq interval INTERVAL-30D)
    (is-eq interval INTERVAL-60D)
    (is-eq interval INTERVAL-90D)
    (is-eq interval INTERVAL-180D)
  )
)

;; Get the next deadline block for a vault
(define-private (get-deadline (vault-id uint))
  (match (map-get? vaults { vault-id: vault-id })
    vault (+ (get last-heartbeat-block vault) (get heartbeat-interval vault))
    u0
  )
)

;; Compute current vault status based on block height
(define-private (compute-status (vault-id uint))
  (match (map-get? vaults { vault-id: vault-id })
    vault
      (let (
        (current-block block-height)
        (deadline (+ (get last-heartbeat-block vault) (get heartbeat-interval vault)))
        (current-status (get status vault))
      )
        (if (or (is-eq current-status u4) (is-eq current-status u3))
          current-status  ;; complete or executing — immutable
          (if (is-eq current-status u5)
            ;; check if pause expired
            (match (get pause-start-block vault)
              pause-block
                (if (>= current-block (+ pause-block PAUSE-DURATION-BLOCKS))
                  u2  ;; back to grace after pause expires
                  u5  ;; still paused
                )
              u5  ;; still paused (no pause block set, shouldn't happen)
            )
            ;; Normal active/warning/grace transitions
            (if (< current-block deadline)
              ;; Before deadline
              (if (< (- deadline current-block) WARNING-THRESHOLD-BLOCKS)
                u1  ;; warning
                u0  ;; active
              )
              ;; Past deadline
              (match (get grace-start-block vault)
                grace-block
                  (if (>= current-block (+ grace-block GRACE-PERIOD-BLOCKS))
                    u3  ;; executing
                    u2  ;; grace
                  )
                u2  ;; grace started now
              )
            )
          )
        )
      )
    u0
  )
)

;; ---- PUBLIC FUNCTIONS ----

;; Create a new vault
(define-public (create-vault
  (heartbeat-interval uint)
  (sbtc-amount uint)
  (tier uint)
  (guardian (optional principal))
)
  (let (
    (vault-id (var-get next-vault-id))
    (caller tx-sender)
  )
    ;; Validations
    (asserts! (is-valid-interval heartbeat-interval) ERR-INVALID-INTERVAL)
    (asserts! (> sbtc-amount u0) ERR-INVALID-AMOUNT)

    ;; Transfer sBTC from caller to this contract
    ;; NOTE: In production, use the actual sBTC token contract
    ;; (try! (contract-call? .sbtc-token transfer sbtc-amount caller (as-contract tx-sender) none))

    ;; Store vault
    (map-set vaults
      { vault-id: vault-id }
      {
        owner: caller,
        sbtc-amount: sbtc-amount,
        status: u0,
        heartbeat-interval: heartbeat-interval,
        last-heartbeat-block: block-height,
        grace-start-block: none,
        pause-start-block: none,
        guardian: guardian,
        created-at-block: block-height,
        tier: tier,
      }
    )

    ;; Init beneficiary count
    (map-set beneficiary-count { vault-id: vault-id } { count: u0 })

    ;; Update counters
    (var-set next-vault-id (+ vault-id u1))
    (var-set total-vaults (+ (var-get total-vaults) u1))
    (var-set total-sbtc-protected (+ (var-get total-sbtc-protected) sbtc-amount))

    (ok vault-id)
  )
)

;; Add a beneficiary to a vault
(define-public (add-beneficiary
  (vault-id uint)
  (beneficiary-address principal)
  (percentage uint)           ;; basis points out of 10000
  (time-lock-blocks uint)
)
  (let (
    (caller tx-sender)
    (count-data (unwrap! (map-get? beneficiary-count { vault-id: vault-id }) ERR-VAULT-NOT-FOUND))
    (current-count (get count count-data))
    (vault (unwrap! (map-get? vaults { vault-id: vault-id }) ERR-VAULT-NOT-FOUND))
  )
    ;; Only owner can add beneficiaries while vault is active
    (asserts! (is-eq caller (get owner vault)) ERR-NOT-AUTHORIZED)
    (asserts! (is-eq (get status vault) u0) ERR-VAULT-NOT-ACTIVE)
    (asserts! (> percentage u0) ERR-INVALID-BENEFICIARIES)
    (asserts! (<= percentage u10000) ERR-INVALID-BENEFICIARIES)

    (map-set beneficiaries
      { vault-id: vault-id, index: current-count }
      {
        address: beneficiary-address,
        percentage: percentage,
        time-lock-blocks: time-lock-blocks,
        distributed: false,
      }
    )

    (map-set beneficiary-count
      { vault-id: vault-id }
      { count: (+ current-count u1) }
    )

    (ok true)
  )
)

;; Send a heartbeat (prove you're alive)
(define-public (send-heartbeat (vault-id uint))
  (let (
    (caller tx-sender)
    (vault (unwrap! (map-get? vaults { vault-id: vault-id }) ERR-VAULT-NOT-FOUND))
    (current-status (compute-status vault-id))
  )
    ;; Only owner can send heartbeat
    (asserts! (is-eq caller (get owner vault)) ERR-NOT-AUTHORIZED)
    ;; Can only heartbeat if active, warning, or grace — not executing or complete
    (asserts! (or
      (is-eq current-status u0)
      (is-eq current-status u1)
      (is-eq current-status u2)
    ) ERR-VAULT-NOT-ACTIVE)

    ;; Reset heartbeat and clear grace
    (map-set vaults
      { vault-id: vault-id }
      (merge vault {
        last-heartbeat-block: block-height,
        status: u0,
        grace-start-block: none,
        pause-start-block: none,
      })
    )

    (ok true)
  )
)

;; Guardian pauses execution during grace period
(define-public (pause-execution (vault-id uint))
  (let (
    (caller tx-sender)
    (vault (unwrap! (map-get? vaults { vault-id: vault-id }) ERR-VAULT-NOT-FOUND))
    (current-status (compute-status vault-id))
  )
    ;; Must be the guardian
    (asserts!
      (match (get guardian vault)
        guard (is-eq caller guard)
        false
      )
      ERR-NOT-GUARDIAN
    )
    ;; Must be in grace period
    (asserts! (is-eq current-status u2) ERR-NOT-IN-GRACE)

    (map-set vaults
      { vault-id: vault-id }
      (merge vault {
        status: u5,
        pause-start-block: (some block-height),
      })
    )

    (ok true)
  )
)

;; Trigger distribution (can be called by anyone after grace period)
(define-public (trigger-distribution (vault-id uint))
  (let (
    (vault (unwrap! (map-get? vaults { vault-id: vault-id }) ERR-VAULT-NOT-FOUND))
    (current-status (compute-status vault-id))
    (count-data (unwrap! (map-get? beneficiary-count { vault-id: vault-id }) ERR-VAULT-NOT-FOUND))
  )
    ;; Must be in executing state
    (asserts! (is-eq current-status u3) ERR-VAULT-NOT-ACTIVE)

    ;; Update status to executing
    (map-set vaults { vault-id: vault-id } (merge vault { status: u3 }))

    ;; NOTE: In production, loop over beneficiaries and transfer sBTC
    ;; Each transfer respects the time-lock:
    ;; - If time-lock has passed: transfer immediately
    ;; - If time-lock is in future: create a sub-escrow contract
    ;; 
    ;; Pseudocode for distribution loop:
    ;; (let ((count (get count count-data)))
    ;;   (distribute-to-beneficiaries vault-id count (get sbtc-amount vault)))

    ;; Mark vault complete
    (map-set vaults { vault-id: vault-id } (merge vault { status: u4 }))
    (var-set total-sbtc-protected (- (var-get total-sbtc-protected) (get sbtc-amount vault)))

    (ok true)
  )
)

;; Owner withdraws from an active vault (cancel/exit)
(define-public (withdraw-vault (vault-id uint))
  (let (
    (caller tx-sender)
    (vault (unwrap! (map-get? vaults { vault-id: vault-id }) ERR-VAULT-NOT-FOUND))
    (current-status (compute-status vault-id))
  )
    ;; Only owner
    (asserts! (is-eq caller (get owner vault)) ERR-NOT-AUTHORIZED)
    ;; Can only withdraw while active/warning (not in grace, executing, or complete)
    (asserts! (or (is-eq current-status u0) (is-eq current-status u1)) ERR-VAULT-NOT-ACTIVE)

    ;; Transfer sBTC back to owner
    ;; (try! (as-contract (contract-call? .sbtc-token transfer (get sbtc-amount vault) tx-sender caller none)))

    ;; Mark complete (closed by owner)
    (map-set vaults { vault-id: vault-id } (merge vault { status: u4 }))
    (var-set total-sbtc-protected (- (var-get total-sbtc-protected) (get sbtc-amount vault)))

    (ok true)
  )
)

;; ---- READ-ONLY FUNCTIONS ----

;; Get vault details
(define-read-only (get-vault (vault-id uint))
  (map-get? vaults { vault-id: vault-id })
)

;; Get live computed status (may differ from stored status)
(define-read-only (get-vault-status (vault-id uint))
  (compute-status vault-id)
)

;; Get a specific beneficiary
(define-read-only (get-beneficiary (vault-id uint) (index uint))
  (map-get? beneficiaries { vault-id: vault-id, index: index })
)

;; Get number of beneficiaries
(define-read-only (get-beneficiary-count (vault-id uint))
  (default-to { count: u0 }
    (map-get? beneficiary-count { vault-id: vault-id })
  )
)

;; Get blocks until deadline
(define-read-only (get-blocks-until-deadline (vault-id uint))
  (let (
    (deadline (get-deadline vault-id))
    (current block-height)
  )
    (if (> deadline current)
      (some (- deadline current))
      none
    )
  )
)

;; Protocol-wide stats
(define-read-only (get-protocol-stats)
  {
    total-vaults: (var-get total-vaults),
    total-sbtc-protected: (var-get total-sbtc-protected),
    next-vault-id: (var-get next-vault-id),
  }
)

;; Check if an address is a beneficiary of a vault
(define-read-only (is-beneficiary (vault-id uint) (address principal))
  (let (
    (count (get count (get-beneficiary-count vault-id)))
  )
    ;; NOTE: In production, implement proper iteration
    ;; This simplified check verifies index 0 only for demo
    (match (map-get? beneficiaries { vault-id: vault-id, index: u0 })
      b (is-eq (get address b) address)
      false
    )
  )
)
