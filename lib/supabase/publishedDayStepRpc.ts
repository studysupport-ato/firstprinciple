import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

type PublishedDayStepArguments = {
  p_course_id: string;
  p_week_reference: string;
  p_day_id: string;
  p_step: number | null;
};

export type PublishedDayStepRow = {
  id: string;
  course_id: string;
  week_id: string;
  chapter_id: string | null;
  title: string;
  description: string;
  order_index: number;
  estimated_minutes: number;
  objectives: unknown;
  status: string;
  testing_mode: boolean;
  step_metadata: unknown;
  content_blocks: unknown;
};

export async function callPublishedDayStepRpc(
  client: SupabaseClient<Database>,
  args: PublishedDayStepArguments,
) {
  // The hand-maintained Database type lacks Supabase's generated function metadata.
  const rpc = client.rpc.bind(client) as unknown as (
    name: "get_published_day_step",
    parameters: PublishedDayStepArguments,
  ) => PromiseLike<{ data: PublishedDayStepRow[] | null; error: { message: string } | null }>;
  return rpc("get_published_day_step", args);
}
