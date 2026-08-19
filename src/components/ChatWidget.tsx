"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ROOMS } from "@/lib/booking-data";

type SpecialServiceLine = {
  id: string;
  title: string;
  price: number;
};

type BookingConfirmation = {
  bookingId: string;
  roomTitle: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  total: number;
  guestName: string;
  guestEmail: string;
  specialServices: SpecialServiceLine[];
  specialServicesTotal: number;
  originalTotal: number;
  comped: boolean;
};

type Message = {
  id: number;
  sender: "user" | "bot";
  text: string;
  bookingConfirmation?: BookingConfirmation;
  bookingError?: string;
  isError?: boolean;
};

function roomImageForTitle(roomTitle: string): string | undefined {
  return ROOMS.find((room) => room.title === roomTitle)?.image;
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

const STORAGE_KEY = "highland-estate-chat";

const SUGGESTION_CHIPS = [
  { label: "🏡 View rooms", prompt: "What rooms do you have available?" },
  { label: "📅 Check availability", prompt: "I'd like to check availability for a stay." },
  { label: "☕ Plantation tours", prompt: "Tell me about the coffee plantation experiences." },
];

// Renders the limited markdown the system prompt actually asks the model to
// produce — "- " bullet lists and **bold** — as real HTML instead of raw
// dashes/asterisks. Not a general markdown parser; deliberately scoped to
// what the concierge's replies use.
function renderInline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${keyPrefix}-${i}`} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={`${keyPrefix}-${i}`}>{part}</span>
    ),
  );
}

function FormattedMessage({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: { type: "list" | "text"; lines: string[] }[] = [];

  for (const line of lines) {
    const isBullet = /^\s*[-*]\s+/.test(line);
    const lastBlock = blocks[blocks.length - 1];
    const type = isBullet ? "list" : "text";
    const content = isBullet ? line.replace(/^\s*[-*]\s+/, "") : line;

    if (lastBlock && lastBlock.type === type) {
      lastBlock.lines.push(content);
    } else {
      blocks.push({ type, lines: [content] });
    }
  }

  return (
    <>
      {blocks.map((block, i) =>
        block.type === "list" ? (
          <ul key={i} className="list-disc space-y-1 pl-4">
            {block.lines.map((line, j) => (
              <li key={j}>{renderInline(line, `${i}-${j}`)}</li>
            ))}
          </ul>
        ) : (
          <p key={i} className={i > 0 ? "mt-1.5" : undefined}>
            {block.lines.map((line, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {renderInline(line, `${i}-${j}`)}
              </span>
            ))}
          </p>
        ),
      )}
    </>
  );
}

function SparkleIcon({
  className,
  animated,
}: {
  className?: string;
  animated?: boolean;
}) {
  const path = (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10 2.5l1.2 3.6 3.6 1.2-3.6 1.2-1.2 3.6-1.2-3.6-3.6-1.2 3.6-1.2L10 2.5z"
    />
  );

  if (!animated) {
    return (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
        {path}
      </svg>
    );
  }

  return (
    <motion.svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={className}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: [0.55, 1, 0.55], scale: [0.9, 1.08, 0.9] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
    >
      {path}
    </motion.svg>
  );
}

function BookingConfirmationCard({
  confirmation,
}: {
  confirmation: BookingConfirmation;
}) {
  const image = roomImageForTitle(confirmation.roomTitle);
  // originalTotal equals total for any non-comped booking, so this is the
  // same number as before for every guest except a comped VIP one.
  const perNight = Math.round(confirmation.originalTotal / confirmation.nights);
  const isVip = confirmation.comped;

  const content = (
    <>
      {image && (
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          <Image
            src={image}
            alt={confirmation.roomTitle}
            fill
            sizes="260px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
          <p className="absolute bottom-2 left-3 right-3 font-lora text-base text-white">
            {confirmation.roomTitle}
          </p>
        </div>
      )}

      <div className="space-y-2.5 p-4">
        {isVip && (
          <div className="flex items-center gap-1.5">
            <SparkleIcon animated className="h-4 w-4 flex-none text-secondary" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-secondary">
              Honored Guest
            </span>
          </div>
        )}

        {!image && (
          <p className="font-lora text-base text-[#1c2a22]">
            {confirmation.roomTitle}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-[#1c2a22]/60">
          <span>
            {formatDate(confirmation.checkIn)} &rarr;{" "}
            {formatDate(confirmation.checkOut)}
          </span>
          <span>
            {confirmation.guests} guest{confirmation.guests === 1 ? "" : "s"}
          </span>
        </div>

        {confirmation.specialServices.length > 0 && (
          <div className="space-y-1 border-t border-[#4A3320]/10 pt-2.5 text-xs text-[#1c2a22]/60">
            {confirmation.specialServices.map((service) => (
              <div key={service.id} className="flex items-center justify-between gap-2">
                <span>{service.title}</span>
                {isVip ? (
                  <span className="flex flex-none items-center gap-1.5">
                    <span className="text-[#1c2a22]/30 line-through">
                      ${service.price.toLocaleString()}
                    </span>
                    <span className="text-secondary">Complimentary</span>
                  </span>
                ) : (
                  <span className="flex-none">${service.price.toLocaleString()}</span>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[#4A3320]/10 pt-2.5 text-xs text-[#1c2a22]/60">
          <span>
            {confirmation.nights} night{confirmation.nights === 1 ? "" : "s"} &middot; $
            {perNight.toLocaleString()}/night
          </span>
          {isVip ? (
            <span className="flex items-center gap-1.5">
              <span className="text-[#1c2a22]/30 line-through">
                ${confirmation.originalTotal.toLocaleString()}
              </span>
              <span className="text-sm font-medium text-secondary">Complimentary</span>
            </span>
          ) : (
            <span className="text-sm font-medium text-[#1c2a22]">
              ${confirmation.total.toLocaleString()}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between rounded-lg bg-secondary/5 px-3 py-2 text-[11px] tracking-wide text-secondary">
          <span>
            Confirmation #{confirmation.bookingId.slice(0, 8).toUpperCase()}
          </span>
          {isVip && <SparkleIcon animated className="h-4 w-4 flex-none text-secondary" />}
        </div>
      </div>
    </>
  );

  if (!isVip) {
    return (
      <div className="w-full max-w-[260px] overflow-hidden rounded-2xl border border-[#4A3320]/10 bg-white shadow-sm">
        {content}
      </div>
    );
  }

  // VIP cards get a soft gradient border (secondary → accent → secondary,
  // both existing site tokens — no new colors) plus a faint secondary-toned
  // glow, and a distinct scale+fade entrance so the moment reads as
  // different from a standard booking confirmation, not just re-colored.
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[260px] rounded-2xl bg-gradient-to-br from-secondary/70 via-accent/70 to-secondary/70 p-[1.5px] shadow-[0_6px_28px_-8px_rgba(41,68,53,0.45)]"
    >
      <div className="overflow-hidden rounded-[15px] bg-white">{content}</div>
    </motion.div>
  );
}

function BookingUnavailableNote({ message }: { message: string }) {
  return (
    <div className="flex max-w-[80%] items-start gap-2 rounded-2xl border border-[#4A3320]/10 bg-white px-4 py-2.5 text-xs text-[#1c2a22]/70 shadow-sm">
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="mt-0.5 h-4 w-4 flex-none text-secondary"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 2v3M14 2v3M3 8h14M4 4h12a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"
        />
        <path strokeLinecap="round" d="M7.5 11.5l5 5M12.5 11.5l-5 5" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

function loadStoredMessages(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as Message[]) : [];
  } catch {
    return [];
  }
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(loadStoredMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Monotonic counter for message ids — avoids calling an impure function
  // like Date.now() from within the component.
  const nextIdRef = useRef(0);
  const nextId = () => ++nextIdRef.current;

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text) return;

    const userMessage: Message = { id: nextId(), sender: "user", text };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          sender: "bot",
          text: data.reply ?? "",
          bookingConfirmation: data.bookingConfirmation,
          bookingError: data.bookingError,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          sender: "bot",
          text: "Something went wrong sending that. Please check your connection and try again.",
          isError: true,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-24 right-6 z-50 flex h-[28rem] w-80 flex-col overflow-hidden rounded-2xl bg-[#E8EDEB] shadow-2xl sm:w-96"
          >
            <div className="flex items-center justify-between bg-[#4A3320] px-5 py-4">
              <h3 className="font-lora text-lg text-white">
                Estate Concierge
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
                className="text-xl leading-none text-white/70 transition-colors hover:text-white"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                  <p className="text-sm text-[#4A3320]/50">
                    Ask us anything about your stay.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {SUGGESTION_CHIPS.map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => handleSend(chip.prompt)}
                        className="rounded-full border border-[#4A3320]/20 bg-white px-3 py-1.5 text-xs text-[#1c2a22] shadow-sm transition-colors hover:bg-[#4A3320]/5"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex flex-col gap-2 ${
                    message.sender === "user" ? "items-end" : "items-start"
                  }`}
                >
                  {message.text && (
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                        message.sender === "user"
                          ? "bg-secondary text-white"
                          : message.isError
                            ? "border border-red-200 bg-red-50 text-red-700"
                            : "bg-white text-[#1c2a22] shadow-sm"
                      }`}
                    >
                      {message.sender === "bot" ? (
                        <FormattedMessage text={message.text} />
                      ) : (
                        message.text
                      )}
                    </div>
                  )}

                  {message.bookingConfirmation && (
                    <BookingConfirmationCard
                      confirmation={message.bookingConfirmation}
                    />
                  )}

                  {message.bookingError && !message.bookingConfirmation && (
                    <BookingUnavailableNote message={message.bookingError} />
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex gap-1 rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#1c2a22]/40 [animation-delay:-0.2s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#1c2a22]/40" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#1c2a22]/40 [animation-delay:0.2s]" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2 border-t border-[#4A3320]/10 bg-[#E8EDEB] p-3"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 rounded-full border border-[#4A3320]/20 bg-white px-4 py-2 text-sm text-[#1c2a22] placeholder:text-[#1c2a22]/40 focus:outline-none focus:ring-2 focus:ring-[#4A3320]/30"
              />
              <button
                type="submit"
                className="flex-none rounded-full bg-[#4A3320] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4A3320]/90"
              >
                Send
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Toggle chat"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#4A3320] text-white shadow-lg transition-transform hover:scale-105"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
        >
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </button>
    </>
  );
}
