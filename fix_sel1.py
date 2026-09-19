import pathlib, re
p = pathlib.Path("lib/progress/selectors.ts")
t = p.read_text()
start = t.index("export interface ContinueLearningTarget {")
end = t.index("export interface PracticeStats {")
removed = t[start:end]
assert "getContinueLearning" in removed
t = t[:start] + t[end:]
p.write_text(t)
print("removed legacy block, len now", len(t))
