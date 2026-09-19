"use client";

import { ExternalLink, Library, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getPublishedCourseMaterialsDirectory, type CourseMaterialsDirectory } from "@/lib/courseMaterials";

export default function CourseMaterialsPage() {
  const [directory, setDirectory] = useState<CourseMaterialsDirectory>({ departments: [], entries: [] });
  const [query, setQuery] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDirectory(getPublishedCourseMaterialsDirectory());
    setReady(true);
  }, []);

  const filteredDepartments = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return directory.departments.map((department) => ({
      department,
      entries: directory.entries.filter((entry) => entry.departmentId === department.id && (!normalized || `${department.name} ${department.shortName ?? ""} ${entry.courseCode ?? ""} ${entry.courseTitle} ${entry.provider ?? ""}`.toLowerCase().includes(normalized))),
    })).filter(({ department, entries }) => !normalized ? true : `${department.name} ${department.shortName ?? ""}`.toLowerCase().includes(normalized) || entries.length > 0);
  }, [directory, query]);

  return (
    <div className="min-h-screen bg-[#FBFBFA] px-5 py-8 md:px-10 md:py-12">
      <div className="mx-auto max-w-[1180px]">
        <header className="mb-10 border-b border-[#E5E5E5] pb-8">
          <div className="mb-4 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#111111] text-white"><Library size={18} /></div><span className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#666666]">Academic directory</span></div>
          <h1 className="font-serif text-5xl tracking-tight text-[#111111] md:text-6xl">Course Materials</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#666666]">Browse external course-material links organized by department. First Principles provides the directory; each link opens at its original destination.</p>
        </header>

        <div className="mb-8 flex max-w-xl items-center gap-3 rounded-2xl border border-[#E5E5E5] bg-white px-4 py-3 shadow-[0_8px_24px_rgba(17,17,17,0.02)]"><Search size={17} className="shrink-0 text-[#666666]" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm text-[#111111] outline-none placeholder:text-[#999999]" placeholder="Search departments, course codes, titles or sources" aria-label="Search course materials" /></div>

        {!ready ? <div className="rounded-2xl border border-[#E5E5E5] bg-white p-8 text-sm text-[#666666]">Loading course materials...</div> : !directory.departments.length ? <div className="rounded-[28px] border border-dashed border-[#D9D9D9] bg-white p-10 text-center"><Library size={24} className="mx-auto text-[#666666]" /><h2 className="mt-4 font-serif text-3xl text-[#111111]">Course materials are being organized.</h2><p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#666666]">Published external links will appear here as the directory grows. Check back soon.</p></div> : !filteredDepartments.length ? <div className="rounded-[28px] border border-dashed border-[#D9D9D9] bg-white p-10 text-center text-sm text-[#666666]">No published course materials match that search.</div> : <div className="space-y-10">{filteredDepartments.map(({ department, entries }) => <section key={department.id} aria-labelledby={`department-${department.id}`}><div className="mb-4 flex flex-col gap-2 border-b border-[#E5E5E5] pb-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#2563EB]">{department.shortName ?? "Department"}</div><h2 id={`department-${department.id}`} className="mt-1 font-serif text-3xl text-[#111111]">{department.name}</h2></div><span className="text-xs text-[#666666]">{entries.length} material{entries.length === 1 ? "" : "s"}</span></div>{entries.length ? <div className="grid gap-4 md:grid-cols-2">{entries.map((entry) => <article key={entry.id} className="flex min-h-[190px] flex-col justify-between rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-[0_8px_24px_rgba(17,17,17,0.02)]"><div><div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]"><span>{entry.courseCode ?? "Course material"}</span>{entry.provider ? <><span className="text-[#D1D5DB]">·</span><span>{entry.provider}</span></> : null}</div><h3 className="mt-3 font-serif text-2xl leading-tight text-[#111111]">{entry.courseTitle}</h3>{entry.description ? <p className="mt-2 text-sm leading-6 text-[#666666]">{entry.description}</p> : null}</div><a href={entry.url} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 self-start text-sm font-semibold text-[#111111] hover:text-[#2563EB]">Open materials externally <ExternalLink size={14} /></a></article>)}</div> : <p className="rounded-2xl border border-dashed border-[#E5E5E5] p-5 text-sm text-[#666666]">No published materials in this department yet.</p>}</section>)}</div>}
      </div>
    </div>
  );
}
