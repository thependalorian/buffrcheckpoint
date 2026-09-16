// Must run before any other import — db/client.ts reads DATABASE_URL at
// module-load time, and app.module.ts's import chain reaches it before
// bootstrap() ever runs.
import "dotenv/config";
import "./instrument";

import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";

import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Section 11.8.6: security hardening baseline.
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? true,
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
