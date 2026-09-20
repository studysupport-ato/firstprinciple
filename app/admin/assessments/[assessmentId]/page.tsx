"use client";

import { ArrowLeft, Check, Copy, Eye, Plus, RefreshCcw, Save, Trash2, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { getAssessmentRuleLabel, getAssessmentRulePools, getAssessmentTotalMarks, validateAssessmentDraft } from "@/lib/assessment/builder";
import { selectAssessmentQuestions } from "@/lib/assessment/selection";
import type { Assessment, AssessmentBlueprintRule } from "@/lib/content/types/assessment";
import type { Difficulty, QuestionType } from "@/lib/content/types/question";
import { createStableId } from "@/lib/ids";
import { createAssessmentAction, getAdminAssessmentAction, updateAssessmentAction } from "@/lib/adminContentActions";

const blankRule = (): AssessmentBlueprintRule => ({ topic: "", difficulty: "mixed", count: 1, tags: [] });

function createBlankAssessment(): Assessment {
  return {
    id: createStableId("math151-assessment"),
    courseId: "math-151",
    title: "New assessment",
    description: "Describe what this assessment measures.",
    durationMinutes: 20,
    questionCount: 1,
    status: "draft",
    blueprint: { rules: [blankRule()] },
  };
}

function cloneAssessment(assessment: Assessment): Assessment {
  return JSON.parse(JSON.stringify(assessment)) as Assessment;
}

export default function AdminAssessmentEditorPage() {
  const router = useRouter();
  const params = useParams();
  const assessmentId = Array.isArray(params.assessmentId) ? params.assessmentId[0] : (params.assessmentId as string | undefined) ?? "";
  const isNew = assessmentId === "new";
  
  const [draft, setDraft] = useState<Assessment | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewQuestionIds, setPreviewQuestionIds] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      if (isNew) {
        setDraft(createBlankAssessment());
      } else {
        const res = await getAdminAssessmentAction(assessmentId);
        if (res.ok && res.data) {
          setDraft(cloneAssessment(res.data));
        } else {
          setDraft(createBlankAssessment());
        }
      }
    }
    load();
  }, [isNew, assessmentId]);

  if (!draft) return null;

  const totalQuestions = draft.blueprint.rules.reduce((total, rule) => total + (Number.isFinite(rule.count) ? rule.count : 0), 0);
  const assessmentForPreview = { ...draft, questionCount: totalQuestions };
  const pools = getAssessmentRulePools(assessmentForPreview);
  const totalMarks = getAssessmentTotalMarks(assessmentForPreview);

  function updateAssessment<K extends keyof Assessment>(field: K, value: Assessment[K]) {
    setDraft((current) => current ? ({ ...current, [field]: value }) : null);
  }

  function updateRule(index: number, patch: Partial<AssessmentBlueprintRule>) {
    setDraft((current) => current ? ({
      ...current,
      blueprint: {
        rules: current.blueprint.rules.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, ...patch } : rule)),
      },
    }) : null);
  }

  function addRule() {
    setDraft((current) => current ? ({ ...current, blueprint: { rules: [...current.blueprint.rules, blankRule()] } }) : null);
  }

  function removeRule(index: number) {
    setDraft((current) => current ? ({ ...current, blueprint: { rules: current.blueprint.rules.filter((_, ruleIndex) => ruleIndex !== index) } }) : null);
  }

  function notify(text: string) {
    setMessage(text);
    window.clearTimeout((notify as unknown as { timer?: number }).timer);
    (notify as unknown as { timer?: number }).timer = window.setTimeout(() => setMessage(null), 2600);
  }

  async function saveDraft() {
    if (!draft) return;
    const normalized: Assessment = { ...draft, questionCount: totalQuestions, status: draft.status ?? "draft" };
    const errors = validateAssessmentDraft(normalized);
    if (errors.length > 0) {
      notify(errors[0]);
      return;
    }

    const action = isNew ? createAssessmentAction : updateAssessmentAction;
    const res = await action(normalized);
    
    if (res.ok) {
      setDraft(cloneAssessment(res.data));
      notify("Assessment saved.");
      if (isNew || res.data.id !== assessmentId) {
        router.replace(`/admin/assessments/${res.data.id}`);
      } else {
        router.refresh();
      }
    } else {
      notify(res.error || "Failed to save assessment");
    }
  }

  async function revertDraft() {
    if (isNew) {
      setDraft(createBlankAssessment());
    } else {
      const res = await getAdminAssessmentAction(assessmentId);
      if (res.ok && res.data) {
        setDraft(cloneAssessment(res.data));
      } else {
        setDraft(createBlankAssessment());
      }
    }
    setPreviewQuestionIds([]);
    notify("Reverted to saved version.");
  }

  async function duplicateDraft() {
    if (!draft) return;
    const duplicate = cloneAssessment(draft);
    duplicate.id = createStableId("assessment-copy", duplicate.title);
    duplicate.status = "draft";
    duplicate.title = `${duplicate.title} Copy`;
    duplicate.questionCount = duplicate.blueprint.rules.reduce((total, rule) => total + rule.count, 0);
    
    const res = await createAssessmentAction(duplicate);
    if (res.ok) {
      setDraft(cloneAssessment(res.data));
      router.push(`/admin/assessments/${res.data.id}`);
    } else {
      notify(res.error || "Failed to duplicate");
    }
  }

  function previewAssessment() {
    if (!draft) return;
    const normalized: Assessment = { ...draft, questionCount: totalQuestions };
    const errors = validateAssessmentDraft(normalized);
    if (errors.length > 0) {
      notify(errors[0]);
      return;
    }

    try {
      setPreviewQuestionIds(selectAssessmentQuestions(normalized, { includeDraft: true }).map((question) => question.id));
      setPreviewMode(true);
      notify("Preview generated from the current question bank.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to generate assessment preview.");
      setPreviewQuestionIds([]);
      setPreviewMode(true);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isNew ? "Create assessment" : "Edit assessment"}
        description="Assemble an assessment from reusable question criteria. Selection and randomization remain in the shared assessment engine."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Assessments", href: "/admin/assessments" }, { label: isNew ? "New" : draft.title }]}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/assessments" className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#111111] hover:border-[#111111]"><ArrowLeft size={15} />Back to assessments</Link>
        <button type="button" onClick={previewAssessment} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#111111] hover:border-[#111111]"><Eye size={15} />Preview</button>
        <button type="button" onClick={duplicateDraft} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#111111] hover:border-[#111111]"><Copy size={15} />Duplicate</button>
        <button type="button" onClick={revertDraft} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#111111] hover:border-[#111111]"><RefreshCcw size={15} />Revert</button>
      </div>

      {message ? <div className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] px-4 py-3 text-sm text-[#111111]">{message}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
          <div className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-[#111111]"><span className="field-label">Assessment ID</span><input value={draft.id} onChange={(event) => updateAssessment("id", event.target.value)} disabled={!isNew} className="admin-input disabled:bg-[#F7F7F8]" /></label>
              <label className="space-y-2 text-sm text-[#111111]"><span className="field-label">Course ID</span><input value={draft.courseId} onChange={(event) => updateAssessment("courseId", event.target.value)} className="admin-input" /></label>
            </div>
            <label className="space-y-2 text-sm text-[#111111]"><span className="field-label">Title</span><input value={draft.title} onChange={(event) => updateAssessment("title", event.target.value)} className="admin-input" /></label>
            <label className="space-y-2 text-sm text-[#111111]"><span className="field-label">Description</span><textarea value={draft.description} onChange={(event) => updateAssessment("description", event.target.value)} rows={3} className="admin-input" /></label>
            <label className="max-w-xs space-y-2 text-sm text-[#111111]"><span className="field-label">Time limit in minutes</span><input type="number" min={1} value={draft.durationMinutes} onChange={(event) => updateAssessment("durationMinutes", Number(event.target.value) || 1)} className="admin-input" /></label>
              <label className="max-w-xs space-y-2 text-sm text-[#111111]"><span className="field-label">Lifecycle status</span><select value={draft.status ?? "draft"} onChange={(event) => updateAssessment("status", event.target.value as Assessment["status"])} className="admin-input"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>

            <div className="border-t border-[#E5E5E5] pt-5">
              <div className="mb-4 flex items-center justify-between gap-3"><div><div className="field-label">Question distribution</div><p className="mt-1 text-sm text-[#666666]">Each rule selects matching questions from the resolved bank.</p></div><button type="button" onClick={addRule} className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white"><Plus size={14} />Add rule</button></div>
              <div className="space-y-4">
                {draft.blueprint.rules.map((rule, index) => (
                  <div key={index} className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-4">
                    <div className="mb-3 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[0.16em] text-[#666666]">Rule {index + 1}</span><button type="button" onClick={() => removeRule(index)} className="text-xs font-semibold uppercase tracking-[0.14em] text-[#666666] hover:text-[#111111]">Remove</button></div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="space-y-2 text-sm text-[#111111]"><span className="field-label">Topic</span><input value={rule.topic ?? ""} onChange={(event) => updateRule(index, { topic: event.target.value })} placeholder="complex-numbers" className="admin-input" /></label>
                      <label className="space-y-2 text-sm text-[#111111]"><span className="field-label">Subtopic</span><input value={rule.subtopic ?? ""} onChange={(event) => updateRule(index, { subtopic: event.target.value })} placeholder="modulus" className="admin-input" /></label>
                      <label className="space-y-2 text-sm text-[#111111]"><span className="field-label">Chapter ID</span><input value={rule.chapterId ?? ""} onChange={(event) => updateRule(index, { chapterId: event.target.value })} className="admin-input" /></label>
                      <label className="space-y-2 text-sm text-[#111111]"><span className="field-label">Lesson ID</span><input value={rule.lessonId ?? ""} onChange={(event) => updateRule(index, { lessonId: event.target.value })} className="admin-input" /></label>
                      <label className="space-y-2 text-sm text-[#111111]"><span className="field-label">Difficulty</span><select value={rule.difficulty ?? "mixed"} onChange={(event) => updateRule(index, { difficulty: event.target.value as Difficulty | "mixed" })} className="admin-input"><option value="mixed">Mixed</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
                      <label className="space-y-2 text-sm text-[#111111]"><span className="field-label">Question type</span><select value={rule.type ?? ""} onChange={(event) => updateRule(index, { type: (event.target.value || undefined) as QuestionType | undefined })} className="admin-input"><option value="">Any type</option><option value="multiple-choice">Multiple choice</option><option value="numerical">Numerical</option><option value="true-false">True / false</option><option value="short-answer">Short answer</option></select></label>
                      <label className="space-y-2 text-sm text-[#111111]"><span className="field-label">Tags, comma separated</span><input value={(rule.tags ?? []).join(", ")} onChange={(event) => updateRule(index, { tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} className="admin-input" /></label>
                      <label className="space-y-2 text-sm text-[#111111]"><span className="field-label">Count</span><input type="number" min={1} value={rule.count} onChange={(event) => updateRule(index, { count: Number(event.target.value) || 0 })} className="admin-input" /></label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
            <div className="mb-4 flex items-center justify-between"><div className="field-label">Live summary</div><AdminStatusBadge status={draft.status ?? "draft"} /></div>
            <div className="grid grid-cols-3 gap-3"><div className="rounded-2xl bg-[#F7F7F8] p-3"><div className="field-label">Questions</div><div className="mt-2 font-serif text-3xl text-[#111111]">{totalQuestions}</div></div><div className="rounded-2xl bg-[#F7F7F8] p-3"><div className="field-label">Marks</div><div className="mt-2 font-serif text-3xl text-[#111111]">{totalMarks}</div></div><div className="rounded-2xl bg-[#F7F7F8] p-3"><div className="field-label">Rules</div><div className="mt-2 font-serif text-3xl text-[#111111]">{draft.blueprint.rules.length}</div></div></div>
          </section>

          <section className="rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
            <div className="mb-4 field-label">Question pool preview</div>
            <div className="space-y-3">{pools.map((pool, index) => <div key={index} className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-4"><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-[#111111]">{getAssessmentRuleLabel(pool.rule, index)}</span>{pool.available >= pool.rule.count ? <Check size={16} className="text-[#059669]" /> : <XCircle size={16} className="text-[#E11D48]" />}</div><div className="mt-2 text-xs text-[#666666]">Required: {pool.rule.count} · Available: {pool.available}</div>{pool.available < pool.rule.count ? <div className="mt-2 text-xs font-semibold text-[#E11D48]">Insufficient question pool</div> : null}</div>)}</div>
          </section>

          {previewMode ? <section className="rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]"><div className="mb-3 field-label">Assessment preview</div><h2 className="font-serif text-2xl text-[#111111]">{draft.title}</h2><p className="mt-2 text-sm text-[#666666]">{draft.description}</p><div className="mt-4 text-sm text-[#111111]">{previewQuestionIds.length ? `${previewQuestionIds.length} questions generated by the assessment engine.` : "No question set could be generated from the current blueprint."}</div></section> : null}

          <button type="button" onClick={saveDraft} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#111111] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2563EB]"><Save size={15} />Save changes</button>
        </aside>
      </div>
    </div>
  );
}
