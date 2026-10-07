"use client";

import { useEffect, useState } from "react";

import { FALLBACK_SECTORS, isSectorList, type OrganisationSector } from "@/lib/sectors";

/** The configured organisation sectors for sign-up. `loaded` is false until the first answer arrives. */
export function useOrganisationSectors(): { sectors: OrganisationSector[]; loaded: boolean } {
  const [state, setState] = useState<{ sectors: OrganisationSector[]; loaded: boolean }>({
    sectors: FALLBACK_SECTORS,
    loaded: false,
  });
  useEffect(() => {
    let cancelled = false;
    fetch("/api/organisation-sectors", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (!cancelled) setState({ sectors: isSectorList(body) ? body : FALLBACK_SECTORS, loaded: true });
      })
      .catch(() => !cancelled && setState({ sectors: FALLBACK_SECTORS, loaded: true }));
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}
