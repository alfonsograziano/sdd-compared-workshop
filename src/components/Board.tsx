"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRef, useState, useTransition, type MouseEvent } from "react";
import { moveTaskAction } from "@/app/actions";
import { STATUSES, STATUS_LABELS, type Status } from "@/lib/constants";
import type { Task } from "@/lib/tasks";
import { StatusIcon } from "./icons";
import { TaskCard } from "./TaskCard";

type Columns = Record<Status, Task[]>;

function groupByStatus(tasks: Task[]): Columns {
  const columns = Object.fromEntries(STATUSES.map((s) => [s, [] as Task[]])) as Columns;
  for (const task of tasks) columns[task.status].push(task);
  for (const status of STATUSES) columns[status].sort((a, b) => a.position - b.position);
  return columns;
}

/**
 * Kanban board. Cards move in local state while you drag, and the final
 * spot is saved with moveTaskAction when you drop.
 */
export function Board({ tasks }: { tasks: Task[] }) {
  const [columns, setColumns] = useState(() => groupByStatus(tasks));
  // Reset local state when the server sends new tasks.
  const [source, setSource] = useState(tasks);
  if (source !== tasks) {
    setSource(tasks);
    setColumns(groupByStatus(tasks));
  }

  const [activeId, setActiveId] = useState<number | null>(null);
  const justDragged = useRef(false);
  const [, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function columnOf(id: UniqueIdentifier): Status | undefined {
    if ((STATUSES as readonly UniqueIdentifier[]).includes(id)) return id as Status;
    return STATUSES.find((s) => columns[s].some((t) => t.id === id));
  }

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(Number(active.id));
    justDragged.current = true;
  }

  // Moving over another column: move the card there right away so it shows up in place.
  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const from = columnOf(active.id);
    const to = columnOf(over.id);
    if (!from || !to || from === to) return;
    setColumns((prev) => {
      const task = prev[from].find((t) => t.id === active.id);
      if (!task) return prev;
      const target = prev[to].filter((t) => t.id !== task.id);
      const overIndex = target.findIndex((t) => t.id === over.id);
      target.splice(overIndex === -1 ? target.length : overIndex, 0, { ...task, status: to });
      return { ...prev, [from]: prev[from].filter((t) => t.id !== task.id), [to]: target };
    });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    // Let the click that follows the drop pass without opening the task.
    setTimeout(() => (justDragged.current = false), 0);

    const id = Number(active.id);
    const status = columnOf(active.id);
    if (!over || !status) {
      setColumns(groupByStatus(tasks));
      return;
    }

    let list = columns[status];
    const from = list.findIndex((t) => t.id === id);
    const to = list.findIndex((t) => t.id === over.id);
    if (to !== -1 && from !== to) list = arrayMove(list, from, to);
    setColumns((prev) => ({ ...prev, [status]: list }));

    const beforeId = list[list.findIndex((t) => t.id === id) + 1]?.id ?? null;
    const original = groupByStatus(tasks)[status];
    const originalIndex = original.findIndex((t) => t.id === id);
    const unchanged = originalIndex !== -1 && (original[originalIndex + 1]?.id ?? null) === beforeId;
    if (unchanged) return;

    startTransition(async () => {
      await moveTaskAction(id, { status, beforeId });
    });
  }

  function onCardClick(e: MouseEvent) {
    if (justDragged.current) e.preventDefault();
  }

  const activeTask = activeId === null ? null : tasks.find((t) => t.id === activeId);

  return (
    <DndContext
      id="board"
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setColumns(groupByStatus(tasks));
      }}
    >
      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-4">
        {STATUSES.map((status) => (
          <Column key={status} status={status} tasks={columns[status]} onCardClick={onCardClick} />
        ))}
      </div>
      <DragOverlay>{activeTask && <TaskCard task={activeTask} />}</DragOverlay>
    </DndContext>
  );
}

function Column({
  status,
  tasks,
  onCardClick,
}: {
  status: Status;
  tasks: Task[];
  onCardClick: (e: MouseEvent) => void;
}) {
  const { setNodeRef } = useDroppable({ id: status });
  return (
    <section data-testid={`column-${status}`} className="flex w-72 shrink-0 flex-col rounded-lg bg-panel/40">
      <h2 className="flex items-center gap-2 px-2 py-2 text-[13px] font-medium">
        <StatusIcon status={status} />
        {STATUS_LABELS[status]}
        <span className="text-muted">{tasks.length}</span>
      </h2>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto p-1">
          {tasks.map((task) => (
            <SortableCard key={task.id} task={task} onClick={onCardClick} />
          ))}
        </div>
      </SortableContext>
    </section>
  );
}

function SortableCard({ task, onClick }: { task: Task; onClick: (e: MouseEvent) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={isDragging ? "opacity-40" : undefined}
      {...attributes}
      {...listeners}
    >
      <TaskCard task={task} onClick={onClick} />
    </div>
  );
}
