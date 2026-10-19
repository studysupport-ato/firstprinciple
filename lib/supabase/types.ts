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
        Row: { id: string; code: string; title: string; short_title: string; description: string; department: string | null; status: ContentStatus; coming_soon: boolean; created_at: string; updated_at: string };
        Insert: { id: string; code: string; title: string; short_title: string; description: string; department?: string | null; status?: ContentStatus; coming_soon?: boolean; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["courses"]["Insert"]>;
      };
      weeks: {
        Row: { id: string; course_id: string; title: string; description: string; week_number: number; status: ContentStatus; coming_soon: boolean; created_at: string; updated_at: string };
        Insert: { id: string; course_id: string; title: string; description: string; week_number: number; status?: ContentStatus; coming_soon?: boolean; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["weeks"]["Insert"]>;
      };
      days: {
        Row: { id: string; course_id: string; week_id: string; chapter_id: string | null; title: string; description: string; order_index: number; estimated_minutes: number; objectives: Json; content_blocks: Json; status: ContentStatus; coming_soon: boolean; created_at: string; updated_at: string };
        Insert: { id: string; course_id: string; week_id: string; chapter_id?: string | null; title: string; description: string; order_index: number; estimated_minutes: number; objectives?: Json; content_blocks?: Json; status?: ContentStatus; coming_soon?: boolean; created_at?: string; updated_at?: string };
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
        Row: { id: string; name: string; short_name: string | null; description: string | null; order_index: number; status: ContentStatus; available?: boolean | null; created_at: string; updated_at: string };
        Insert: { id: string; name: string; available?: boolean | null; short_name?: string | null; description?: string | null; order_index?: number; status?: ContentStatus; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["departments"]["Insert"]>;
      };
      course_materials: {
        // entry_type, material_type, semester and parent_id arrive with migration 20261012000000; rows read before it is applied simply lack them.
        Row: { id: string; department_id: string; course_code: string | null; course_title: string; credit?: string | null; study_year: number | null; entry_type?: string | null; material_type?: string | null; semester?: number | null; parent_id?: string | null; hidden_videos?: string[] | null; outline?: unknown; extra_videos?: Array<{ videoId: string; title: string; channel?: string; kind?: "lesson" | "worked"; minutes?: number }> | null; topics?: Array<{ id: string; name: string }> | null; topic_id?: string | null; description: string | null; url: string | null; provider: string | null; order_index: number; status: ContentStatus; available?: boolean | null; created_at: string; updated_at: string };
        Insert: { id: string; department_id: string; available?: boolean | null; course_code?: string | null; course_title: string; credit?: string | null; study_year?: number | null; entry_type?: string | null; material_type?: string | null; semester?: number | null; parent_id?: string | null; hidden_videos?: string[] | null; outline?: unknown; extra_videos?: Array<{ videoId: string; title: string; channel?: string; kind?: "lesson" | "worked"; minutes?: number }> | null; topics?: Array<{ id: string; name: string }> | null; topic_id?: string | null; description?: string | null; url?: string | null; provider?: string | null; order_index?: number; status?: ContentStatus; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["course_materials"]["Insert"]>;
      };
      assets: {
        Row: { id: string; type: string; name: string; title: string | null; description: string | null; alt_text: string | null; source_kind: string; url: string; size_bytes: number | null; mime_type: string | null; width: number | null; height: number | null; duration: number | null; metadata: Json; tags: string[]; status: string; created_at: string; updated_at: string };
        Insert: { id: string; type: string; name: string; title?: string | null; description?: string | null; alt_text?: string | null; source_kind: string; url: string; size_bytes?: number | null; mime_type?: string | null; width?: number | null; height?: number | null; duration?: number | null; metadata?: Json; tags?: string[]; status?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["assets"]["Insert"]>;
      };
      students: {
        Row: { id: string; auth_user_id: string | null; display_name: string; email: string | null; phone_number: string | null; created_at: string; updated_at: string };
        Insert: { id: string; auth_user_id?: string | null; display_name: string; email?: string | null; phone_number?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["students"]["Insert"]>;
        Relationships: [];
      };
      announcements: {
        Row: { id: string; title: string; message: string; sender_id: string; created_at: string };
        Insert: { id?: string; title: string; message: string; sender_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["announcements"]["Insert"]>;
        Relationships: [];
      };
      student_announcement_reads: {
        Row: { student_id: string; announcement_id: string; read_at: string };
        Insert: { student_id: string; announcement_id: string; read_at?: string };
        Update: Partial<Database["public"]["Tables"]["student_announcement_reads"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "student_announcement_reads_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_announcement_reads_announcement_id_fkey";
            columns: ["announcement_id"];
            isOneToOne: false;
            referencedRelation: "announcements";
            referencedColumns: ["id"];
          },
        ];
      };
      email_campaigns: {
        Row: { [key: string]: unknown; id: string; idempotency_key: string; sender_id: string; subject: string; message: string; status: string; created_at: string; updated_at: string };
        Insert: { [key: string]: unknown; id?: string; idempotency_key: string; sender_id: string; subject: string; message: string; status?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["email_campaigns"]["Insert"]>;
        Relationships: [];
      };
      email_campaign_recipients: {
        Row: { [key: string]: unknown; id: string; campaign_id: string; student_id: string | null; recipient_name: string | null; recipient_email: string; status: string; provider_message_id: string | null; error_message: string | null; created_at: string; updated_at: string };
        Insert: { [key: string]: unknown; id?: string; campaign_id: string; student_id?: string | null; recipient_name?: string | null; recipient_email: string; status?: string; provider_message_id?: string | null; error_message?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["email_campaign_recipients"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "email_campaign_recipients_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "email_campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_campaign_recipients_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      student_sms_preferences: {
        Row: { student_id: string; status: "unknown" | "opted_in" | "opted_out"; consent_source: string | null; consent_reference: string | null; consent_recorded_at: string | null; consent_recorded_by: string | null; opted_out_at: string | null; opted_out_reference: string | null; updated_at: string };
        Insert: { student_id: string; status?: "unknown" | "opted_in" | "opted_out"; consent_source?: string | null; consent_reference?: string | null; consent_recorded_at?: string | null; consent_recorded_by?: string | null; opted_out_at?: string | null; opted_out_reference?: string | null; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["student_sms_preferences"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "student_sms_preferences_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: true;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      sms_campaigns: {
        Row: { id: string; idempotency_key: string; sender_id: string; sender_name: string; message: string; purpose: "educational" | "operational"; status: string; created_at: string; updated_at: string };
        Insert: { id?: string; idempotency_key: string; sender_id: string; sender_name: string; message: string; purpose: "educational" | "operational"; status?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["sms_campaigns"]["Insert"]>;
        Relationships: [];
      };
      sms_campaign_recipients: {
        Row: { id: string; campaign_id: string; student_id: string | null; recipient_name: string | null; recipient_phone: string; status: string; provider_reference: string | null; provider_status: string | null; attempt_count: number; consent_status_snapshot: "opted_in"; consent_source_snapshot: string; consent_reference_snapshot: string | null; consent_recorded_at_snapshot: string; error_message: string | null; delivery_updated_at: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; campaign_id: string; student_id?: string | null; recipient_name?: string | null; recipient_phone: string; status?: string; provider_reference?: string | null; provider_status?: string | null; attempt_count?: number; consent_status_snapshot: "opted_in"; consent_source_snapshot: string; consent_reference_snapshot?: string | null; consent_recorded_at_snapshot: string; error_message?: string | null; delivery_updated_at?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["sms_campaign_recipients"]["Insert"]>;
        Relationships: [];
      };
      sms_delivery_events: {
        Row: { id: string; callback_id: string; recipient_id: string; provider_reference: string; provider_status: string; provider_timestamp: string; received_at: string };
        Insert: { id?: string; callback_id: string; recipient_id: string; provider_reference: string; provider_status: string; provider_timestamp: string; received_at?: string };
        Update: Partial<Database["public"]["Tables"]["sms_delivery_events"]["Insert"]>;
        Relationships: [];
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
      platform_settings: {
        Row: { id: string; unlock_all_lessons_enabled: boolean; maintenance_mode_enabled: boolean; updated_at: string };
        Insert: { id: string; unlock_all_lessons_enabled?: boolean; maintenance_mode_enabled?: boolean; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["platform_settings"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_published_day_step: {
        Args: { p_course_id: string; p_week_reference: string; p_day_id: string; p_step: number | null };
        Returns: Array<{
          id: string;
          course_id: string;
          week_id: string;
          chapter_id: string | null;
          title: string;
          description: string;
          order_index: number;
          estimated_minutes: number;
          objectives: Json;
          status: ContentStatus;
          testing_mode: boolean;
          step_metadata: Json;
          content_blocks: Json;
        }>;
      };
      admin_reorder_days: { Args: { p_course_id: string; p_week_id: string; p_ordered_ids: string[] }; Returns: undefined };
      admin_reorder_course_materials: { Args: { p_department_id: string; p_ordered_ids: string[] }; Returns: undefined };
      admin_reorder_departments: { Args: { p_ordered_ids: string[] }; Returns: undefined };
      consume_password_recovery_rate_limit: {
        Args: { p_email_key: string; p_ip_key: string };
        Returns: boolean;
      };
    };
  };
};
