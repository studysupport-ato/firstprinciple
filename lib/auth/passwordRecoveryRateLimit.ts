import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

type RateLimitArguments = {
  p_email_key: string;
  p_ip_key: string;
};

export async function consumePasswordRecoveryRateLimit(
  client: SupabaseClient<Database>,
  args: RateLimitArguments,
) {
  // The hand-maintained Database type does not fully satisfy Supabase's RPC type inference.
  const rpc = client.rpc.bind(client) as unknown as (
    name: "consume_password_recovery_rate_limit",
    parameters: RateLimitArguments,
  ) => PromiseLike<{ data: boolean | null; error: { message: string } | null }>;
  return rpc("consume_password_recovery_rate_limit", args);
}
