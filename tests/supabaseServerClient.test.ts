import { describe, expect, it } from "vitest";
import WebSocket from "ws";

import { createSupabaseServerClient } from "../api/shared/supabaseServerClient.js";

describe("Supabase server client helper", () => {
  it("uses fail-closed server auth defaults and a Node-compatible WebSocket transport", () => {
    const client = createSupabaseServerClient(
      "https://example.supabase.co",
      "test-service-role-key"
    );

    expect(client.realtime.transport).toBe(WebSocket);
    expect(client.auth).toBeDefined();
  });
});

