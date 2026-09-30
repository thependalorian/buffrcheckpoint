import {
  MARKETING_PAGE_CLOSES,
  type MarketingPageCloseKey,
} from "@/lib/marketing-visuals";

import { MarketingBottomCta } from "./marketing-bottom-cta";
import { MarketingClosingVisual } from "./marketing-closing-visual";

type MarketingPageCloseProps = {
  page: MarketingPageCloseKey;
};

/** Closing photograph immediately above the bottom CTA — not above the footer. */
export function MarketingPageClose({ page }: MarketingPageCloseProps) {
  const config = MARKETING_PAGE_CLOSES[page];
  const { closing, cta } = config;

  return (
    <>
      <MarketingClosingVisual backgroundSrc={closing.src} backgroundAlt={closing.alt} />
      <MarketingBottomCta
        title={cta.title}
        description={"description" in cta ? cta.description : undefined}
        href={cta.href}
        buttonLabel={cta.buttonLabel}
      />
    </>
  );
}
