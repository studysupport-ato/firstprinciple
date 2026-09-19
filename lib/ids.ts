let sequence = 0;

export function createStableId(prefix: string, label = "record") {
  sequence += 1;
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "record";
  const entropy = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID().replace(/-/g, "").slice(0, 12) : sequence.toString(36);
  return `${prefix}-${entropy}-${slug}`;
}
