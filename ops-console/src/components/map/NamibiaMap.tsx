"use client";

import { useId, useState } from "react";

import { DATA, DATA_MUTED, INK, PLACEHOLDER_FILL } from "./chart-tokens";
import { MAP_HEIGHT, MAP_WIDTH, NAMIBIA_REGIONS } from "./namibiaRegions";

/**
 * Namibia's 14 administrative regions, ported from
 * buffr-intelligence/frontend/src/components/illustration/NamibiaMap.tsx.
 * `namibiaRegions.ts` is copied verbatim (pure geometry, brand-neutral —
 * "Generated — do not hand-edit" per its own header). This component is a
 * simplified rewrite: Buffr Checkpoint's own tokens instead of that
 * product's Signal Arc palette, and no point-level overlay/modal (that
 * product's `RegionModal.tsx` + `namibiaProjection.ts` weren't ported —
 * this console only needs the region-level choropleth for now; port those
 * two files later if a per-site point overlay is ever needed).
 *
 * `null` is hatched — not measured. Do not pass invented data.
 */

const MAP_LABEL: Record<string, string> = {
  kavango_east: "Kavango E",
  kavango_west: "Kavango W",
};

const DENSE = new Set(["ohangwena", "oshana", "omusati", "oshikoto", "kavango_east", "kavango_west"]);

export interface NamibiaMapProps {
  values: Record<string, number | null>;
  labels?: Record<string, string>;
  caption?: string;
  className?: string;
}

const fmt = (v: number | null) => (v === null ? "—" : `${Math.round(v)}`);

export function NamibiaMap({ values, labels = {}, caption, className = "" }: NamibiaMapProps) {
  const uid = useId().replace(/:/g, "");
  const [active, setActive] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const rows = NAMIBIA_REGIONS.map((r) => ({ ...r, v: values[r.code] ?? null }));
  const reached = rows.filter((r) => r.v !== null).length;
  const maxValue = Math.max(1, ...rows.map((r) => r.v ?? 0));
  const selectedRow = rows.find((r) => r.code === selected) ?? null;

  return (
    <figure className={className}>
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        role="img"
        aria-label={`Map of Namibia's fourteen administrative regions. ${reached} of 14 have data.`}
        className="h-auto max-h-[560px] w-full"
      >
        <defs>
          <pattern id={`${uid}-none`} width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill={PLACEHOLDER_FILL} />
            <line x1="0" y1="0" x2="0" y2="8" stroke={DATA_MUTED} strokeWidth="2.5" />
          </pattern>
        </defs>

        <g>
          {rows.map((r) => {
            const isSelected = selected === r.code;
            const on = active === r.code || isSelected;
            const opacity = r.v === null ? 1 : 0.18 + (r.v / maxValue) * 0.82;
            let strokeWidth = 2;
            if (isSelected) strokeWidth = 5;
            else if (on) strokeWidth = 4;
            return (
              // biome-ignore lint/a11y/useSemanticElements: SVG shapes can't be real <button> elements — role+tabIndex+keyboard handlers is the standard accessible pattern for interactive SVG regions
              <path
                key={r.code}
                d={r.d}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={r.v === null ? `${r.name}, no data` : `${r.name}, ${fmt(r.v)}`}
                fill={r.v === null ? `url(#${uid}-none)` : DATA}
                fillOpacity={opacity}
                stroke={isSelected ? INK : "#ffffff"}
                strokeWidth={strokeWidth}
                strokeLinejoin="round"
                className="cursor-pointer outline-none transition-[stroke-width,fill-opacity] duration-200 focus-visible:stroke-carbon"
                onMouseEnter={() => setActive(r.code)}
                onMouseLeave={() => setActive(null)}
                onClick={() => setSelected((cur) => (cur === r.code ? null : r.code))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected((cur) => (cur === r.code ? null : r.code));
                  }
                  if (e.key === "Escape") setSelected(null);
                }}
              >
                <title>{r.v === null ? `${r.name}: no data` : `${r.name}: ${fmt(r.v)}`}</title>
              </path>
            );
          })}
        </g>

        <g style={{ pointerEvents: "none" }}>
          {rows.map((r) => {
            const dense = DENSE.has(r.code);
            const label = MAP_LABEL[r.code] ?? r.name;
            return (
              <g key={`label-${r.code}`} transform={`translate(${r.cx}, ${r.cy})`}>
                <text
                  textAnchor="middle"
                  y={r.v === null ? 4 : -6}
                  fill={INK}
                  stroke="#ffffff"
                  strokeWidth={3}
                  paintOrder="stroke"
                  style={{ fontSize: dense ? 11 : 13, fontWeight: 500 }}
                >
                  {label}
                </text>
                {r.v !== null ? (
                  <text
                    textAnchor="middle"
                    y={dense ? 8 : 10}
                    fill={INK}
                    stroke="#ffffff"
                    strokeWidth={2.5}
                    paintOrder="stroke"
                    style={{ fontSize: dense ? 10 : 12, fontFamily: "ui-monospace, monospace" }}
                  >
                    {fmt(r.v)}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>

      <table className="sr-only">
        <caption>Namibia regions</caption>
        <thead>
          <tr>
            <th scope="col">Region</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`a11y-${r.code}`}>
              <td>{r.name}</td>
              <td>{r.v === null ? "No data" : fmt(r.v)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-slate text-xs">
        {reached > 0 ? (
          <div className="flex items-center gap-2" aria-hidden="true">
            <span>Low</span>
            <span
              className="inline-block h-3 w-24 rounded-full"
              style={{ background: `linear-gradient(to right, ${DATA}26, ${DATA})` }}
            />
            <span>High</span>
          </div>
        ) : null}
        <div className="flex items-center gap-2" aria-hidden="true">
          <span
            className="h-3 w-4 shrink-0 rounded-sm"
            style={{
              background: PLACEHOLDER_FILL,
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 2px, ${DATA_MUTED} 2px, ${DATA_MUTED} 3px)`,
            }}
          />
          <span>Hatched — no data</span>
        </div>
      </div>

      {selectedRow ? (
        <div className="mt-3 rounded-xl border border-border/60 bg-card p-4 text-sm">
          <p className="font-semibold text-foreground">{labels[selectedRow.code] ?? selectedRow.name}</p>
          <p className="mt-1 text-slate">
            {selectedRow.v === null ? "No data for this region." : `Value: ${fmt(selectedRow.v)}`}
          </p>
        </div>
      ) : null}

      {caption ? <figcaption className="mt-4 max-w-prose text-slate text-xs">{caption}</figcaption> : null}
    </figure>
  );
}
