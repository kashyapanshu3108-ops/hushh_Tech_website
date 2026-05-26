import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

export function createSupabaseServerClient(url, key, options = {}) {
  const { auth, realtime, ...rest } = options;

  return createClient(url, key, {
    ...rest,
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      ...auth,
    },
    realtime: {
      ...realtime,
      transport: realtime?.transport || WebSocket,
    },
  });
}

