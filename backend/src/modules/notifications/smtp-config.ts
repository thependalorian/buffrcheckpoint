export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  /** Visible sender, e.g. `Buffr Checkpoint <hello@buffr.ai>`. Must be the mailbox or an alias of it, or the provider rejects it. */
  from: string;
  replyTo: string;
  /** The mailbox domain, used for Message-IDs. */
  domain: string;
  timeoutMs: number;
  perHour: number;
  perDay: number;
}

export type EmailTransport = "smtp" | "resend" | "none";

const ADDRESS = /^[^\s<>@"]+@[^\s<>@"]+\.[^\s<>@"]+$/;

function int(value: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? Math.floor(n) : fallback;
}

/** Which sender to use. SMTP wins when its credentials are set; Resend stays available as a fallback; otherwise mail is refused loudly. */
export function chooseTransport(env: NodeJS.ProcessEnv = process.env): EmailTransport {
  const requested = env.EMAIL_TRANSPORT?.trim().toLowerCase();
  if (requested === "smtp" || requested === "resend" || requested === "none") return requested;
  if (env.SMTP_USER?.trim() && env.SMTP_PASS) return "smtp";
  if (env.RESEND_API_KEY?.trim()) return "resend";
  return "none";
}

/** Returns the SMTP settings, or throws with a message naming what is wrong (never the password). */
export function smtpConfigFromEnv(env: NodeJS.ProcessEnv = process.env): SmtpConfig {
  const user = env.SMTP_USER?.trim() ?? "";
  const pass = env.SMTP_PASS ?? "";
  if (!ADDRESS.test(user)) throw new Error("SMTP_USER must be the mailbox address, for example hello@buffr.ai");
  if (!pass) throw new Error("SMTP_PASS is not set");
  const port = int(env.SMTP_PORT, 465, 1, 65535);
  const from = env.EMAIL_FROM?.trim() || `Buffr Checkpoint <${user}>`;
  const fromAddress = /<([^>]+)>/.exec(from)?.[1] ?? from;
  if (!ADDRESS.test(fromAddress)) throw new Error("EMAIL_FROM is not a valid address");
  const replyTo = env.EMAIL_REPLY_TO?.trim() || user;
  if (!ADDRESS.test(replyTo)) throw new Error("EMAIL_REPLY_TO is not a valid address");
  return {
    host: env.SMTP_HOST?.trim() || "mail.privateemail.com",
    port,
    secure: env.SMTP_SECURE ? env.SMTP_SECURE.trim().toLowerCase() !== "false" : port === 465,
    user,
    pass,
    from,
    replyTo,
    domain: user.slice(user.indexOf("@") + 1).toLowerCase(),
    timeoutMs: int(env.SMTP_TIMEOUT_MS, 60_000, 5_000, 300_000), // the mailbox link can be slow: 30 seconds was too short in testing
    perHour: int(env.EMAIL_MAX_PER_HOUR, 60, 1, 10_000),
    perDay: int(env.EMAIL_MAX_PER_DAY, 300, 1, 100_000),
  };
}
