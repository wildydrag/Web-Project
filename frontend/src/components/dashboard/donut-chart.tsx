"use client";

import { formatNumber, toFaDigits } from "@/lib/format";
import { useT } from "@/lib/i18n";

export interface DonutSlice {
  label: string;
  value: number;
  /** Any CSS color, e.g. `var(--gold)`. */
  color: string;
}

/**
 * A small, dependency-free SVG donut chart with a legend. Used for the admin's
 * subscription-tier distribution.
 */
export function DonutChart({
  data,
  size = 180,
  thickness = 26,
}: {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
}) {
  const t = useT();
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shrink-0"
        role="img"
        aria-label={t("توزیع کاربران بر اساس اشتراک")}
      >
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {data.map((slice, i) => {
            const dash = (slice.value / total) * circumference;
            const circle = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return circle;
          })}
        </g>
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-foreground font-bold"
          fontSize={size * 0.18}
        >
          {toFaDigits(total)}
        </text>
      </svg>

      <ul className="w-full space-y-2 text-sm">
        {data.map((slice, i) => (
          <li key={i} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              {slice.label}
            </span>
            <span className="tabular text-muted-foreground">
              {t("{value} ({percent}٪)", {
                  value: formatNumber(slice.value),
                  percent: toFaDigits(Math.round((slice.value / total) * 100)),
                })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
