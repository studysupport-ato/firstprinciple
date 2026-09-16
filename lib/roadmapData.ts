export type Intensity = "LIGHT" | "MODERATE" | "INTENSE" | "PRACTICE" | "REVIEW";

export interface DayBlock {
  days: string;
  intensity: Intensity;
  title: string;
  note: string;
}

export const weeks = [
  { week: 1, days: [
    { days: "DAY 1", intensity: "LIGHT" as Intensity, title: "Real numbers: N, Z, Q, R", note: "Nested-set picture, closure, and order properties." },
    { days: "DAYS 2-3", intensity: "INTENSE" as Intensity, title: "Mathematical induction", note: "The four cases and the proof structure behind them." },
    { days: "DAY 4", intensity: "LIGHT" as Intensity, title: "Well-ordered sets", note: "One definition, one principle, and one equivalence to remember." },
    { days: "DAY 5", intensity: "PRACTICE" as Intensity, title: "Induction problem set", note: "Work through the exercises before checking the solutions." },
  ]},
  { week: 2, days: [
    { days: "DAY 1", intensity: "LIGHT" as Intensity, title: "Where complex numbers come from", note: "Addition and subtraction, made tangible first." },
    { days: "DAY 2", intensity: "MODERATE" as Intensity, title: "Unit circle, modulus, and argument", note: "Build the Argand diagram as your main tool." },
    { days: "DAY 3", intensity: "MODERATE" as Intensity, title: "Conjugate, multiplication, and division", note: "Rationalising denominators, using the same trick as surds." },
    { days: "DAYS 4-5", intensity: "INTENSE" as Intensity, title: "Polar representation", note: "A careful build-up from rectangular form to polar form." },
  ]},
  { week: 3, days: [
    { days: "DAY 1", intensity: "MODERATE" as Intensity, title: "De Moivre's theorem", note: "The engine behind the rest of this chapter." },
    { days: "DAY 2", intensity: "MODERATE" as Intensity, title: "Multiplying and dividing in polar form", note: "Angles add while moduli multiply." },
    { days: "DAY 3", intensity: "INTENSE" as Intensity, title: "Cosine identities", note: "Expand, then separate the real and imaginary parts." },
    { days: "DAY 4", intensity: "INTENSE" as Intensity, title: "Nth roots of unity", note: "One formula gives answers evenly spaced around a circle." },
    { days: "DAY 5", intensity: "INTENSE" as Intensity, title: "Polynomial roots and complex powers", note: "Close the chapter with mixed problems." },
  ]},
  { week: 4, days: [
    { days: "DAY 1", intensity: "LIGHT" as Intensity, title: "Vector basics", note: "Magnitude, direction, and displacement." },
    { days: "DAY 2", intensity: "MODERATE" as Intensity, title: "Components and unit vectors", note: "The laws of algebra, now for arrows instead of numbers." },
    { days: "DAY 3", intensity: "MODERATE" as Intensity, title: "Dot product and projection", note: "How much of one vector points along another." },
    { days: "DAYS 4-5", intensity: "INTENSE" as Intensity, title: "Cross product", note: "Perpendicular vectors, triangle areas, and direction." },
  ]},
  { week: 5, days: [
    { days: "DAYS 1-2", intensity: "INTENSE" as Intensity, title: "Linear dependence and independence", note: "Collinear, coplanar, and two ways to test for them." },
    { days: "DAYS 3-4", intensity: "INTENSE" as Intensity, title: "Lines and planes in space", note: "Vector, parametric, and symmetric equations." },
    { days: "DAY 5", intensity: "REVIEW" as Intensity, title: "Half-semester review set", note: "A mixed problem from each of the three chapters." },
  ]},
];

export const chapters = [
  { title: "Real Number Theory", description: "Number systems, order, and mathematical induction.", slug: "real-number-theory" },
  { title: "Complex Numbers I", description: "The complex plane, modulus, argument, and polar form.", slug: "complex-numbers" },
  { title: "Complex Numbers II", description: "De Moivre's theorem, roots of unity, and polynomial roots.", slug: "complex-numbers" },
  { title: "Vector Algebra I", description: "Vectors, components, dot products, projections, and cross products.", slug: "vector-algebra" },
  { title: "Vector Algebra II", description: "Linear dependence, lines, planes, and mixed review.", slug: "vector-algebra" },
];

export function lessonSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function intensityLabel(intensity: Intensity) {
  return intensity.charAt(0) + intensity.slice(1).toLowerCase();
}

export function intensityClasses(intensity: Intensity) {
  switch (intensity) {
    case "LIGHT": return "bg-[#E7F5EC] text-[#2E7D57]";
    case "MODERATE": return "bg-[#F8EFD5] text-[#8A6A1A]";
    case "INTENSE": return "bg-[#FDE5E5] text-[#B23A3A]";
    case "PRACTICE": return "bg-[#F0E9FF] text-[#6750A4]";
    case "REVIEW": return "bg-[#E7F0FF] text-[#345FC7]";
    default: return "bg-[#F5F5F5] text-[#4B5563]";
  }
}

export const lessonEntries = weeks.flatMap((week, weekIndex) =>
  week.days.map((day) => ({ slug: lessonSlug(day.title), weekIndex, title: day.title }))
);
