import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.fn();
const createTransport = vi.fn(() => ({ sendMail }));

vi.mock("nodemailer", () => ({
  default: {
    createTransport,
  },
}));

const createResponse = () => {
  let statusCode = 200;
  let body: unknown;
  const headers = new Map<string, string>();

  return {
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
    get headers() {
      return headers;
    },
    setHeader(name: string, value: string) {
      headers.set(name, value);
      return this;
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: unknown) {
      body = payload;
      return this;
    },
  };
};

describe("contact notification route", () => {
  beforeEach(() => {
    process.env.GMAIL_USER = "notifications@hushh.ai";
    process.env.GMAIL_APP_PASSWORD = "app-password";
    sendMail.mockResolvedValue({ messageId: "contact-message-123" });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.GMAIL_USER;
    delete process.env.GMAIL_APP_PASSWORD;
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("sends contact form details to the Hushh recipient group", async () => {
    const { default: handler } = await import("../api/contact-notification.js");
    const req = {
      method: "POST",
      body: {
        name: "Ada Lovelace",
        email: "ada@example.com",
        company: "Analytical Engines",
        phone: "+1 555 0100",
        reason: "Investment Information",
        message: "Please send details.",
        sourcePath: "/contact",
      },
    };
    const res = createResponse();

    await handler(req, res);

    expect(createTransport).toHaveBeenCalledWith({
      service: "gmail",
      auth: {
        user: "notifications@hushh.ai",
        pass: "app-password",
      },
    });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        replyTo: "ada@example.com",
        to: "ankit@hushh.ai,manish@hushh.ai,kushal@hushh.ai,jhumma@hushh.ai",
        subject: "[HushhTech Contact] Investment Information — Ada Lovelace",
      }),
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true, emailSent: true });
  });

  it("validates required fields before sending mail", async () => {
    const { default: handler } = await import("../api/contact-notification.js");
    const res = createResponse();

    await handler({ method: "POST", body: { name: "Ada" } }, res);

    expect(res.statusCode).toBe(400);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("accepts honeypot submissions without sending mail", async () => {
    const { default: handler } = await import("../api/contact-notification.js");
    const res = createResponse();

    await handler(
      {
        method: "POST",
        body: {
          name: "Bot",
          email: "bot@example.com",
          reason: "Other",
          message: "Spam",
          website: "https://spam.example",
        },
      },
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true, spamIgnored: true });
    expect(sendMail).not.toHaveBeenCalled();
  });
});
