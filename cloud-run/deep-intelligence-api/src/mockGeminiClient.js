import { randomUUID } from "node:crypto";

export class MockDeepResearchClient {
  constructor() {
    this.interactions = new Map();
  }

  async startReport(payload) {
    const id = `mock-${randomUUID()}`;
    this.interactions.set(id, {
      payload,
      pollCount: 0,
    });
    return { id, status: "in_progress" };
  }

  async getReport(interactionId) {
    const record = this.interactions.get(interactionId);
    if (!record) {
      return {
        id: interactionId,
        status: "failed",
        error: { message: "Mock interaction not found" },
      };
    }

    record.pollCount += 1;
    if (record.pollCount < 2) {
      return { id: interactionId, status: "in_progress" };
    }

    const location = Object.values(record.payload.subject.location).filter(Boolean).join(", ");
    const nameSlug = record.payload.subject.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    return {
      id: interactionId,
      status: "completed",
      outputs: [
        {
          type: "text",
          text: `Mock safe summary for ${record.payload.subject.name} near ${location}. Public profile example: https://example.com/profiles/${nameSlug}. No private contact details are returned in mock mode.`,
          annotations: [{ source: `https://example.com/profiles/${nameSlug}` }],
        },
      ],
    };
  }
}
