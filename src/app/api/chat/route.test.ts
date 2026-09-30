import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// ---------------------------------------------------------------------------
// Fetch mock plumbing — one queue per provider, keyed by URL substring, so
// each test can script exactly what each provider returns on each call
// without touching the real network. This is what let us reproduce (and now
// pin down as regression tests) the production incident: Gemini returning a
// non-quota error used to short-circuit straight to the generic failure
// message instead of falling back to Kimi/Groq, and Kimi/Groq were
// themselves unreachable (wrong endpoint / decommissioned model).
// ---------------------------------------------------------------------------

type QueueEntry = { response: unknown } | { throwError: unknown };

let geminiQueue: QueueEntry[] = [];
let kimiQueue: QueueEntry[] = [];
let groqQueue: QueueEntry[] = [];

function ok(body: unknown) {
  return { response: { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) } };
}

function fail(status: number, body: unknown) {
  return { response: { ok: false, status, json: async () => body, text: async () => JSON.stringify(body) } };
}

function failNonJson(status: number) {
  return { response: { ok: false, status, json: async () => { throw new Error("not json"); }, text: async () => "<html>Bad Gateway</html>" } };
}

function networkError() {
  return { throwError: new Error("network down") };
}

function timeoutError() {
  const err = new Error("The operation was aborted");
  err.name = "AbortError";
  return { throwError: err };
}

function geminiTextReply(text: string) {
  return ok({ candidates: [{ content: { parts: [{ text }] } }] });
}

function geminiError(status: string) {
  return fail(400, { error: { status, message: "gemini error" } });
}

function geminiFunctionCall(name: string, args: Record<string, unknown>) {
  return ok({ candidates: [{ content: { parts: [{ functionCall: { name, args } }] } }] });
}

function openAiTextReply(text: string) {
  return ok({ choices: [{ message: { content: text } }] });
}

function openAiError(errorBody: Record<string, unknown>) {
  return fail(400, { error: errorBody });
}

beforeEach(() => {
  geminiQueue = [];
  kimiQueue = [];
  groqQueue = [];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const queue = url.includes("generativelanguage.googleapis.com")
        ? geminiQueue
        : url.includes("moonshot")
          ? kimiQueue
          : url.includes("groq.com")
            ? groqQueue
            : null;

      if (!queue) throw new Error(`Unexpected fetch to ${url}`);

      const entry = queue.shift();
      if (!entry) throw new Error(`No queued mock response left for ${url}`);
      if ("throwError" in entry) throw entry.throwError;
      return entry.response;
    }),
  );
});

function chatRequest(userText: string, priorMessages: { id: number; sender: "user" | "bot"; text: string }[] = []) {
  const messages = [...priorMessages, { id: priorMessages.length + 1, sender: "user" as const, text: userText }];
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
}

describe("POST /api/chat", () => {
  it("returns the model's reply on a normal successful Gemini call", async () => {
    geminiQueue.push(geminiTextReply("Welcome to The Highland Estate!"));

    const res = await POST(chatRequest("hy"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.reply).toBe("Welcome to The Highland Estate!");
  });

  it("falls back to Kimi when Gemini fails with a non-quota error (the actual production bug)", async () => {
    // Before the fix, any Gemini status other than RESOURCE_EXHAUSTED (or a
    // missing status) returned the generic failure immediately and never
    // tried Kimi/Groq at all — this is exactly what happened in production
    // when GEMINI_API_KEY was unset, producing PERMISSION_DENIED.
    geminiQueue.push(geminiError("PERMISSION_DENIED"));
    kimiQueue.push(openAiTextReply("Hello from Kimi!"));

    const res = await POST(chatRequest("hy"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.reply).toBe("Hello from Kimi!");
  });

  it("cascades all the way to Groq when both Gemini and Kimi fail", async () => {
    geminiQueue.push(geminiError("PERMISSION_DENIED"));
    kimiQueue.push(openAiError({ type: "invalid_authentication_error", message: "bad key" }));
    groqQueue.push(openAiTextReply("Hello from Groq!"));

    const res = await POST(chatRequest("how are you?"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.reply).toBe("Hello from Groq!");
  });

  it("returns the generic failure (502) when every provider fails for a non-rate-limit reason", async () => {
    geminiQueue.push(geminiError("PERMISSION_DENIED"));
    kimiQueue.push(openAiError({ type: "invalid_authentication_error" }));
    groqQueue.push(openAiError({ code: "model_not_found" }));

    const res = await POST(chatRequest("hy"));
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.reply).toMatch(/trouble connecting/i);
  });

  it("returns the friendlier rate-limit message (503) when a provider signals quota exhaustion", async () => {
    geminiQueue.push(geminiError("RESOURCE_EXHAUSTED"));
    kimiQueue.push(openAiError({ type: "exceeded_current_quota_error" }));
    groqQueue.push(openAiError({ code: "rate_limit_exceeded" }));

    const res = await POST(chatRequest("hy"));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.reply).toMatch(/reached its limit/i);
  });

  it("does not crash when a provider's fetch throws (network error) and still falls back", async () => {
    geminiQueue.push(networkError());
    // Gemini retries transient/network failures up to MAX_TRANSIENT_RETRIES
    // times before giving up, so queue enough network errors to exhaust that.
    geminiQueue.push(networkError());
    geminiQueue.push(networkError());
    kimiQueue.push(openAiTextReply("Hello from Kimi after a network blip!"));

    const res = await POST(chatRequest("hy"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.reply).toBe("Hello from Kimi after a network blip!");
  });

  it("treats a client-side abort/timeout the same as any other transient transport failure", async () => {
    geminiQueue.push(timeoutError());
    geminiQueue.push(timeoutError());
    geminiQueue.push(timeoutError());
    kimiQueue.push(openAiTextReply("Recovered after a timeout"));

    const res = await POST(chatRequest("hy"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.reply).toBe("Recovered after a timeout");
  });

  it("does not crash when a provider returns a non-JSON error body (e.g. a raw gateway error page)", async () => {
    geminiQueue.push(failNonJson(502));
    kimiQueue.push(openAiTextReply("Hello from Kimi after a bad gateway"));

    const res = await POST(chatRequest("hy"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.reply).toBe("Hello from Kimi after a bad gateway");
  });

  it("completes a tool-call round trip (check_availability) via a single provider", async () => {
    geminiQueue.push(
      geminiFunctionCall("check_availability", {
        roomId: "mist-cabin",
        checkIn: "2026-11-01",
        checkOut: "2026-11-03",
      }),
    );
    geminiQueue.push(geminiTextReply("The Mist Cabin is available for those dates!"));

    const res = await POST(chatRequest("Is the mist cabin free Nov 1-3?"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.reply).toBe("The Mist Cabin is available for those dates!");
  });

  it("surfaces a completed booking instead of the generic failure if providers fail on a later round", async () => {
    // Round 1: Gemini calls create_booking successfully. Dates sit well beyond
    // the demo data's pre-booked windows (which are relative to "today"), so
    // this stays bookable no matter when the suite runs.
    geminiQueue.push(
      geminiFunctionCall("create_booking", {
        roomId: "mist-cabin",
        checkIn: "2027-06-01",
        checkOut: "2027-06-03",
        guests: 2,
        guestName: "Test Guest",
        guestEmail: "test@example.com",
      }),
    );
    // Round 2 (the model's follow-up "here's your confirmation" reply):
    // every provider fails. The guest must still see the booking outcome,
    // not "I'm having trouble connecting right now."
    geminiQueue.push(geminiError("PERMISSION_DENIED"));
    kimiQueue.push(openAiError({ type: "invalid_authentication_error" }));
    groqQueue.push(openAiError({ code: "model_not_found" }));

    const res = await POST(chatRequest("Book it for me"));
    const body = await res.json();

    expect(body.bookingConfirmation).toBeDefined();
    expect(body.reply).not.toMatch(/trouble connecting/i);
  });

  it("handles an empty/whitespace-only message without throwing", async () => {
    geminiQueue.push(geminiTextReply("How can I help?"));

    const res = await POST(chatRequest("   "));
    expect(res.status).toBe(200);
  });

  it("recognizes the VIP guest once their name appears anywhere in the conversation", async () => {
    geminiQueue.push(geminiTextReply("Welcome, Fahmida!"));

    const res = await POST(
      chatRequest("What rooms are available?", [{ id: 1, sender: "user", text: "Hi, this is Fahmida" }]),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.reply).toBe("Welcome, Fahmida!");
  });
});
