/** Public marketing → admin app signup (production apex). */
export const ADMIN_REGISTER_URL = "https://admin.buffrcheckpoint.com/auth/register";

export const MARKETING_PRIMARY_CTA = {
  href: ADMIN_REGISTER_URL,
  label: "Create account",
} as const;

export const MARKETING_SECONDARY_PRICING_CTA = {
  href: "/pricing",
  label: "See pricing",
} as const;

/** Self-serve path from signup to go-live. Payment is the gate. */
export const SIGNUP_STEPS = [
  {
    title: "Create your account",
    body: "Register your organisation, verify your email, and start setting up right away.",
  },
  {
    title: "Set up your sites",
    body: "Add your sites, hosts, and staff, then print your site QR code.",
  },
  {
    title: "Verify your business",
    body: "Upload your registration, a bank confirmation letter, an ID for each owner and proof of address. We read them and fill in the details for you to check.",
  },
  {
    title: "Pay by EFT",
    body: "Pick a plan under Billing, pay the invoice by EFT, and upload your proof of payment.",
  },
  {
    title: "Go live",
    body: "We confirm your business and your payment, your subscription turns active, and visitors start checking in.",
  },
] as const;
