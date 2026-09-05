"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CalendarDays, LayoutGrid, Trash2 } from "lucide-react";
import { moveApplication, removeApplication, toggleTask } from "@/lib/actions/library";
import { daysUntil, formatDate } from "@/lib/format";

export type PlannerApplication = {
  id: string;
  stage: string;
  universityName: string;
  slug: string;
  programName: string | null;
  countryName: string;
  deadline: string | null;
  tasks: { id: string; title: string; completed: boolean; dueDate: string | null }[];
};

const STAGES = [
  "RESEARCHING",
  "CONSIDERING",
  "PREPARING",
  "READY_TO_APPLY",
  "APPLIED",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "ACCEPTED",
] as const;

const STAGE_LABEL: Record<string, string> = {
  RESEARCHING: "Researching",
  CONSIDERING: "Considering",
  PREPARING: "Preparing",
  READY_TO_APPLY: "Ready to apply",
  APPLIED: "Applied",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
  ACCEPTED: "Accepted",
};

export function PlannerBoard({ applications }: { applications: PlannerApplication[] }) {
  const [items, setItems] = useState(applications);
  const [view, setView] = useState<"board" | "timeline">("board");
  const [, startTransition] = useTransition();

  const move = (id: string, stage: string) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, stage } : item)));
    startTransition(async () => {
      const result = await moveApplication(id, stage);
      if (result?.error) setItems(applications);
    });
  };

  const check = (applicationId: string, taskId: string, completed: boolean) => {
    setItems((current) =>
      current.map((item) =>
        item.id === applicationId
          ? { ...item, tasks: item.tasks.map((task) => (task.id === taskId ? { ...task, completed } : task)) }
          : item,
      ),
    );
    startTransition(async () => {
      const result = await toggleTask(taskId, completed);
      if (result?.error) setItems(applications);
    });
  };

  const drop = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
    startTransition(async () => {
      await removeApplication(id);
    });
  };

  const dated = items
    .flatMap((item) => [
      ...(item.deadline ? [{ label: `${item.universityName} — application closes`, date: item.deadline }] : []),
      ...item.tasks
        .filter((task) => task.dueDate && !task.completed)
        .map((task) => ({ label: `${task.title} — ${item.universityName}`, date: task.dueDate! })),
    ])
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <button type="button" className={view === "board" ? "btn btn-primary btn-sm" : "btn btn-sm"} onClick={() => setView("board")}>
          <LayoutGrid size={14} /> Board
        </button>
        <button type="button" className={view === "timeline" ? "btn btn-primary btn-sm" : "btn btn-sm"} onClick={() => setView("timeline")}>
          <CalendarDays size={14} /> Timeline
        </button>
      </div>

      {view === "board" ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {STAGES.map((stage) => {
            const column = items.filter((item) => item.stage === stage);
            return (
              <section key={stage} className="w-72 shrink-0">
                <header className="mb-2 flex items-baseline justify-between px-1">
                  <h2 className="text-sm">{STAGE_LABEL[stage]}</h2>
                  <span className="tabular text-xs text-mist">{column.length}</span>
                </header>
                <div className="space-y-3">
                  {column.map((item) => {
                    const done = item.tasks.filter((task) => task.completed).length;
                    const total = item.tasks.length || 1;
                    return (
                      <article key={item.id} className="panel p-4">
                        <div className="flex items-start justify-between gap-2">
                          <Link href={`/universities/${item.slug}`} className="text-sm leading-snug hover:underline">
                            {item.universityName}
                          </Link>
                          <button
                            type="button"
                            className="btn btn-ghost h-7 w-7 px-0 text-mist"
                            aria-label="Remove from planner"
                            onClick={() => drop(item.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <p className="mt-1 text-xs text-mist">
                          {item.programName ?? "Program not set"} · {item.countryName}
                        </p>

                        <div className="mt-3 flex items-center gap-2">
                          <span className="h-1.5 flex-1 rounded-full bg-parchment">
                            <span className="block h-full rounded-full bg-viridian" style={{ width: `${(done / total) * 100}%` }} />
                          </span>
                          <span className="tabular text-xs text-mist">
                            {done}/{total}
                          </span>
                        </div>

                        <details className="mt-3">
                          <summary className="cursor-pointer text-xs text-slate">Checklist</summary>
                          <ul className="mt-2 space-y-1.5">
                            {item.tasks.map((task) => (
                              <li key={task.id} className="flex items-center gap-2 text-xs">
                                <input
                                  type="checkbox"
                                  checked={task.completed}
                                  onChange={(event) => check(item.id, task.id, event.target.checked)}
                                />
                                <span className={task.completed ? "text-mist line-through" : "text-slate"}>
                                  {task.title}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </details>

                        {item.deadline && (
                          <p className="mt-3 text-xs" style={{ color: daysUntil(item.deadline) < 21 ? "var(--color-rust)" : "var(--color-mist)" }}>
                            Closes {formatDate(item.deadline)}
                          </p>
                        )}

                        <select
                          className="input mt-3 h-8 text-xs"
                          value={item.stage}
                          onChange={(event) => move(item.id, event.target.value)}
                          aria-label={`Move ${item.universityName} to another stage`}
                        >
                          {STAGES.map((option) => (
                            <option key={option} value={option}>
                              {STAGE_LABEL[option]}
                            </option>
                          ))}
                        </select>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="panel divide-y divide-[color:var(--color-line)]">
          {dated.length === 0 && <p className="p-5 text-sm text-slate">No dated items yet.</p>}
          {dated.map((entry, index) => {
            const days = daysUntil(entry.date);
            return (
              <div key={index} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                <span>{entry.label}</span>
                <span className="tabular shrink-0 text-xs" style={{ color: days < 21 ? "var(--color-rust)" : "var(--color-slate)" }}>
                  {formatDate(entry.date)} · in {days} days
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
