// Must run before any other import — db/client.ts reads DATABASE_URL at
// module-load time, and app.module.ts's import chain reaches it before
// bootstrap() ever runs.
import "dotenv/config";
import "./instrument";

import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";

import { AppModule } from "./app.module";
import { corsOrigins } from "./common/config/cors-origins";
import { assertProductionConfig } from "./common/config/production-config-guard";

const logger = new Logger("Bootstrap");

async function bootstrap() {
  assertProductionConfig();
  const app = await NestFactory.create(AppModule);

  // Section 11.8.6: security hardening baseline.
  // CORP must be cross-origin: browsers fetch this API from website/admin/ops
  // (different origins). Helmet's default same-origin CORP breaks those fetches
  // even when Access-Control-Allow-Origin is set.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      // HD-1: a JSON API serves no documents, so no source is allowed and nothing may frame it.
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      strictTransportSecurity: { maxAge: 31_536_000, includeSubDomains: true },
    }),
  );
  app.use((_req: unknown, res: { setHeader(name: string, value: string): void }, next: () => void) => {
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
    next();
  });
  app.enableCors({
    origin: corsOrigins(process.env.CORS_ORIGIN, logger),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown properties — never trust client-supplied fields the DTO doesn't declare
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  logger.log(`Buffr Checkpoint backend listening on port ${port}`);
}

bootstrap().catch((error: unknown) => {
  logger.error("Fatal error during bootstrap", error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
