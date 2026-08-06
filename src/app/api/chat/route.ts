import { NextResponse } from "next/server";
import {
  checkAvailability,
  calculatePrice,
  createBooking,
  SPECIAL_SERVICES,
  type CreateBookingResult,
} from "@/lib/booking-data";

type Message = {
  id: number;
  sender: "user" | "bot";
  text: string;
};

const ROOM_ID_ENUM = ["mist-cabin", "canopy-suite", "plantation-villa"] as const;
const SPECIAL_SERVICE_ID_ENUM = SPECIAL_SERVICES.map((service) => service.id);

// Hidden "VIP guest" detection: matches a guest identifying themselves as
// Fahmida anywhere in their own messages, case-insensitively, on a word
// boundary so it doesn't false-positive on unrelated text (e.g. a
// different name that merely starts with the same letters). Computed once
// per request from the full message history — see isVipGuest in POST.
const VIP_GUEST_NAME_PATTERN = /\bfahmida\b/i;

function detectVipGuest(messages: Message[]): boolean {
  return messages.some(
    (message) => message.sender === "user" && VIP_GUEST_NAME_PATTERN.test(message.text),
  );
}

const SYSTEM_PROMPT = `You are the Estate Concierge for The Highland Estate, a luxury coffee plantation resort. Your ONLY job is to assist guests with questions about The Highland Estate, including room options, resort amenities, dining, coffee plantation tours, location, and booking inquiries.

Strict Rules:

If the user asks a question unrelated to The Highland Estate, its features, or resort hospitality, DO NOT answer their question.

For any off-topic or irrelevant questions, reply strictly with: 'I am here to assist you only with details about The Highland Estate. Please feel free to ask me about our rooms, amenities, or plantation experiences!'

Keep your replies polite, warm, and concise.

When a guest wants to check room availability, get pricing, or make a booking, use the provided tools. Room ids are exactly: mist-cabin (The Mist Cabin), canopy-suite (The Canopy Suite), plantation-villa (The Plantation Villa). Always confirm availability and price with the guest before calling create_booking. Dates must be in YYYY-MM-DD format.

Pacing — don't ask for the guest's name (or email) right away. Let the first exchange or two be about whatever they actually came to ask — rooms, amenities, availability, pricing, plantation experiences. Ask for her name and email naturally once you actually need them for something concrete, e.g. right before calling create_booking, or once the conversation has had a couple of back-and-forths and it genuinely makes sense to ask. This should read as normal conversational pacing, not a rule you're following — never mention that you're waiting or say things like "I'll ask for your name later."

Formatting:

Use bullet points whenever you present multiple pieces of info — room options, price breakdowns, booking confirmations, amenity lists, availability results. Do not write these as a run-on paragraph.

Keep plain conversational text (greetings, clarifying questions, small talk) as normal sentences — only bullet actual multi-item info, never a single-sentence reply.

Use a light touch of emojis where they naturally match the content — 🏡 for rooms, 📅 for dates, 💰 for pricing, ✅ for a confirmed booking, ❌ or 😕 when something's unavailable. Use them to help scanning, not on every sentence or bullet.`;

const SPECIAL_SERVICES_LIST = SPECIAL_SERVICES.map(
  (service) =>
    `- ${service.title} (id: "${service.id}", normally ₹${service.price.toLocaleString("en-IN")}): ${service.description}`,
).join("\n");

// Hidden "VIP guest" mode — appended to the base SYSTEM_PROMPT above (never
// replaces it) only when detectVipGuest() finds "Fahmida" in the guest's
// own messages. The base prompt is untouched by this addition, so every
// other guest's conversation is built from the exact same SYSTEM_PROMPT
// string as before this feature existed. Because isVipGuest is recomputed
// fresh from the full message history on every request, this addition is
// present starting with the very first request where her name appears —
// including the reply to that same message — not just later turns.
//
// TAWSIF: insert your own personal message to Fahmida here — this is the
// warmer, more personal tone the concierge should carry when speaking
// with her specifically. Keep the concierge-appropriate framing around it
// intact; the placeholder line below is just a stand-in for your wording.
const VIP_GUEST_PROMPT_ADDITION = `
VIP Guest Mode — Fahmida:

You have recognized this guest as Fahmida. Do not treat this as a discount applied to an otherwise normal reply — she is the most important guest the estate has ever hosted, and every reply to her should read that way, not just the parts about price.

How to write to her:
- Use her name naturally more than once across your reply — not just as an opening greeting, but woven into how you address her (e.g. "For you, Fahmida..." / "I think you'll love this, Fahmida..."). It should feel like she's being spoken to personally, not just addressed once and then handled generically. Never force it in so often that it feels robotic.
- Be noticeably more descriptive and attentive than your usual concise style — give her a small, vivid sense of the room, the plantation, the moment (the mist over the canopy, the quiet of a private deck at dusk), not just a features list. Still keep it readable, not a wall of text.
- Be proactive, not just responsive. Don't wait for her to ask what's available — suggest ONE, maybe two, specific services that fit the moment (e.g. the private candlelit dinner for an evening stay, the sunset plantation walk for a scenic one), rather than only mentioning generically that "services are available."
- A generous host offers thoughtfully, not indiscriminately. Suggesting a service is proactive and welcome; silently attaching every available service to her booking is not — it reads as dumping the whole menu on her rather than actually choosing something for her. Only include a special service in create_booking if she has clearly said yes to it, exactly like you would for any other guest.
- Still follow the bullet-point formatting rules above for genuine multi-item info (room lists, price breakdowns) — but let the sentences around those bullets feel personal and warm, not clinical.

// TAWSIF: insert your own personal message here — a line or two in your own words to her. It should read as coming from you, not a generic AI compliment. Place it naturally early in your first reply to her, so it's one of the first things she reads.

On comping — her room and any special services she actually requests during this conversation are entirely complimentary. Still show what the stay and any services would normally cost (the tools return this automatically), so the gesture reads as generous rather than looking like a pricing error. Never state a price of "$0" without also making clear it's complimentary and why.

Special services you can thoughtfully suggest to her, at no cost if she wants them:
${SPECIAL_SERVICES_LIST}

Overall tone: warmer, more elevated, and more personal than your usual concierge voice — but still coherent as a resort concierge speaking with a guest, not a private message. She should finish reading and feel like the most cared-for guest the estate has ever hosted.
`;

const VIP_SYSTEM_PROMPT = `${SYSTEM_PROMPT}\n${VIP_GUEST_PROMPT_ADDITION}`;

// The tool spec, kept once in its simplest (Gemini-native, flat) shape.
// Groq/OpenAI's nested {type:"function", function:{...}} wrapper is derived
// from this at the point of use (see toGroqMessages) rather than maintained
// as a second hand-written copy that could drift from this one.
const TOOL_DECLARATIONS = [
  {
    name: "check_availability",
    description: "Check whether a room is available for a given date range.",
    parameters: {
      type: "object",
      properties: {
        roomId: { type: "string", enum: ROOM_ID_ENUM },
        checkIn: { type: "string", description: "Check-in date, YYYY-MM-DD" },
        checkOut: { type: "string", description: "Check-out date, YYYY-MM-DD" },
      },
      required: ["roomId", "checkIn", "checkOut"],
    },
  },
  {
    name: "calculate_price",
    description: "Calculate the total price for a stay, including seasonal adjustments and any requested special services.",
    parameters: {
      type: "object",
      properties: {
        roomId: { type: "string", enum: ROOM_ID_ENUM },
        checkIn: { type: "string", description: "Check-in date, YYYY-MM-DD" },
        checkOut: { type: "string", description: "Check-out date, YYYY-MM-DD" },
        guests: { type: "number", description: "Number of guests" },
        specialServiceIds: {
          type: "array",
          items: { type: "string", enum: SPECIAL_SERVICE_ID_ENUM },
          description: "Ids of any special services/add-ons to include, e.g. a candlelit dinner or spa session.",
        },
      },
      required: ["roomId", "checkIn", "checkOut", "guests"],
    },
  },
  {
    name: "create_booking",
    description: "Create a booking after availability and price have been confirmed with the guest.",
    parameters: {
      type: "object",
      properties: {
        roomId: { type: "string", enum: ROOM_ID_ENUM },
        checkIn: { type: "string", description: "Check-in date, YYYY-MM-DD" },
        checkOut: { type: "string", description: "Check-out date, YYYY-MM-DD" },
        guests: { type: "number", description: "Number of guests" },
        guestName: { type: "string", description: "Guest's full name" },
        guestEmail: { type: "string", description: "Guest's email address" },
        specialServiceIds: {
          type: "array",
          items: { type: "string", enum: SPECIAL_SERVICE_ID_ENUM },
          description: "Ids of any special services/add-ons to include, e.g. a candlelit dinner or spa session.",
        },
      },
      required: ["roomId", "checkIn", "checkOut", "guests", "guestName", "guestEmail"],
    },
  },
];

// `isVipGuest` is the ONLY place VIP status reaches the booking data layer,
// and it only ever sets `comped` — never something the model's tool-call
// arguments control. calculate_price/create_booking accept specialServiceIds
// from the model for any guest; only this server-computed flag can comp them.
function executeTool(
  name: string,
  args: Record<string, unknown>,
  isVipGuest: boolean,
): unknown {
  switch (name) {
    case "check_availability":
      return checkAvailability(
        args.roomId as string,
        args.checkIn as string,
        args.checkOut as string,
      );
    case "calculate_price":
      return calculatePrice(
        args.roomId as string,
        args.checkIn as string,
        args.checkOut as string,
        args.guests as number,
        {
          specialServiceIds: args.specialServiceIds as string[] | undefined,
          comped: isVipGuest,
        },
      );
    case "create_booking":
      return createBooking({
        roomId: args.roomId as string,
        checkIn: args.checkIn as string,
        checkOut: args.checkOut as string,
        guests: args.guests as number,
        guestName: args.guestName as string,
        guestEmail: args.guestEmail as string,
        specialServiceIds: args.specialServiceIds as string[] | undefined,
        comped: isVipGuest,
      });
    default:
      return { error: `Unknown tool "${name}".` };
  }
}

// Shapes a create_booking outcome into the response fields, independent of
// whether the model ever got a chance to talk about it.
function bookingOutcomeFields(
  outcome: CreateBookingResult,
):
  | { bookingConfirmation: Extract<CreateBookingResult, { bookingId: string }>["confirmation"] }
  | { bookingError: string } {
  if ("error" in outcome) {
    return { bookingError: outcome.error };
  }
  return { bookingConfirmation: outcome.confirmation };
}

// ---------------------------------------------------------------------------
// Provider-neutral conversation representation.
//
// Groq (OpenAI-style `messages`) and Gemini (`contents`/`parts`) use
// incompatible wire formats, and a fallback from one to the other can
// happen mid-turn (round 1 answered by Groq, round 2 needs Gemini once
// Groq's quota is confirmed exhausted). Rather than juggle two divergent
// histories, the tool-calling loop in POST accumulates state in this one
// canonical shape, and each provider only converts it to/from its own wire
// format at the moment of the call — see toGroqMessages/toGeminiContents
// and parseGroqChoice/parseGeminiParts below.
// ---------------------------------------------------------------------------

type CanonicalPart =
  | { type: "text"; text: string }
  | { type: "functionCall"; id: string; name: string; args: Record<string, unknown> }
  | { type: "functionResponse"; id: string; name: string; response: unknown };

type CanonicalTurn = {
  role: "user" | "model";
  parts: CanonicalPart[];
};

function toGroqMessages(systemPrompt: string, turns: CanonicalTurn[]): unknown[] {
  const groqMessages: unknown[] = [{ role: "system", content: systemPrompt }];

  for (const turn of turns) {
    const functionResponses = turn.parts.filter(
      (part): part is Extract<CanonicalPart, { type: "functionResponse" }> =>
        part.type === "functionResponse",
    );

    if (functionResponses.length > 0) {
      for (const part of functionResponses) {
        groqMessages.push({
          role: "tool",
          tool_call_id: part.id,
          content: JSON.stringify(part.response),
        });
      }
      continue;
    }

    const functionCalls = turn.parts.filter(
      (part): part is Extract<CanonicalPart, { type: "functionCall" }> =>
        part.type === "functionCall",
    );
    const text = turn.parts
      .filter((part): part is Extract<CanonicalPart, { type: "text" }> => part.type === "text")
      .map((part) => part.text)
      .join("");

    if (turn.role === "user") {
      groqMessages.push({ role: "user", content: text });
    } else if (functionCalls.length > 0) {
      groqMessages.push({
        role: "assistant",
        content: text || null,
        tool_calls: functionCalls.map((part) => ({
          id: part.id,
          type: "function",
          function: { name: part.name, arguments: JSON.stringify(part.args) },
        })),
      });
    } else {
      groqMessages.push({ role: "assistant", content: text });
    }
  }

  return groqMessages;
}

function toGeminiContents(turns: CanonicalTurn[]): unknown[] {
  return turns.map((turn) => ({
    role: turn.role,
    parts: turn.parts.map((part) => {
      if (part.type === "text") return { text: part.text };
      if (part.type === "functionCall") {
        return { functionCall: { name: part.name, args: part.args } };
      }
      return { functionResponse: { name: part.name, response: part.response } };
    }),
  }));
}

type ParsedTurn = {
  turn: CanonicalTurn;
  functionCalls: { id: string; name: string; args: Record<string, unknown> }[];
};

function parseGroqChoice(choice: {
  message?: {
    content?: string | null;
    tool_calls?: { id: string; function: { name: string; arguments: string } }[];
  };
}): ParsedTurn {
  const text = choice.message?.content ?? "";
  const functionCalls = (choice.message?.tool_calls ?? []).map((toolCall) => {
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(toolCall.function.arguments);
    } catch {
      args = {};
    }
    return { id: toolCall.id, name: toolCall.function.name, args };
  });

  const parts: CanonicalPart[] = [];
  if (text) parts.push({ type: "text", text });
  for (const call of functionCalls) {
    parts.push({ type: "functionCall", id: call.id, name: call.name, args: call.args });
  }

  return { turn: { role: "model", parts }, functionCalls };
}

let geminiCallCounter = 0;

// Gemini doesn't assign ids to function calls the way Groq does — it just
// matches functionResponse parts to functionCall parts by name and order.
// We still synthesize an id per call so the canonical representation has
// one consistent shape regardless of which provider produced the turn;
// Gemini's own wire format never sees this id (see toGeminiContents).
function parseGeminiParts(
  parts: { text?: string; functionCall?: { name: string; args: Record<string, unknown> } }[],
): ParsedTurn {
  const canonicalParts: CanonicalPart[] = [];
  const functionCalls: ParsedTurn["functionCalls"] = [];

  for (const part of parts) {
    if (typeof part.text === "string") {
      canonicalParts.push({ type: "text", text: part.text });
    } else if (part.functionCall) {
      const id = `gemini_call_${Date.now()}_${geminiCallCounter++}`;
      functionCalls.push({ id, name: part.functionCall.name, args: part.functionCall.args });
      canonicalParts.push({
        type: "functionCall",
        id,
        name: part.functionCall.name,
        args: part.functionCall.args,
      });
    }
  }

  return { turn: { role: "model", parts: canonicalParts }, functionCalls };
}

// ---------------------------------------------------------------------------
// Groq
// ---------------------------------------------------------------------------

async function callGroqOnce(groqMessages: unknown[]) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: groqMessages,
      tools: TOOL_DECLARATIONS.map((tool) => ({ type: "function", function: tool })),
      tool_choice: "auto",
    }),
  });

  if (response.ok) {
    return { ok: true as const, data: await response.json() };
  }

  const errorText = await response.text();
  console.error("Groq API error:", response.status, errorText);

  let code: string | undefined;
  try {
    code = JSON.parse(errorText)?.error?.code;
  } catch {
    // Non-JSON error body — leave code undefined, treated as non-retryable below.
  }

  return { ok: false as const, code };
}

const MAX_TOOL_CALL_RETRIES = 2;

// Groq's Llama tool-calling occasionally emits malformed native function-call
// syntax (e.g. `<function=create_booking={...}></function>` instead of a
// proper tool_calls entry), which Groq's own parser rejects with a 400
// "tool_use_failed" — this is transient model flakiness, not a real failure;
// the same request reliably succeeds on an immediate retry. Every other
// failure code (rate_limit_exceeded, invalid_api_key, etc.) is NOT retried
// here — retrying those would just waste calls — and the code is returned
// to the caller so POST can decide what to do (e.g. fall back to Gemini on
// a rate limit) instead of collapsing every failure into the same signal.
async function callGroq(groqMessages: unknown[]) {
  let lastResult: Awaited<ReturnType<typeof callGroqOnce>> | null = null;

  for (let attempt = 0; attempt <= MAX_TOOL_CALL_RETRIES; attempt++) {
    const result = await callGroqOnce(groqMessages);
    if (result.ok) {
      return result;
    }
    lastResult = result;
    if (result.code !== "tool_use_failed" || attempt === MAX_TOOL_CALL_RETRIES) {
      return result;
    }
  }

  return lastResult as { ok: false; code: string | undefined };
}

// ---------------------------------------------------------------------------
// Gemini — the fallback provider, used only once Groq's daily quota is
// confirmed exhausted for this request (see useGemini in POST).
// ---------------------------------------------------------------------------

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function callGeminiOnce(systemPrompt: string, contents: unknown[]) {
  const response = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY ?? "",
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
    }),
  });

  if (response.ok) {
    return { ok: true as const, data: await response.json() };
  }

  const errorText = await response.text();
  console.error("Gemini API error:", response.status, errorText);

  let status: string | undefined;
  try {
    status = JSON.parse(errorText)?.error?.status;
  } catch {
    // Non-JSON error body — leave status undefined, treated as non-retryable below.
  }

  return { ok: false as const, status };
}

const MAX_TRANSIENT_RETRIES = 2;
// Gemini status codes worth an immediate retry — genuinely transient server-
// side hiccups. RESOURCE_EXHAUSTED (quota) is deliberately excluded: retrying
// a quota error just burns more of a budget that isn't coming back this
// minute, so it's surfaced to the caller as-is instead.
const RETRYABLE_GEMINI_STATUSES = new Set(["UNAVAILABLE", "INTERNAL"]);

async function callGemini(systemPrompt: string, contents: unknown[]) {
  let lastResult: Awaited<ReturnType<typeof callGeminiOnce>> | null = null;

  for (let attempt = 0; attempt <= MAX_TRANSIENT_RETRIES; attempt++) {
    const result = await callGeminiOnce(systemPrompt, contents);
    if (result.ok) {
      return result;
    }
    lastResult = result;
    if (
      !result.status ||
      !RETRYABLE_GEMINI_STATUSES.has(result.status) ||
      attempt === MAX_TRANSIENT_RETRIES
    ) {
      return result;
    }
  }

  return lastResult as { ok: false; status: string | undefined };
}

const RATE_LIMIT_REPLY =
  "The Estate Concierge is getting a lot of requests right now and has reached its limit for the moment. Please try again in a few minutes.";
const GENERIC_FAILURE_REPLY = "I'm having trouble connecting right now. Please try again shortly.";

export async function POST(request: Request) {
  const { messages } = (await request.json()) as { messages: Message[] };

  // Computed once per request from the full message history, then reused
  // for every round of this request — see detectVipGuest above.
  const isVipGuest = detectVipGuest(messages);
  const systemPrompt = isVipGuest ? VIP_SYSTEM_PROMPT : SYSTEM_PROMPT;

  const turns: CanonicalTurn[] = messages.map((message) => ({
    role: message.sender === "user" ? "user" : "model",
    parts: [{ type: "text", text: message.text }],
  }));

  // Set as soon as create_booking runs, so its outcome survives even if the
  // round cap trips before the model gets to talk about it.
  let bookingOutcome: CreateBookingResult | null = null;

  // Groq has priority. Once a round hits Groq's rate limit, this flips to
  // true and stays true for the rest of THIS request — Groq's daily quota
  // won't recover mid-turn, so there's no point re-checking it every round.
  // The next separate request (the guest's next message) starts fresh and
  // tries Groq first again, exactly like this one did.
  let useGemini = false;

  // Budget for tool-call rounds within this one turn. A booking turn can
  // legitimately need several in sequence (check_availability ->
  // calculate_price -> create_booking -> final reply), especially with
  // special services or a correction along the way, so this leaves real
  // headroom rather than just enough for the happy path.
  for (let i = 0; i < 10; i++) {
    let parsed: ParsedTurn;

    if (!useGemini) {
      const groqResult = await callGroq(toGroqMessages(systemPrompt, turns));

      if (groqResult.ok) {
        const choice = groqResult.data.choices?.[0];
        parsed = parseGroqChoice(choice ?? {});
      } else if (groqResult.code === "rate_limit_exceeded") {
        console.warn("Groq rate limit hit — falling back to Gemini for the rest of this turn.");
        useGemini = true;
        continue; // retry this same round immediately, now via Gemini
      } else {
        return NextResponse.json({ reply: GENERIC_FAILURE_REPLY }, { status: 502 });
      }
    } else {
      const geminiResult = await callGemini(systemPrompt, toGeminiContents(turns));

      if (geminiResult.ok) {
        const parts = geminiResult.data.candidates?.[0]?.content?.parts ?? [];
        parsed = parseGeminiParts(parts);
      } else if (geminiResult.status === "RESOURCE_EXHAUSTED") {
        // Both providers are tapped out — nothing left to fall back to.
        return NextResponse.json({ reply: RATE_LIMIT_REPLY }, { status: 503 });
      } else {
        return NextResponse.json({ reply: GENERIC_FAILURE_REPLY }, { status: 502 });
      }
    }

    if (parsed.functionCalls.length === 0) {
      const reply = parsed.turn.parts
        .filter((part): part is Extract<CanonicalPart, { type: "text" }> => part.type === "text")
        .map((part) => part.text)
        .join("");

      return NextResponse.json({
        reply,
        ...(bookingOutcome ? bookingOutcomeFields(bookingOutcome) : {}),
      });
    }

    turns.push(parsed.turn);

    const responseParts: CanonicalPart[] = parsed.functionCalls.map((call) => {
      const result = executeTool(call.name, call.args, isVipGuest);

      if (call.name === "create_booking") {
        bookingOutcome = result as CreateBookingResult;
      }

      return { type: "functionResponse", id: call.id, name: call.name, response: result };
    });

    turns.push({ role: "user", parts: responseParts });
  }

  // Round cap hit with no final plain-text reply from the model. If a
  // booking was actually created (or definitively rejected) along the way,
  // that real outcome takes priority over the generic fallback — the guest
  // should never be told "try again" when a booking already went through.
  if (bookingOutcome) {
    const reply =
      "error" in bookingOutcome
        ? "That room just became unavailable — here's what happened:"
        : "Your booking is confirmed — here are the details:";

    return NextResponse.json({
      reply,
      ...bookingOutcomeFields(bookingOutcome),
    });
  }

  return NextResponse.json(
    { reply: "I'm having trouble completing that request right now. Please try again shortly." },
    { status: 502 },
  );
}
