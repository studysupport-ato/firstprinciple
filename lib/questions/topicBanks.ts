/**
 * Question-bank-only courses.
 *
 * Some courses exist only to hold practice questions (no weeks, days or
 * lessons). Their questions all share one practice chapter and are grouped
 * into topics through the question's `topic` field. The Questions page shows
 * a tile per topic for these courses instead of jumping straight into
 * practice, and the Course library and Dashboard leave them out because they
 * have no lessons to study.
 */
export interface TopicBank {
  /** The chapter id every question in the bank is stored under. */
  chapterId: string;
  /** Topic names in display order (tiles are numbered in this order). */
  topics: string[];
  /**
   * A topic whose questions are grouped further by `subtopic` (shown as
   * sub-tiles), e.g. the "Uncertain" topic keeps its original topic headings.
   */
  groupedTopic?: string;
  groupedTopicNote?: string;
  /**
   * Every topic opens tiles for its subtopics (in this order) instead of
   * going straight into practice.
   */
  subtopics?: Record<string, string[]>;
  /** The course also has lessons, so it stays in the Course library and Dashboard. */
  hasLessons?: boolean;
}

export const TOPIC_BANKS: Record<string, TopicBank> = {
  "engl-157": {
    chapterId: "engl-157-question-bank",
    topics: [
      "Sentences",
      "Spelling",
      "Paragraph",
      "Punctuation",
      "Comm Skills Errors",
      "Concord in English",
      "Word Classes",
      "Tenses & Verb Forms",
      "Vocabulary & Word Choice",
      "Idioms & Phrasal Verbs",
      "Word Formation & Borrowed Words",
      "Summary Writing & Note-taking",
      "Comprehension",
      "Uncertain",
    ],
    groupedTopic: "Uncertain",
    groupedTopicNote: "Answers worth checking with your lecturer",
  },
  "math-151": {
    chapterId: "math-151-past-questions",
    hasLessons: true,
    topics: [
      "Real Numbers & Fields",
      "Complex Numbers",
      "Trig Identities via De Moivre",
      "Matrices",
      "Determinants & Inverses",
      "Systems of Equations & Rank",
      "Eigenvalues & Linear Maps",
      "Vectors",
      "Lines & Planes",
    ],
    subtopics: {
      "Real Numbers & Fields": ["Fields"],
      "Complex Numbers": ["Equality and Cartesian form", "Polar and exponential form", "De Moivre's theorem", "Roots of complex numbers"],
      "Trig Identities via De Moivre": ["Multiple angles", "Powers of sine and cosine"],
      Matrices: ["Matrix algebra", "Special matrices"],
      "Determinants & Inverses": ["Minors and determinants", "Inverse and adjoint"],
      "Systems of Equations & Rank": ["Rank and consistency", "Row reduction", "Vector spaces"],
      "Eigenvalues & Linear Maps": ["Characteristic equation", "Eigenvalues and eigenvectors", "Linear transformations"],
      Vectors: ["Dot and cross products", "Triple products", "Linear independence and coplanarity"],
      "Lines & Planes": ["Lines", "Planes", "Intersections"],
    },
  },
  "me-161": {
    chapterId: "me-161-question-bank",
    topics: ["Forces in 2D", "Forces in 3D", "Particle equilibrium", "Moments", "Trusses", "Friction"],
  },
};

export function getTopicBank(courseId: string): TopicBank | undefined {
  return TOPIC_BANKS[courseId];
}

export function isQuestionBankOnlyCourse(courseId: string): boolean {
  return Object.prototype.hasOwnProperty.call(TOPIC_BANKS, courseId) && !TOPIC_BANKS[courseId].hasLessons;
}
