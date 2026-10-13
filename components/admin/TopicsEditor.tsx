"use client";

import { useState } from "react";

import type { CourseMaterialEntry } from "@/lib/content/adminContract";

export type Topic = { id: string; name: string };

/** Same colours, in the same order, as the student page, so a topic looks the same on both sides. */
export const TOPIC_COLORS = ["#E9BC3A", "#E0835A", "#8FB8E8", "#7FC9A2", "#B9A4EA", "#F2A7C3", "#C9B27C", "#9AD0D6"];

const inputClass =
  "min-h-[44px] w-full rounded-xl border border-[#5A4F3A] bg-[#26231C] px-3.5 text-base text-[#F6EFDC] placeholder:text-[#8F8671] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E9BC3A]";
const smallButton = "min-h-[36px] rounded-lg px-2.5 text-[13px] font-bold transition hover:bg-[#F6EFDC]/[0.06] disabled:opacity-40";

function newTopicId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `topic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * A course's topics: add, rename, remove and reorder. Saved on the course row.
 * Removing a topic never deletes materials; they show under "Not in a topic".
 */
export function TopicsEditor({
  course,
  materials,
  busy,
  onSave,
}: {
  course: CourseMaterialEntry;
  materials: CourseMaterialEntry[];
  busy: boolean;
  onSave: (topics: Topic[], notice: string) => void;
}) {
  const topics = course.topics ?? [];
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave([...topics, { id: newTopicId(), name: trimmed }], `Topic "${trimmed}" added.`);
    setName("");
  }
  function move(index: number, by: number) {
    const target = index + by;
    if (target < 0 || target >= topics.length) return;
    const next = [...topics];
    [next[index], next[target]] = [next[target], next[index]];
    onSave(next, "Topic order saved.");
  }
  function saveRename(id: string) {
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    onSave(topics.map((topic) => (topic.id === id ? { ...topic, name: trimmed } : topic)), "Topic renamed.");
    setRenaming(null);
  }
  function remove(topic: Topic) {
    const used = materials.filter((material) => material.topicId === topic.id).length;
    const extra = used ? ` ${used} material${used === 1 ? "" : "s"} will move to "Not in a topic". Nothing is deleted.` : "";
    if (typeof window !== "undefined" && !window.confirm(`Remove the topic "${topic.name}"?${extra}`)) return;
    onSave(topics.filter((item) => item.id !== topic.id), `Topic "${topic.name}" removed.`);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#3A3428] bg-[#211E18] p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <div className="text-[17px] font-extrabold">Topics</div>
        <div className="text-[13px] text-[#C9BFA6]">Students see this course&apos;s materials grouped under these, in this order.</div>
      </div>
      {topics.length === 0 ? <p className="text-[14px] text-[#C9BFA6]">No topics yet. Add one below, e.g. Statics.</p> : null}
      <div className="flex flex-wrap gap-2.5">
        {topics.map((topic, index) => {
          const count = materials.filter((material) => material.topicId === topic.id).length;
          return (
            <div key={topic.id} className="flex flex-wrap items-center gap-1 rounded-xl border border-[#4A4232] bg-[#26231C] py-1 pl-3 pr-1">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: TOPIC_COLORS[index % TOPIC_COLORS.length] }} />
              {renaming === topic.id ? (
                <>
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") saveRename(topic.id);
                      if (event.key === "Escape") setRenaming(null);
                    }}
                    aria-label={`New name for ${topic.name}`}
                    className="ml-1 min-h-[34px] w-[160px] rounded-lg border border-[#5A4F3A] bg-[#1A1814] px-2 text-[14px] text-[#F6EFDC]"
                  />
                  <button type="button" disabled={busy} onClick={() => saveRename(topic.id)} className={`${smallButton} text-[#E9BC3A]`}>Save</button>
                  <button type="button" onClick={() => setRenaming(null)} className={`${smallButton} text-[#C9BFA6]`}>Cancel</button>
                </>
              ) : (
                <>
                  <span className="ml-1 text-[15px] font-bold">{topic.name}</span>
                  <span className="mr-1 text-[12px] text-[#C9BFA6]">{count}</span>
                  <button type="button" disabled={busy || index === 0} onClick={() => move(index, -1)} aria-label={`Move ${topic.name} earlier`} className={`${smallButton} text-[#C9BFA6]`}>←</button>
                  <button type="button" disabled={busy || index === topics.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${topic.name} later`} className={`${smallButton} text-[#C9BFA6]`}>→</button>
                  <button type="button" disabled={busy} onClick={() => { setRenaming(topic.id); setRenameValue(topic.name); }} className={`${smallButton} text-[#E9BC3A]`}>Rename</button>
                  <button type="button" disabled={busy} onClick={() => remove(topic)} className={`${smallButton} text-[#F0A798]`}>Remove</button>
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex max-w-[560px] flex-wrap gap-2.5">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && add()}
          placeholder="New topic name, e.g. Friction"
          aria-label="New topic name"
          className={`${inputClass} flex-[1_1_240px]`}
        />
        <button type="button" disabled={busy || !name.trim()} onClick={add} className="min-h-[44px] rounded-full bg-[#8F6500] px-5 text-[15px] font-bold text-[#F6EFDC] transition hover:brightness-110 disabled:opacity-50">
          Add topic
        </button>
      </div>
    </div>
  );
}

/** The Topic menu on a material row, or on the add-material form. */
export function TopicSelect({
  topics,
  value,
  onChange,
  disabled,
  label = "Topic",
}: {
  topics: Topic[];
  value: string | null | undefined;
  onChange: (topicId: string | null) => void;
  disabled?: boolean;
  label?: string;
}) {
  if (topics.length === 0) return null;
  const known = topics.some((topic) => topic.id === value);
  return (
    <select
      aria-label={label}
      disabled={disabled}
      value={known ? (value as string) : ""}
      onChange={(event) => onChange(event.target.value || null)}
      className="min-h-[44px] rounded-xl border border-[#5A4F3A] bg-[#26231C] px-3 text-[14px] font-semibold text-[#F6EFDC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E9BC3A]"
    >
      <option value="">No topic</option>
      {topics.map((topic) => (
        <option key={topic.id} value={topic.id}>
          {topic.name}
        </option>
      ))}
    </select>
  );
}
