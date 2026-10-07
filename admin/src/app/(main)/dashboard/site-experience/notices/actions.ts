"use server";

import { revalidatePath } from "next/cache";

import { type ActionResult, failure, runAction } from "@/lib/actions/result";
import { api } from "@/lib/api/client";

export interface PublishedNotice {
  versionNumber: number;
  contentText: string;
  publishedAt: string;
  siteSpecific: boolean;
}

interface NoticeResponse {
  published: PublishedNotice | null;
}

const KINDS = new Set(["emergency", "induction"]);

/** The text currently published for a kind and scope (a site, or all sites when siteId is empty). */
export async function loadNoticeAction(kind: string, siteId: string): Promise<ActionResult<PublishedNotice | null>> {
  if (!KINDS.has(kind)) return failure("BAD_KIND", "Unknown notice.");
  const query = siteId ? `?siteId=${encodeURIComponent(siteId)}` : "";
  return runAction(
    "Could not load this notice.",
    async () => (await api.get<NoticeResponse>(`/site-notices/${kind}${query}`)).published,
  );
}

export async function publishNoticeAction(
  kind: string,
  siteId: string,
  contentText: string,
): Promise<ActionResult<PublishedNotice | null>> {
  if (!KINDS.has(kind)) return failure("BAD_KIND", "Unknown notice.");
  if (contentText.trim().length < 20) return failure("TOO_SHORT", "Write at least 20 characters.");
  return runAction("Could not publish this notice.", async () => {
    const published = await api.put<PublishedNotice | null>(`/site-notices/${kind}`, {
      siteId: siteId || undefined,
      contentText,
    });
    revalidatePath("/dashboard/site-experience/notices");
    return published;
  });
}
