import pathlib
p = pathlib.Path("lib/progress/access.ts")
t = p.read_text()
old = "  progress.courseProgress[courseId] = course;\n\n  export interface PracticeAttemptInput {"
new = "  progress.courseProgress[courseId] = course;\n\n  recordActivity(progress, courseId, \"lesson_completed\", dayId);\n  writeProgress(progress);\n}\n\nexport interface PracticeAttemptInput {"
assert old in t, "pattern missing"
p.write_text(t.replace(old, new))
print("access fixed")
