import { Board } from "@/components/Board";
import { Toolbar } from "@/components/Toolbar";
import { filtersFromSearchParams } from "@/lib/filters";
import { listLabels, listTasks } from "@/lib/tasks";

export default async function BoardPage({ searchParams }: PageProps<"/">) {
  const filters = filtersFromSearchParams(await searchParams);
  return (
    <>
      <Toolbar title="Board" filters={filters} labels={listLabels()} />
      <Board tasks={listTasks(filters)} />
    </>
  );
}
