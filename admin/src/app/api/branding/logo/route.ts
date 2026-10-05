import { NextResponse } from "next/server";

import { backendUrl } from "@/lib/auth/backend-url";
import { isSameOriginRequest } from "@/lib/auth/csrf";
import { getSessionToken } from "@/lib/auth/session";
import { brandingCopy, LOGO_MIME_TYPES, MAX_LOGO_BYTES } from "@/lib/copy/branding";

/** Forwards one logo file to the backend, which checks content and re-encodes it. */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ code: "LOGO_MISSING", error: brandingCopy.errors.LOGO_MISSING }, { status: 400 });
  }
  if (!(LOGO_MIME_TYPES as readonly string[]).includes(file.type)) {
    return NextResponse.json(
      { code: "LOGO_UNSUPPORTED_TYPE", error: brandingCopy.errors.LOGO_UNSUPPORTED_TYPE },
      { status: 415 },
    );
  }
  if (file.size > MAX_LOGO_BYTES) {
    return NextResponse.json({ code: "LOGO_TOO_LARGE", error: brandingCopy.errors.LOGO_TOO_LARGE }, { status: 413 });
  }

  const upstream = new FormData();
  upstream.append("file", file, file.name);
  const backendResponse = await fetch(backendUrl("/site-branding/assets"), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: upstream,
    cache: "no-store",
  });
  const body = (await backendResponse.json().catch(() => ({}))) as {
    code?: string;
    message?: string;
    logoArtifactId?: string;
    url?: string | null;
  };
  if (!backendResponse.ok) {
    return NextResponse.json(
      { code: body.code, error: body.message ?? brandingCopy.errors.upload },
      { status: backendResponse.status },
    );
  }
  return NextResponse.json({ logoArtifactId: body.logoArtifactId, url: body.url ?? null });
}
