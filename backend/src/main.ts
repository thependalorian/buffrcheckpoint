// Must run before any other import — db/client.ts reads DATABASE_URL at
// module-load time, and app.module.ts's import chain reaches it before
// bootstrap() ever runs.
import "dotenv/config";
import "./instrument";

import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";

import { AppModule } from "./app.module";

function corsOrigins(): boolean | string[] {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw) return true;
  const list = raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return list.length > 0 ? list : true;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Section 11.8.6: security hardening baseline.
  // CORP must be cross-origin: browsers fetch this API from website/admin/ops
  // (different origins). Helmet's default same-origin CORP breaks those fetches
  // even when Access-Control-Allow-Origin is set.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.enableCors({
    origin: corsOrigins(),
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
  console.log(`Buffr Checkpoint backend listening on port ${port}`);
}

bootstrap().catch((error: unknown) => {
  console.error("Fatal error during bootstrap:", error);
  process.exit(1);
});
