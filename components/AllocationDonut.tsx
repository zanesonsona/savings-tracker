"use client";

import { useId } from "react";
import { formatCents } from "@/lib/money";

const FALLBACK_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

export interface DonutSlice {
  id: number;
  name: string;
  amountCents: number;
  color: string | null;
}

interface Part extends DonutSlice {
  stroke: string;
  percent: number;
}

/**
 * Hand-rolled SVG allocation donut (T36/D25). The visual ring is paired with a
 * screen-reader table so the same numbers remain available without color.
 */
export default function AllocationDonut({
  slices,
  unallocatedCents,
}: {
  slices: DonutSlice[];
  unallocatedCents: number;
}) {
  const titleId = useId();

  const parts: Part[] = slices
    .filter((slice) => slice.amountCents > 0)
    .map((slice, index) => ({
      ...slice,
      stroke: slice.color ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length],
      percent: 0,
    }));
  if (unallocatedCents > 0) {
    parts.push({
      id: -1,
      name: "Unallocated",
      amountCents: unallocatedCents,
      color: null,
      stroke: "var(--chart-other)",
      percent: 0,
    });
  }

  const totalCents = parts.reduce((sum, part) => sum + part.amountCents, 0);
  for (const part of parts) part.percent = totalCents === 0 ? 0 : (part.amountCents / totalCents) * 100;

  const arcs = parts.map((part, index) => {
    const offset = parts
      .slice(0, index)
      .reduce((sum, previous) => sum + previous.percent, 0);
    return (
      <circle
        key={part.id}
        cx="60"
        cy="60"
        r="44"
        fill="none"
        stroke={part.stroke}
        strokeWidth="16"
        pathLength={100}
        strokeDasharray={`${part.percent} ${100 - part.percent}`}
        strokeDashoffset={-offset}
      />
    );
  });

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative h-40 w-40 shrink-0">
        <svg
          viewBox="0 0 120 120"
          role="img"
          aria-labelledby={titleId}
          className="h-full w-full -rotate-90"
        >
          <title id={titleId}>Allocation by category</title>
          <circle
            cx="60"
            cy="60"
            r="44"
            fill="none"
            stroke="var(--line)"
            strokeWidth="16"
          />
          {arcs}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] font-medium text-ink-muted">Allocated</span>
          <span className="money max-w-28 truncate text-sm font-semibold text-ink">
            {formatCents(totalCents - Math.max(0, unallocatedCents))}
          </span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        {parts.length === 0 ? (
          <p className="text-sm text-ink-muted">
            No allocations yet — add income and category percentages to see the split.
          </p>
        ) : (
          <ul className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
            {parts.map((part) => (
              <li key={part.id} className="flex min-w-0 items-center gap-2 text-sm">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: part.stroke }}
                />
                <span className="min-w-0 flex-1 truncate text-ink-muted">{part.name}</span>
                <span className="money shrink-0 text-xs font-medium text-ink">
                  {formatCents(part.amountCents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* sr-only wrapper: tables do not shrink below their min-content width,
          which would cause horizontal overflow at 320px. */}
      <div className="sr-only">
        <table>
          <caption>Allocation by category for the selected month</caption>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Allocated</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((part) => (
              <tr key={part.id}>
                <th scope="row">{part.name}</th>
                <td>{formatCents(part.amountCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
