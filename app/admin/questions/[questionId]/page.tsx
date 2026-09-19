"use client";

import { ArrowLeft, Check, Copy, Eye, RefreshCcw, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { getQuestion, validateQuestion } from "@/lib/content/access";
import { getLocalQuestionOverride, removeQuestionOverride, removeQuestionRecord, saveQuestionOverride } from "@/lib/content/overrides";
import type { Question, QuestionOption, QuestionStatus, QuestionType } from "@/lib/content/types/question";
import { createStableId } from "@/lib/ids";

function cloneData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function createBlankQuestion(): Question {
  return {
    id: createStableId("math151-custom"),
    courseId: "math-151",
    chapterId: "complex-numbers",
    lessonId: "math151-argand-plane",
    topic: "complex-numbers",
    subtopic: "modulus",
    type: "multiple-choice",
    prompt: "New question prompt",
    options: [
      { id: "a", label: "A", text: "Option A" },
      { id: "b", label: "B", text: "Option B" },
      { id: "c", label: "C", text: "Option C" },
      { id: "d", label: "D", text: "Option D" },
    ],
    correctAnswer: "a",
    explanation: "Explain why the answer is correct.",
    hint: "Provide a helpful hint.",
    difficulty: "easy",
    marks: 1,
    tags: ["custom"],
    metadata: { source: "authored", status: "draft", author: "Admin" },
  };
}

function buildDraft(questionId: string): Question {
  if (questionId === "new") {
    return createBlankQuestion();
  }

  const baseQuestion = getQuestion(questionId);
  const localOverride = getLocalQuestionOverride(questionId);
  return localOverride?.question ?? cloneData(baseQuestion ?? createBlankQuestion());
}

export default function AdminQuestionEditorPage() {
  const router = useRouter();
  const params = useParams();
  const questionId = Array.isArray(params.questionId) ? params.questionId[0] : (params.questionId as string | undefined) ?? "";
  const isNew = questionId === "new";
  const baseQuestion = useMemo(() => {
    if (isNew) {
      return createBlankQuestion();
    }

    return getQuestion(questionId) ?? createBlankQuestion();
  }, [isNew, questionId]);

  const [draft, setDraft] = useState<Question>(() => buildDraft(questionId));
  const [message, setMessage] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const localOverrideExists = !!getLocalQuestionOverride(draft.id);

  function triggerMessage(text: string) {
    setMessage(text);
    window.clearTimeout((triggerMessage as unknown as { timer?: number }).timer);
    (triggerMessage as unknown as { timer?: number }).timer = window.setTimeout(() => setMessage(null), 2200);
  }

  function updateDraft<K extends keyof Question>(field: K, value: Question[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateOption(optionId: string, field: keyof QuestionOption, value: string) {
    setDraft((current) => ({
      ...current,
      options: (current.options ?? []).map((option) => (option.id === optionId ? { ...option, [field]: value } : option)),
    }));
  }

  function addOption() {
    const nextLetter = "abcdefghijklmnopqrstuvwxyz"[(draft.options?.length ?? 0) % 26] ?? "z";
    const optionId = createStableId(`option-${nextLetter}`);

    setDraft((current) => ({
      ...current,
      options: [...(current.options ?? []), { id: optionId, label: optionId.toUpperCase(), text: `Option ${((current.options?.length ?? 0) + 1)}` }],
    }));
  }

  function removeOption(optionId: string) {
    setDraft((current) => ({
      ...current,
      options: (current.options ?? []).filter((option) => option.id !== optionId),
    }));
  }

  function updateCorrectAnswer(value: string) {
    setDraft((current) => ({
      ...current,
      correctAnswer: current.type === "multiple-choice" ? value : value === "true",
    }));
  }

  function saveDraft(nextStatus?: QuestionStatus) {
    const normalizedDraft: Question = {
      ...draft,
      metadata: {
        ...draft.metadata,
        status: (nextStatus ?? draft.metadata?.status ?? "draft") as QuestionStatus,
        source: draft.metadata?.source ?? "authored",
      },
    };

    const errors = validateQuestion(normalizedDraft);
    if (errors.length > 0) {
      triggerMessage(errors[0]);
      return;
    }

    saveQuestionOverride({
      questionId: normalizedDraft.id,
      updatedAt: new Date().toISOString(),
      question: normalizedDraft,
    });
    setMessage("Question saved locally.");
    router.refresh();
  }

  function revertDraft() {
    const target = isNew ? createBlankQuestion() : baseQuestion;
    setDraft(cloneData(target));
    removeQuestionOverride(target.id);
    setMessage("Local override removed.");
  }

  function duplicateDraft() {
    const duplicate = cloneData(draft);
    duplicate.id = createStableId("question-copy", duplicate.prompt);
    duplicate.metadata = { ...(duplicate.metadata ?? {}), status: "draft", source: "authored", author: "Admin" };
    setDraft(duplicate);
    router.push(`/admin/questions/${duplicate.id}`);
  }

  function archiveDraft() {
    const archived: Question = { ...draft, metadata: { ...(draft.metadata ?? {}), status: "archived" } };
    setDraft(archived);
    saveDraft("archived");
  }

  function deleteDraft() {
    if (isNew) {
      router.push("/admin/questions");
      return;
    }

    setConfirmDelete(true);
  }

  function confirmDeleteDraft() {
    removeQuestionOverride(draft.id);
    removeQuestionRecord(draft.id);
    setConfirmDelete(false);
    triggerMessage("Question deleted.");
    router.push("/admin/questions");
  }

  const questionTypeOptions: QuestionType[] = ["multiple-choice", "numerical", "true-false", "short-answer"];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isNew ? "Create question" : "Edit question"}
        description="Keep this authoring flow local to the browser and preserve the single shared question model used by teaching and assessment."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Questions", href: "/admin/questions" }, { label: isNew ? "New" : draft.id }]}
      />

      <ConfirmDialog open={confirmDelete} title="Delete question" description="Delete this question from the course bank?" confirmLabel="Delete" onConfirm={confirmDeleteDraft} onCancel={() => setConfirmDelete(false)} />

      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/questions" className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#111111] hover:border-[#111111]">
          <ArrowLeft size={15} />
          Back to bank
        </Link>

        <button type="button" onClick={() => setPreviewMode((current) => !current)} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#111111] hover:border-[#111111]">
          <Eye size={15} />
          {previewMode ? "Hide preview" : "Preview"}
        </button>

        <button type="button" onClick={duplicateDraft} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#111111] hover:border-[#111111]">
          <Copy size={15} />
          Duplicate
        </button>

        <button type="button" onClick={archiveDraft} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#111111] hover:border-[#111111]">
          <Trash2 size={15} />
          Archive
        </button>

        <button type="button" onClick={deleteDraft} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#111111] hover:border-[#111111] hover:text-[#E11D48]">
          <Trash2 size={15} />
          Delete
        </button>

        <button type="button" onClick={revertDraft} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#111111] hover:border-[#111111]">
          <RefreshCcw size={15} />
          Revert
        </button>
      </div>

      {message ? (
        <div className="flex items-center gap-2 rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] px-4 py-3 text-sm text-[#111111]">
          <Check size={15} className="text-[#059669]" />
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
          <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-[#111111]">
                <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Question ID</span>
                <input value={draft.id} onChange={(event) => updateDraft("id", event.target.value)} className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#111111] outline-none" />
              </label>

              <label className="space-y-2 text-sm text-[#111111]">
                <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Status</span>
                <select
                  value={draft.metadata?.status ?? "draft"}
                  onChange={(event) =>
                    updateDraft("metadata", {
                      ...(draft.metadata ?? {}),
                      status: event.target.value as QuestionStatus,
                    })
                  }
                  className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#111111] outline-none"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
            </div>

            <label className="space-y-2 text-sm text-[#111111]">
              <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Prompt</span>
              <textarea value={draft.prompt} onChange={(event) => updateDraft("prompt", event.target.value)} rows={4} className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#111111] outline-none" />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-[#111111]">
                <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Course ID</span>
                <input value={draft.courseId} onChange={(event) => updateDraft("courseId", event.target.value)} className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#111111] outline-none" />
              </label>

              <label className="space-y-2 text-sm text-[#111111]">
                <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Lesson ID</span>
                <input value={draft.lessonId} onChange={(event) => updateDraft("lessonId", event.target.value)} className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#111111] outline-none" />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-[#111111]">
                <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Chapter ID</span>
                <input value={draft.chapterId} onChange={(event) => updateDraft("chapterId", event.target.value)} className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#111111] outline-none" />
              </label>

              <label className="space-y-2 text-sm text-[#111111]">
                <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Type</span>
                <select value={draft.type} onChange={(event) => updateDraft("type", event.target.value as QuestionType)} className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#111111] outline-none">
                  {questionTypeOptions.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2 text-sm text-[#111111]">
                <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Topic</span>
                <input value={draft.topic} onChange={(event) => updateDraft("topic", event.target.value)} className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#111111] outline-none" />
              </label>

              <label className="space-y-2 text-sm text-[#111111]">
                <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Subtopic</span>
                <input value={draft.subtopic} onChange={(event) => updateDraft("subtopic", event.target.value)} className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#111111] outline-none" />
              </label>

              <label className="space-y-2 text-sm text-[#111111]">
                <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Difficulty</span>
                <select value={draft.difficulty} onChange={(event) => updateDraft("difficulty", event.target.value as Question["difficulty"])} className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#111111] outline-none">
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-[#111111]">
                <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Marks</span>
                <input type="number" min={1} value={draft.marks} onChange={(event) => updateDraft("marks", Number(event.target.value) || 1)} className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#111111] outline-none" />
              </label>

              <label className="space-y-2 text-sm text-[#111111]">
                <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Tags</span>
                <input value={draft.tags.join(", ")} onChange={(event) => updateDraft("tags", event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean))} className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#111111] outline-none" />
              </label>
            </div>

            {draft.type === "multiple-choice" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Answer choices</div>
                  <button type="button" onClick={addOption} className="rounded-full bg-[#111111] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white">Add option</button>
                </div>

                <div className="space-y-3">
                  {(draft.options ?? []).map((option) => (
                    <div key={option.id} className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Option {option.label}</div>
                        <button type="button" onClick={() => removeOption(option.id)} className="text-xs font-semibold uppercase tracking-[0.14em] text-[#666666] hover:text-[#111111]">Remove</button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-[90px_1fr]">
                        <label className="space-y-2 text-sm text-[#111111]">
                          <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">ID</span>
                          <input value={option.id} onChange={(event) => updateOption(option.id, "id", event.target.value)} className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111] outline-none" />
                        </label>

                        <label className="space-y-2 text-sm text-[#111111]">
                          <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Text</span>
                          <input value={option.text} onChange={(event) => updateOption(option.id, "text", event.target.value)} className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111] outline-none" />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <label className="space-y-2 text-sm text-[#111111]">
                  <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Correct answer option ID</span>
                  <input value={String(draft.correctAnswer)} onChange={(event) => updateCorrectAnswer(event.target.value)} className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#111111] outline-none" />
                </label>
              </div>
            ) : (
              <label className="space-y-2 text-sm text-[#111111]">
                <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Correct answer</span>
                <input value={String(draft.correctAnswer ?? "")} onChange={(event) => updateCorrectAnswer(event.target.value)} className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#111111] outline-none" />
              </label>
            )}

            <label className="space-y-2 text-sm text-[#111111]">
              <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Explanation</span>
              <textarea value={draft.explanation} onChange={(event) => updateDraft("explanation", event.target.value)} rows={4} className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#111111] outline-none" />
            </label>

            <label className="space-y-2 text-sm text-[#111111]">
              <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Hint</span>
              <textarea value={draft.hint ?? ""} onChange={(event) => updateDraft("hint", event.target.value)} rows={2} className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#111111] outline-none" />
            </label>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
            <div className="mb-4 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Question status</div>
            <div className="mb-4 flex items-center gap-2">
              <AdminStatusBadge status={localOverrideExists ? "Local override" : (draft.metadata?.status ?? "draft")} />
            </div>

            <div className="space-y-3 text-sm text-[#666666]">
              <p>Shared question model: one canonical source with local overrides stored in browser storage.</p>
              <p>Edits here affect the student-facing practice and assessment flow without rewriting the TypeScript source.</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
            <div className="mb-4 flex items-center justify-between">
              <div className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Preview</div>
              {previewMode ? <span className="text-xs text-[#059669]">Visible</span> : <span className="text-xs text-[#666666]">Hidden</span>}
            </div>

            {previewMode ? (
              <div className="space-y-4 rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-4 text-sm text-[#111111]">
                <div className="font-semibold text-[#111111]">{draft.prompt}</div>
                {draft.type === "multiple-choice" && draft.options ? (
                  <div className="space-y-2">
                    {draft.options.map((option) => (
                      <div key={option.id} className="rounded-xl border border-[#E5E5E5] bg-white px-3 py-2">
                        {option.label}. {option.text}
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-[#666666]">
                  Correct answer: {String(draft.correctAnswer)}
                </div>

                <div className="rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-[#666666]">
                  {draft.explanation}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#E5E5E5] bg-[#F7F7F8] p-8 text-center text-sm text-[#666666]">
                Toggle preview to inspect the question before saving.
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
            <button type="button" onClick={() => saveDraft()} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#111111] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2563EB]">
              <Save size={15} />
              Save local changes
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
