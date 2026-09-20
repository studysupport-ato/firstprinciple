/**
 * Minimal hand-maintained database type representation (Task 25).
 *
 * The schema is intentionally small and stable; this file gives future
 * repository work a typed `Database → Tables → Row/Insert/Update` shape today.
 * When the Supabase CLI becomes available, this can be replaced wholesale by
 * `npx supabase gen types typescript` output — nothing else needs to change
 * because both satisfy the same `Database` contract.
 *
 * Product/domain types in lib/content/types/* and lib/progress/types.ts remain
 * the source of truth for the application; this file only mirrors the
 * relational shape (snake_case columns) for the future data layer.
 */

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type ContentStatus = "draft" | "published" | "archived";

export type Database = {
  public: {
    Tables: {
      courses: {
        Row: { id: string; code: string; title: string; short_title: string; description: string; department: string | null; status: ContentStatus; created_at: string; updated_at: string };
        Insert: { id: string; code: string; title: string; short_title: string; description: string; department?: string | null; status?: ContentStatus; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["courses"]["Insert"]>;
      };
      weeks: {
        Row: { id: string; course_id: string; title: string; description: string; week_number: number; status: ContentStatus; created_at: string; updated_at: string };
        Insert: { id: string; course_id: string; title: string; description: string; week_number: number; status?: ContentStatus; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["weeks"]["Insert"]>;
      };
      days: {
        Row: { id: string; course_id: string; week_id: string; chapter_id: string | null; title: string; description: string; order_index: number; estimated_minutes: number; objectives: Json; content_blocks: Json; status: ContentStatus; created_at: string; updated_at: string };
        Insert: { id: string; course_id: string; week_id: string; chapter_id?: string | null; title: string; description: string; order_index: number; estimated_minutes: number; objectives?: Json; content_blocks?: Json; status?: ContentStatus; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["days"]["Insert"]>;
      };
      questions: {
        Row: { id: string; course_id: string; chapter_id: string | null; lesson_id: string | null; topic: string; subtopic: string; type: string; difficulty: string; prompt: string; options: Json | null; correct_answer: Json; explanation: string; hint: string | null; marks: number; tags: string[]; status: ContentStatus; source: string; variant_of: string | null; author: string | null; created_at: string; updated_at: string };
        Insert: { id: string; course_id: string; chapter_id?: string | null; lesson_id?: string | null; topic: string; subtopic: string; type: string; difficulty: string; prompt: string; options?: Json | null; correct_answer: Json; explanation: string; hint?: string | null; marks?: number; tags?: string[]; status?: ContentStatus; source?: string; variant_of?: string | null; author?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["questions"]["Insert"]>;
      };
      assessments: {
        Row: { id: string; course_id: string; title: string; description: string; duration_minutes: number; question_count: number; blueprint: Json; status: ContentStatus; created_at: string; updated_at: string };
        Insert: { id: string; course_id: string; title: string; description: string; duration_minutes: number; question_count: number; blueprint?: Json; status?: ContentStatus; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["assessments"]["Insert"]>;
      };
      learning_resources: {
        Row: { id: string; type: string; title: string; description: string | null; tags: string[]; data: Json; metadata: Json; status: ContentStatus; created_at: string; updated_at: string };
        Insert: { id: string; type: string; title: string; description?: string | null; tags?: string[]; data: Json; metadata?: Json; status?: ContentStatus; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["learning_resources"]["Insert"]>;
      };
      resource_placements: {
        Row: { id: string; resource_id: string; course_id: string | null; week_id: string | null; day_id: string | null; order_index: number; created_at: string; updated_at: string };
        Insert: { id: string; resource_id: string; course_id?: string | null; week_id?: string | null; day_id?: string | null; order_index?: number; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["resource_placements"]["Insert"]>;
      };
      departments: {
        Row: { id: string; name: string; short_name: string | null; description: string | null; order_index: number; status: ContentStatus; created_at: string; updated_at: string };
        Insert: { id: string; name: string; short_name?: string | null; description?: string | null; order_index?: number; status?: ContentStatus; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["departments"]["Insert"]>;
      };
      course_materials: {
        Row: { id: string; department_id: string; course_code: string | null; course_title: string; description: string | null; url: string; provider: string | null; order_index: number; status: ContentStatus; created_at: string; updated_at: string };
        Insert: { id: string; department_id: string; course_code?: string | null; course_title: string; description?: string | null; url: string; provider?: string | null; order_index?: number; status?: ContentStatus; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["course_materials"]["Insert"]>;
      };
      assets: {
        Row: { id: string; type: string; name: string; title: string | null; description: string | null; alt_text: string | null; source_kind: string; url: string; size_bytes: number | null; mime_type: string | null; width: number | null; height: number | null; duration: number | null; metadata: Json; tags: string[]; status: string; created_at: string; updated_at: string };
        Insert: { id: string; type: string; name: string; title?: string | null; description?: string | null; alt_text?: string | null; source_kind: string; url: string; size_bytes?: number | null; mime_type?: string | null; width?: number | null; height?: number | null; duration?: number | null; metadata?: Json; tags?: string[]; status?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["assets"]["Insert"]>;
      };
      students: {
        Row: { id: string; auth_user_id: string | null; display_name: string; email: string | null; created_at: string; updated_at: string };
        Insert: { id: string; auth_user_id?: string | null; display_name: string; email?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["students"]["Insert"]>;
      };
      student_day_progress: {
        Row: { student_id: string; day_id: string; course_id: string; week_id: string; status: string; started_at: string | null; completed_at: string | null; last_visited_at: string | null; time_spent_seconds: number; created_at: string; updated_at: string };
        Insert: { student_id: string; day_id: string; course_id: string; week_id: string; status?: string; started_at?: string | null; completed_at?: string | null; last_visited_at?: string | null; time_spent_seconds?: number; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["student_day_progress"]["Insert"]>;
      };
      practice_attempts: {
        Row: { id: string; student_id: string; question_id: string; course_id: string; lesson_id: string | null; answer: Json; is_correct: boolean; marks_earned: number; marks_available: number; started_at: string | null; answered_at: string | null; metadata: Json | null; created_at: string; updated_at: string };
        Insert: { id: string; student_id: string; question_id: string; course_id: string; lesson_id?: string | null; answer: Json; is_correct: boolean; marks_earned: number; marks_available: number; started_at?: string | null; answered_at?: string | null; metadata?: Json | null; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["practice_attempts"]["Insert"]>;
      };
      assessment_attempts: {
        Row: { id: string; student_id: string; assessment_id: string; course_id: string; chapter_id: string | null; answers: Json; score: number; percentage: number; marks_earned: number; marks_available: number; status: string; started_at: string | null; submitted_at: string | null; created_at: string; updated_at: string };
        Insert: { id: string; student_id: string; assessment_id: string; course_id: string; chapter_id?: string | null; answers: Json; score: number; percentage: number; marks_earned: number; marks_available: number; status?: string; started_at?: string | null; submitted_at?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["assessment_attempts"]["Insert"]>;
      };
      activity_events: {
        Row: { id: string; student_id: string; course_id: string; type: string; occurred_at: string; entity_id: string | null; metadata: Json | null; created_at: string; updated_at: string };
        Insert: { id: string; student_id: string; course_id: string; type: string; occurred_at?: string; entity_id?: string | null; metadata?: Json | null; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["activity_events"]["Insert"]>;
      };
      admin_users: {
        Row: { user_id: string; role: string; created_at: string; updated_at: string };
        Insert: { user_id: string; role?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["admin_users"]["Insert"]>;
      };
    };
  };
};
