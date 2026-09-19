import type { ContentStatus } from "../lifecycle";

export type ContentBlockType =
  | "text"
  | "math"
  | "heading"
  | "worked-example"
  | "callout"
  | "image"
  | "video"
  | "interactive"
  | "question"
  | "markdown";

interface BaseContentBlock {
  id: string;
  type: ContentBlockType;
  step?: number;
}

export interface TextBlock extends BaseContentBlock {
  type: "text";
  body: string;
}

export interface MathBlock extends BaseContentBlock {
  type: "math";
  expression: string;
  display?: boolean;
}

export interface HeadingBlock extends BaseContentBlock {
  type: "heading";
  text: string;
  level?: 2 | 3 | 4;
}

export interface WorkedExampleBlock extends BaseContentBlock {
  type: "worked-example";
  title: string;
  prompt: string;
  solution: string;
}

export interface CalloutBlock extends BaseContentBlock {
  type: "callout";
  tone: "info" | "tip" | "warning";
  text: string;
}

export interface ImageBlock extends BaseContentBlock {
  type: "image";
  assetId?: string;
  src: string;
  alt: string;
  caption?: string;
}

export interface VideoBlock extends BaseContentBlock {
  type: "video";
  assetId?: string;
  src: string;
  title: string;
}

export interface GeoGebraInteractiveConfig {
  visualizer?: "geogebra";
  appName?: "graphing" | "geometry" | "3d" | "classic";
  materialId?: string;
  width?: number;
  height?: number;
  showToolbar?: boolean;
  showAlgebraInput?: boolean;
  showMenuBar?: boolean;
  showResetIcon?: boolean;
  [key: string]: unknown;
}

export interface InteractiveBlock extends BaseContentBlock {
  type: "interactive";
  provider: "geogebra" | "custom";
  config: Record<string, unknown> | GeoGebraInteractiveConfig;
}

export interface QuestionBlock extends BaseContentBlock {
  type: "question";
  questionId: string;
}

export interface MarkdownBlock extends BaseContentBlock {
  type: "markdown";
  markdown: string;
}

export type ContentBlock =
  | TextBlock
  | MathBlock
  | HeadingBlock
  | WorkedExampleBlock
  | CalloutBlock
  | ImageBlock
  | VideoBlock
  | InteractiveBlock
  | QuestionBlock
  | MarkdownBlock;

export interface Lesson {
  /** Internal content record representing a canonical Course -> Week -> Day. */
  id: string;
  courseId: string;
  chapterId: string;
  weekId: string;
  title: string;
  description: string;
  order: number;
  estimatedMinutes: number;
  objectives: string[];
  blocks: ContentBlock[];
  status?: ContentStatus;
}
