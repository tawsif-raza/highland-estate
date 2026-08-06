import { NextResponse } from "next/server";
import {
  checkAvailability,
  calculatePrice,
  createBooking,
  type CreateBookingResult,
} from "@/lib/booking-data";

type Message = {
  id: number;
  sender: "user" | "bot";
  text: string;
};

const ROOM_ID_ENUM = ["mist-cabin", "canopy-suite", "plantation-villa"] as const;

const SYSTEM_PROMPT = `You are the Estate Concierge for The Highland Estate, a luxury coffee plantation resort. Your ONLY job is to assist guests with questions about The Highland Estate, including room options, resort amenities, dining, coffee plantation tours, location, and booking inquiries.

Strict Rules:

If the user asks a question unrelated to The Highland Estate, its features, or resort hospitality, DO NOT answer their question.

For any off-topic or irrelevant questions, reply strictly with: 'I am here to assist you only with details about The Highland Estate. Please feel free to ask me about our rooms, amenities, or plantation experiences!'

Keep your replies polite, warm, and concise.

When a guest wants to check room availability, get pricing, or make a booking, use the provided tools. Room ids are exactly: mist-cabin (The Mist Cabin), canopy-suite (The Canopy Suite), plantation-villa (The Plantation Villa). Always confirm availability and price with the guest before calling create_booking. Dates must be in YYYY-MM-DD format.

Formatting:

Use bullet points whenever you present multiple pieces of info — room options, price breakdowns, booking confirmations, amenity lists, availability results. Do not write these as a run-on paragraph.

Keep plain conversational text (greetings, clarifying questions, small talk) as normal sentences — only bullet actual multi-item info, never a single-sentence reply.

Use a light touch of emojis where they naturally match the content — 🏡 for rooms, 📅 for dates, 💰 for pricing, ✅ for a confirmed booking, ❌ or 😕 when something's unavailable. Use them to help scanning, not on every sentence or bullet.`;

const TOOLS = [
  {
    type: "function",
    function: {
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
  },
  {
    type: "function",
    function: {
      name: "calculate_price",
      description: "Calculate the total price for a stay, including seasonal adjustments.",
      parameters: {
        type: "object",
        properties: {
          roomId: { type: "string", enum: ROOM_ID_ENUM },
          checkIn: { type: "string", description: "Check-in date, YYYY-MM-DD" },
          checkOut: { type: "string", description: "Check-out date, YYYY-MM-DD" },
          guests: { type: "number", description: "Number of guests" },
        },
        required: ["roomId", "checkIn", "checkOut", "guests"],
      },
    },
  },
  {
    type: "function",
    function: {
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
        },
        required: ["roomId", "checkIn", "checkOut", "guests", "guestName", "guestEmail"],
      },
    },
  },
];

function executeTool(name: string, args: Record<string, unknown>): unknown {
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
      );
    case "create_booking":
      return createBooking({
        roomId: args.roomId as string,
        checkIn: args.checkIn as string,
        checkOut: args.checkOut as string,
        guests: args.guests as number,
        guestName: args.guestName as string,
        guestEmail: args.guestEmail as string,
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

async function callGroq(groqMessages: unknown[]) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: groqMessages,
      tools: TOOLS,
      tool_choice: "auto",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Groq API error:", response.status, errorText);
    return null;
  }

  return response.json();
}

export async function POST(request: Request) {
  const { messages } = (await request.json()) as { messages: Message[] };

  const groqMessages: unknown[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((message) => ({
      role: message.sender === "user" ? "user" : "assistant",
      content: message.text,
    })),
  ];

  // Set as soon as create_booking runs, so its outcome survives even if the
  // round cap trips before the model gets to talk about it.
  let bookingOutcome: CreateBookingResult | null = null;

  // Allow a few rounds of tool calls before returning a final reply.
  for (let i = 0; i < 4; i++) {
    const data = await callGroq(groqMessages);

    if (!data) {
      return NextResponse.json(
        { reply: "I'm having trouble connecting right now. Please try again shortly." },
        { status: 502 },
      );
    }

    const choice = data.choices?.[0];
    const toolCalls = choice?.message?.tool_calls;

    if (!toolCalls || toolCalls.length === 0) {
      const reply = choice?.message?.content ?? "";
      return NextResponse.json({
        reply,
        ...(bookingOutcome ? bookingOutcomeFields(bookingOutcome) : {}),
      });
    }

    groqMessages.push(choice.message);

    for (const toolCall of toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        args = {};
      }

      const result = executeTool(toolCall.function.name, args);

      if (toolCall.function.name === "create_booking") {
        bookingOutcome = result as CreateBookingResult;
      }

      groqMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
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
