(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (if true (ok true) (err u0))
)

(define-read-only (get-balance (account principal))
  (ok u1000000000)
)

(define-read-only (get-total-supply)
  (ok u1000000000000)
)

(define-read-only (get-name)
  (ok "sBTC")
)

(define-read-only (get-symbol)
  (ok "sBTC")
)

(define-read-only (get-decimals)
  (ok u8)
)
