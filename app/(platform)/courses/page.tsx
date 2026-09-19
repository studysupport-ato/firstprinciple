"use client";

import { AnimatedItem } from "@/components/motion/AnimatedItem";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { getCourses } from "@/lib/content/access";
import { getContinueLearning, getCourseCompletion } from "@/lib/progress";

export default function CourseLibraryPage() {
  const courses = getCourses();
  const [completedLessons, setCompletedLessons] = useState<Record<string, { percent: number; resumeLesson: string }>>({});

  useEffect(() => {
    setCompletedLessons(Object.fromEntries(courses.map((course) => {
      const completion = getCourseCompletion(course.id);
      const next = getContinueLearning(course.id);
      return [course.id, {
        percent: completion.percent,
        resumeLesson: next
          ? `${next.status === "in_progress" ? "Resume" : "Begin"}: ${next.lessonTitle}`
          : "Course content coming soon",
      }];
    })));
  }, []);

  const activeCourses = courses.map((course) => {
    const info = completedLessons[course.id] ?? { percent: 0, resumeLesson: "Loading…" };

    return {
      ...course,
      progress: info.percent,
      resumeLesson: info.resumeLesson,
      href: `/courses/${course.id}/roadmap`,
    };
  });

  return (
    <div className="p-8 md:p-16 max-w-[1200px] mx-auto">
      
      {/* Header */}
      <div className="mb-16">
        <AnimatedItem>
          <h1 className="editorial-heading text-4xl md:text-5xl mb-4">Course Library</h1>
          <p className="editorial-body max-w-2xl text-[#666666]">
            Your enrolled programs and available curriculum for the academic year.
          </p>
        </AnimatedItem>
      </div>

      {/* Active Courses */}
      <div className="mb-20">
        <AnimatedItem delay={0.1}>
          <div className="flex items-center gap-3 mb-6">
            <BookOpen size={18} className="text-[#111111]" />
            <h2 className="font-sans font-semibold text-lg text-[#111111]">Active Enrollment</h2>
          </div>
        </AnimatedItem>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {activeCourses.map((course, index) => (
            <AnimatedItem key={course.id} index={index} delay={0.2} direction="up" distance={20}>
              <Link href={course.href} className="block group">
                <div className="bg-white border border-[#E5E5E5] rounded-2xl p-8 shadow-sm transition-all duration-300 hover:border-[#2563EB] hover:shadow-md">
                  
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-sans text-xs font-bold tracking-widest uppercase text-[#2563EB]">
                      {course.code}
                    </span>
                    <span className="font-sans text-xs font-medium text-[#666666]">
                      {course.progress}% Complete
                    </span>
                  </div>

                  <h3 className="font-serif text-3xl text-[#111111] mb-4 group-hover:text-[#2563EB] transition-colors">
                    {course.title}
                  </h3>
                  
                  <p className="font-sans text-sm text-[#666666] leading-relaxed mb-8">
                    {course.description}
                  </p>

                  {/* Progress Bar */}
                  <div className="h-1.5 w-full bg-[#F7F7F8] rounded-full overflow-hidden mb-6">
                    <div 
                      className="h-full bg-[#2563EB] rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-[#E5E5E5] pt-6">
                    <span className="font-sans text-sm font-medium text-[#111111]">
                      {course.resumeLesson}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-[#F7F7F8] flex items-center justify-center group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
                      <ArrowRight size={14} />
                    </div>
                  </div>

                </div>
              </Link>
            </AnimatedItem>
          ))}
        </div>
      </div>

      {activeCourses.length === 0 ? <div className="rounded-2xl border border-dashed border-[#E5E5E5] p-8 text-sm text-[#666666]">No courses are available in the local curriculum yet.</div> : null}

      {/* Upcoming Curriculum */}
      <div>
        <AnimatedItem delay={0.3}>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="font-sans font-semibold text-lg text-[#111111]">Upcoming Curriculum</h2>
          </div>
        </AnimatedItem>

        <div className="rounded-2xl border border-dashed border-[#E5E5E5] p-6 text-sm text-[#666666]">Additional curriculum will appear here when it is added to the shared local content model.</div>
      </div>

    </div>
  );
}
