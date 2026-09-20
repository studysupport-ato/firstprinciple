"use client";

export default function LessonError() {
  return <div className="flex min-h-[60vh] items-center justify-center bg-white px-6 text-center"><div className="max-w-md"><p className="font-sans text-xs font-semibold uppercase tracking-[0.28em] text-[#666666]">Lesson unavailable</p><h1 className="mt-3 font-serif text-3xl text-[#111111]">This lesson could not be loaded.</h1><p className="mt-3 text-sm leading-6 text-[#666666]">The lesson service is temporarily unavailable. Please try again.</p></div></div>;
}