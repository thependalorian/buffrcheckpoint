/** Public-facing assurance ladder (buffrcheckpoint.md §5.2a). Codes stay internal; marketing uses these names only. */

export const IDENTITY_ASSURANCE_LEVEL_LABELS = {
  selfAsserted: "Self-asserted identity",
  contactPossession: "Contact-channel possession",
  siteCredential: "Site-issued credential possession",
  diginamVerified: "DigiNam / NPKI verified identity",
  officialEid: "Official e-ID cryptographic validation",
} as const;

/** One-line summary for pricing, privacy, and legal pages. */
export const IDENTITY_ASSURANCE_LADDER_SUMMARY =
  "Self-asserted identity, contact-channel possession, site-issued credentials, DigiNam verification where enabled, and official e-ID validation where enabled";
