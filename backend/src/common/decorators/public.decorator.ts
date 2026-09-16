import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

// Opts a route out of the global JwtAuthGuard — used for /auth/login,
// /auth/register, /health, and the public Capability Status read endpoint
// (Section 4a.7's GET /public/capability-status).
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
