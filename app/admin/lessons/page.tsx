"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { AdminTable } from "@/components/admin/AdminTable";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { getAdminDaysAction, deleteDayAction, reorderDaysAction, getAdminCourseStructureAction, moveDayAction } from "@/lib/adminContentActions";
import type { AdminDayListRow, Week } from "@/lib/content/adminContract";
import Link from "next/link";

export default function AdminLessonsPage() {
  const [rows, setRows] = useState<AdminDayListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminDayListRow | null>(null);
  // 40H.2 — transfer flow: pick a destination Week (same Course only), then
  // confirm before the guarded server action runs.
  const [moveTarget, setMoveTarget] = useState<AdminDayListRow | null>(null);
  const [moveWeeks, setMoveWeeks] = useState<Week[]>([]);
  const [moveDestWeekId, setMoveDestWeekId] = useState<string | null>(null);
  const [moveConfirming, setMoveConfirming] = useState(false);

  async function loadData() {
    try {
      const result = await getAdminDaysAction();
      if (result.ok) {
        setRows(result.data);
      } else {
        setError(result.error);
      }
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Reordering is scoped to a single Week: `reorderDaysAction` renumbers only the
  // Days of the Week it is given, so each lesson must be moved within its own
  // courseId + weekId sibling list. Building the per-week id lists here keeps a
  // move from ever being sent as a cross-week reorder.
  const weekGroups = useMemo(() => {
    const groups = new Map<string, AdminDayListRow[]>();
    for (const row of rows) {
      const key = `${row.day.courseId}::${row.day.weekId}`;
      const list = groups.get(key);
      if (list) list.push(row);
      else groups.set(key, [row]);
    }
    return groups;
  }, [rows]);

  function positionInWeek(row: AdminDayListRow) {
    const group = weekGroups.get(`${row.day.courseId}::${row.day.weekId}`) ?? [];
    return { index: group.findIndex((item) => item.day.id === row.day.id), length: group.length };
  }

  async function moveDay(row: AdminDayListRow, direction: -1 | 1) {
    if (busy) return;
    const group = weekGroups.get(`${row.day.courseId}::${row.day.weekId}`) ?? [];
    const ordered = group.map((item) => item.day.id);
    const index = ordered.indexOf(row.day.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;

    const next = ordered.slice();
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);

    setBusy(true);
    const result = await reorderDaysAction(row.day.courseId, row.day.weekId, next);
    setBusy(false);
    if (result.ok) {
      setActionError(null);
      setNotice("Lesson order saved.");
      await loadData();
    } else {
      // Surface the failure and re-read so the table shows the real persisted
      // order rather than anything the UI might assume it wrote.
      setNotice(null);
      setActionError(`Could not save the new lesson order: ${result.error}`);
      await loadData();
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || busy) return;
    const target = deleteTarget;
    setBusy(true);
    const result = await deleteDayAction(target.day.courseId, target.day.weekId, target.day.id);
    setBusy(false);
    if (result.ok) {
      setDeleteTarget(null);
      setActionError(null);
      setNotice(`Lesson "${target.day.title}" was deleted.`);
      await loadData();
    } else {
      // Keep the dialog open and show the error inline instead of removing the
      // row optimistically, so the UI can never claim a delete that did not happen.
      setNotice(null);
      setActionError(`Could not delete this lesson: ${result.error}`);
    }
  }

  function weekLabel(week: Week) {
    return `Week ${week.weekNumber} — ${week.title}`;
  }

  async function startMove(row: AdminDayListRow) {
    if (busy) return;
    setNotice(null);
    setActionError(null);
    const result = await getAdminCourseStructureAction(row.day.courseId);
    if (result.ok && result.data) {
      // Destination choices come from the existing Course -> Week read path and
      // exclude the Day's current Week; Weeks of other Courses are never listed.
      setMoveWeeks(result.data.weeks.map((view) => view.week).filter((week) => week.id !== row.day.weekId));
      setMoveTarget(row);
      setMoveDestWeekId(null);
      setMoveConfirming(false);
    } else {
      setActionError(result.ok ? `Could not load Weeks for Course ${row.day.courseId}.` : `Could not load destination Weeks: ${result.error}`);
    }
  }

  function moveSummary() {
    if (!moveTarget || !moveDestWeekId) return undefined;
    const from = moveTarget.week ? weekLabel(moveTarget.week) : moveTarget.day.weekId;
    const destination = moveWeeks.find((week) => week.id === moveDestWeekId);
    const to = destination ? weekLabel(destination) : moveDestWeekId;
    return `Move "${moveTarget.day.title}" from ${from} to ${to}? The lesson content will remain unchanged.`;
  }

  async function confirmMove() {
    if (!moveTarget || !moveDestWeekId || busy) return;
    const target = moveTarget;
    const destinationWeekId = moveDestWeekId;
    const destination = moveWeeks.find((week) => week.id === destinationWeekId);
    setBusy(true);
    const result = await moveDayAction(target.day.courseId, target.day.id, destinationWeekId);
    setBusy(false);
    if (result.ok) {
      setMoveTarget(null);
      setMoveConfirming(false);
      setMoveDestWeekId(null);
      setMoveWeeks([]);
      setActionError(null);
      setNotice(destination ? `Lesson moved to ${weekLabel(destination)}.` : "Lesson moved.");
      await loadData();
    } else {
      // Keep the truth visible: close only the confirm step, re-read the table,
      // and surface the server error instead of claiming a move that failed.
      setMoveConfirming(false);
      setNotice(null);
      setActionError(`Could not move this lesson: ${result.error}`);
      await loadData();
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Lessons"
        description="Manage the teaching sessions (Days) powering each course. Reorder, move between Weeks, or delete lessons here; the order students see on the roadmap is stored on the Day itself."
        actionLabel="Create lesson"
        actionHref="/admin/lessons/new"
      />

      {notice ? <div className="mb-5 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-sm font-semibold text-[#166534]">{notice}</div> : null}
      {actionError ? <div role="alert" className="mb-5 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-sm font-semibold text-[#991B1B]">{actionError}</div> : null}

      {loading && <div className="mt-8 text-center text-sm text-[#666666]">Loading lessons...</div>}
      {error && <div className="mt-8 text-center text-sm text-red-500">{error}</div>}
      {!loading && !error && (
        <AdminTable
          columns={[
            {
              key: "title",
              label: "Lesson title",
              render: (row) => (
                <Link href={`/admin/lessons/${row.day.id}`} className="font-medium text-[#111111] transition-colors hover:text-[#2563EB]">
                  {row.day.title}
                </Link>
              ),
            },
            {
              key: "course",
              label: "Course",
              render: (row) => row.course ? row.course.code : row.day.courseId,
            },
            {
              key: "week",
              label: "Week",
              render: (row) => row.week ? `Week ${row.week.weekNumber}` : row.day.weekId,
            },
            {
              key: "status",
              label: "Status",
              render: (row) => <AdminStatusBadge status={row.day.status ?? "draft"} />,
            },
            {
              key: "actions",
              label: "Actions",
              render: (row) => {
                const { index, length } = positionInWeek(row);
                const isFirst = index <= 0;
                const isLast = index < 0 || index >= length - 1;
                return (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={busy || isFirst}
                      onClick={() => moveDay(row, -1)}
                      aria-label={`Move ${row.day.title} up`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#E5E5E5] bg-white text-sm font-semibold text-[#111111] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={busy || isLast}
                      onClick={() => moveDay(row, 1)}
                      aria-label={`Move ${row.day.title} down`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#E5E5E5] bg-white text-sm font-semibold text-[#111111] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => startMove(row)}
                      aria-label={`Move ${row.day.title} to another week`}
                      className="inline-flex items-center gap-1 rounded-full border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-semibold text-[#111111] hover:border-[#2563EB] disabled:opacity-40"
                    >
                      Move to week
                    </button>
                    <Link
                      href={`/admin/lessons/${row.day.id}`}
                      className="inline-flex items-center gap-1 rounded-full bg-[#111111] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2563EB]"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setDeleteTarget(row)}
                      aria-label={`Delete ${row.day.title}`}
                      className="inline-flex items-center gap-1 rounded-full border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-1.5 text-xs font-semibold text-[#B91C1C] hover:bg-[#FEE2E2] disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                );
              },
            },
          ]}
          rows={rows}
          emptyMessage="No lessons yet"
          emptyDescription="New lessons created for the curriculum will appear here."
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete lesson"
        description={
          deleteTarget
            ? `Delete "${deleteTarget.day.title}"? Its resource links and student progress records are removed too, and the remaining lessons in this week are renumbered.`
            : "Delete this lesson?"
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={!!moveTarget && !moveConfirming}
        title="Move lesson"
        description={
          moveTarget
            ? `"${moveTarget.day.title}" — current week: ${moveTarget.week ? weekLabel(moveTarget.week) : moveTarget.day.weekId}. Choose a destination Week from the same Course.`
            : undefined
        }
        confirmLabel="Move lesson"
        confirmDisabled={!moveDestWeekId}
        onConfirm={() => setMoveConfirming(true)}
        onCancel={() => {
          setMoveTarget(null);
          setMoveWeeks([]);
          setMoveDestWeekId(null);
          setMoveConfirming(false);
        }}
      >
        {moveWeeks.length === 0 ? (
          <p className="mt-4 text-sm text-[#666666]">This Course has no other Weeks to move this lesson into.</p>
        ) : (
          <fieldset className="mt-4">
            <legend className="field-label mb-2">Move to</legend>
            <div className="flex flex-col gap-2">
              {moveWeeks.map((week) => (
                <label
                  key={week.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${moveDestWeekId === week.id ? "border-[#111111] bg-[#F5F5F5]" : "border-[#E5E5E5] bg-white"}`}
                >
                  <input
                    type="radio"
                    name="move-destination-week"
                    checked={moveDestWeekId === week.id}
                    onChange={() => setMoveDestWeekId(week.id)}
                    className="accent-[#111111]"
                  />
                  <span className="font-medium text-[#111111]">{weekLabel(week)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={!!moveTarget && moveConfirming}
        title="Move lesson?"
        description={moveSummary()}
        confirmLabel="Move lesson"
        onConfirm={confirmMove}
        onCancel={() => setMoveConfirming(false)}
      />
    </div>
  );
}
