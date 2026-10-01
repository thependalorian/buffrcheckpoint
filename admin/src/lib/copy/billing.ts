// Customer billing copy (card payments via Adumo Online's secure page).

export const billingCopy = {
  descriptionBankOnly:
    "Invoices are settled by bank transfer to Buffr Financial Services CC — upload your proof of payment against the invoice below once paid. Go-live and operational dashboard use require an active or trial subscription after Buffr ops reviews your POP (and KYB).",
  descriptionWithCard:
    "Pay each invoice by card on Adumo Online's secure page, or by bank transfer to Buffr Financial Services CC with your proof of payment uploaded below. Go-live and operational dashboard use require an active or trial subscription after Buffr ops confirms payment (and KYB).",
  payByCard: "Pay by card",
  payByCardHint: "Pay securely on Adumo Online's page. We never see your card details.",
  redirecting: {
    title: "Taking you to secure payment",
    body: "You are paying on Adumo Online's secure page. Your card details go to Adumo, not to Buffr Checkpoint.",
    button: "Continue to secure payment",
  },
  result: {
    succeeded: "Payment received. Your invoice is marked paid and a receipt is on its way by email.",
    failed:
      "The card payment did not go through, and you have not been charged. You can try again or pay by bank transfer.",
    not_open: "This invoice is not open for card payment. It may already be paid.",
    unavailable:
      "Card payment is not available right now. Please pay by bank transfer and upload your proof of payment.",
    error:
      "We could not confirm the card payment. If money left your account, contact team@buffranalytics.com with the invoice number.",
  },
} as const;

export type CardPaymentResult = keyof typeof billingCopy.result;
