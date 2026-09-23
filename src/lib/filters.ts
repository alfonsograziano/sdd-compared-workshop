import { taskFiltersSchema, type TaskFilters } from "./validation";

export type SearchParams = Record<string, string | string[] | undefined>;

/** Reads the filters from the URL. Bad values are ignored instead of crashing the page. */
export function filtersFromSearchParams(params: SearchParams): TaskFilters {
  const pick = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value) || undefined;
  };
  const raw = { q: pick("q"), priority: pick("priority"), labelId: pick("label") };
  const filters: TaskFilters = {};
  for (const key of ["q", "priority", "labelId"] as const) {
    const result = taskFiltersSchema.shape[key].safeParse(raw[key]);
    if (result.success && result.data !== undefined) Object.assign(filters, { [key]: result.data });
  }
  return filters;
}
