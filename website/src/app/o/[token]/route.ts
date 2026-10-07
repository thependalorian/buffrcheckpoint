import { NextResponse } from "next/server";

import { shortLinkTarget } from "@/lib/short-links";

// Sign-out link from a text message. Hands the token to the check-out page unchanged; the API verifies it.
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return NextResponse.redirect(new URL(shortLinkTarget("signOut", token), request.url), 307);
}
