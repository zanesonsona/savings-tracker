"use client";

import { useId } from "react";
import { shortMonthLabel } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import type { OverviewTrendPoint } from "@/lib/types";

const WIDTH = 360;
const HEIGHT = 180;
const TOP = 24;
const BASELINE = 140;
const CHART_HEIGHT = BASELINE - TOP;

/**
 * Hand-rolled grouped bar chart (T36/D25): income vs spent for the trailing
 * months. SVG for the visual, plus a screen-reader table with the same figures.
 */
export default function TrendChart({ trend }: { trend: OverviewTrendPoint[] }) {
  const titleId = useId();
  const maxValue = Math.max(
    1,
    ...trend.flatMap((point) => [point.incomeTotalCents, point.spentCents]),
  );
  const groupWidth = trend.length === 0 ? WIDTH : WIDTH / trend.length;
  const barWidth = Math.min(14, Math.max(8, groupWidth / 4.4));
  const gap = 4;
  const hasActivity = trend.some(
    (point) => point.incomeTotalCents > 0 || point.spentCents > 0,
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-chart-1" />
          Income
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-chart-2" />
          Spent
        </span>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-labelledby={titleId}
        className="h-auto w-full"
      >
        <title id={titleId}>Income and spending over the last {trend.length} months</title>
        {[0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = BASELINE - CHART_HEIGHT * ratio;
          return (
            <line
              key={ratio}
              x1="0"
              x2={WIDTH}
              y1={y}
              y2={y}
              stroke="var(--line)"
              strokeWidth="1"
              strokeDasharray={ratio === 1 ? undefined : "3 5"}
            />
          );
        })}

        {trend.map((point, index) => {
          const center = groupWidth * index + groupWidth / 2;
          const incomeHeight = (point.incomeTotalCents / maxValue) * CHART_HEIGHT;
          const spentHeight = (point.spentCents / maxValue) * CHART_HEIGHT;
          return (
            <g key={point.month}>
              <rect
                x={center - barWidth - gap / 2}
                y={BASELINE - incomeHeight}
                width={barWidth}
                height={incomeHeight}
                rx="3"
                fill="var(--chart-1)"
              />
              <rect
                x={center + gap / 2}
                y={BASELINE - spentHeight}
                width={barWidth}
                height={spentHeight}
                rx="3"
                fill="var(--chart-2)"
              />
              <text
                x={center}
                y={BASELINE + 20}
                textAnchor="middle"
                fontSize="10"
                fill="var(--ink-muted)"
              >
                {shortMonthLabel(point.month)}
              </text>
            </g>
          );
        })}
      </svg>

      {!hasActivity ? (
        <p className="mt-1 text-sm text-ink-muted">
          No income or spending in this period yet.
        </p>
      ) : null}

      {/* The sr-only wrapper clips the table: a table ignores a 1px width and
          would otherwise widen the page at 320px. */}
      <div className="sr-only">
        <table>
          <caption>Income and spending over the last {trend.length} months</caption>
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">Income</th>
              <th scope="col">Spent</th>
              <th scope="col">Net saved</th>
            </tr>
          </thead>
          <tbody>
            {trend.map((point) => (
              <tr key={point.month}>
                <th scope="row">{shortMonthLabel(point.month)}</th>
                <td>{formatCents(point.incomeTotalCents)}</td>
                <td>{formatCents(point.spentCents)}</td>
                <td>{formatCents(point.netSavedCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
