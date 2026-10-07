import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Checkpoint",
  version: packageJson.version,
  copyright: `© ${currentYear} Buffr Checkpoint.`,
  meta: {
    title: "Checkpoint: Admin",
    description:
      "Checkpoint admin: visitor check-in, access control, and compliance evidence for regulated, multi-site organisations.",
  },
};
