import { Controller, Get, Header } from "@nestjs/common";

import { Public } from "../../common/decorators/public.decorator";
import { TokenIssuerService } from "./token-issuer.service";

/** Publishes the public signing keys so any service of ours can verify a token without a shared secret (SE-1). */
@Controller(".well-known")
export class JwksController {
  constructor(private readonly tokens: TokenIssuerService) {}

  @Public()
  @Get("jwks.json")
  @Header("Cache-Control", "public, max-age=300")
  keys() {
    return this.tokens.publicKeySet();
  }
}
