import {
  columnFilteringFeature,
  constructFilterFn,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
} from "@tanstack/react-table";

export type Range = [number, number];

const isRange = (v: unknown): v is Range =>
  Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === "number" && Number.isFinite(n));

/** Keeps rows whose value lies inside [lo, hi] (inclusive). Anything that is not a range removes the filter. */
const numberBetween = constructFilterFn({
  filter: (dataValue: number, [lo, hi]: Range) => dataValue >= lo && dataValue <= hi,
  autoRemove: (v: unknown) => !isRange(v),
});

/**
 * Same for a 0-1 probability column with the range expressed in whole percentage points.
 * The row's percentage is rounded first so it matches what the probability badge shows.
 */
const percentBetween = constructFilterFn({
  filter: (dataValue: number, [lo, hi]: Range) => {
    const pct = Math.round(dataValue * 100);
    return pct >= lo && pct <= hi;
  },
  autoRemove: (v: unknown) => !isRange(v),
});

export const features = tableFeatures({
  columnFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { numberBetween, percentBetween },
  sortFns: { basic: sortFn_basic, text: sortFn_text },
});

export type DataTableFeatures = typeof features;
