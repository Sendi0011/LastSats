;; @contract sbtc-mock-token
;; @version 1

;; Testnet-only mock of the sBTC SIP-010 fungible token, used to fund a
;; local test wallet so the lastsats vault lifecycle can be exercised
;; without acquiring real sBTC (the real testnet faucet is exhausted).
;; NOT for mainnet.
;;
;; Note: this contract intentionally defines no `define-trait`. The vault
;; reaches it by absolute principal via `contract-call?`, and Clarity 2+
;; dispatches on the public function name, so no trait is required. This
;; matches the instance already deployed at
;; ST1JY6A22J1DXWACXWPR95HZQR72FAP3J835MKFC2.sbtc-mock-token.

(define-fungible-token sbtc-mock-token u10000000000000000)

(define-constant ERR-NOT-AUTHORIZED u4)

(define-data-var total-supply uint u0)

(define-read-only (get-balance (account principal))
  (ok (ft-get-balance sbtc-mock-token account))
)

(define-read-only (get-total-supply)
  (ok (var-get total-supply))
)

(define-read-only (get-name)
  (ok "sBTC mock")
)

(define-read-only (get-symbol)
  (ok "sBTC")
)

(define-read-only (get-decimals)
  (ok u8)
)

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (is-eq tx-sender sender) (err ERR-NOT-AUTHORIZED))
    (match (ft-transfer? sbtc-mock-token amount sender recipient)
      transferred (begin
        (print {action: "transfer", from: sender, to: recipient, amount: amount})
        (ok true)
      )
      transfer-error (err transfer-error)
    )
  )
)

;; @desc Mint tokens to a recipient. Testnet mock only, deliberately public
;; so the test wallet can be funded without a faucet.
(define-public (mint (amount uint) (recipient principal))
  (let ((current-supply (var-get total-supply)))
    (var-set total-supply (+ current-supply amount))
    (ft-mint? sbtc-mock-token amount recipient)
  )
)

;; @desc Burn tokens held by the caller
(define-public (burn (amount uint))
  (begin
    (var-set total-supply (- (var-get total-supply) amount))
    (ft-burn? sbtc-mock-token amount tx-sender)
  )
)
