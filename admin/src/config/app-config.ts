import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Buffr Checkpoint",
  version: packageJson.version,
  copyright: `© ${currentYear} Buffr Checkpoint.`,
  meta: {
    title: "Buffr Checkpoint: Admin",
    description:
      "Buffr Checkpoint's admin dashboard — visitor check-in, access control, and compliance evidence for regulated, multi-site organisations.",
  },
};
