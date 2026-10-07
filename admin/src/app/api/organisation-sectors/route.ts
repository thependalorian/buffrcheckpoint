import { NextResponse } from "next/server";

import { loadOrganisationSectors } from "@/lib/sectors";

// Sign-up has no session. This hands the browser the configured sector list from the API.
export async function GET() {
  return NextResponse.json(await loadOrganisationSectors());
}
