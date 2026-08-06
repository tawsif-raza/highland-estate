"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ROOMS } from "@/lib/booking-data";

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
};

type Message = {
  id: number;
  sender: "user" | "bot";
  text: string;
  bookingConfirmation?: BookingConfirmation;
  bookingError?: string;
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

function BookingConfirmationCard({
  confirmation,
}: {
  confirmation: BookingConfirmation;
}) {
  const image = roomImageForTitle(confirmation.roomTitle);
  const perNight = Math.round(confirmation.total / confirmation.nights);

  return (
    <div className="w-full max-w-[260px] overflow-hidden rounded-2xl border border-[#4A3320]/10 bg-white shadow-sm">
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

        <div className="flex items-center justify-between border-t border-[#4A3320]/10 pt-2.5 text-xs text-[#1c2a22]/60">
          <span>
            {confirmation.nights} night{confirmation.nights === 1 ? "" : "s"} &middot; $
            {perNight.toLocaleString()}/night
          </span>
          <span className="text-sm font-medium text-[#1c2a22]">
            ${confirmation.total.toLocaleString()}
          </span>
        </div>

        <div className="rounded-lg bg-secondary/5 px-3 py-2 text-[11px] tracking-wide text-secondary">
          Confirmation #{confirmation.bookingId.slice(0, 8).toUpperCase()}
        </div>
      </div>
    </div>
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

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;

    const userMessage: Message = { id: Date.now(), sender: "user", text };
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
          id: Date.now() + 1,
          sender: "bot",
          text: data.reply ?? "",
          bookingConfirmation: data.bookingConfirmation,
          bookingError: data.bookingError,
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
                <p className="text-center text-sm text-[#4A3320]/50">
                  Ask us anything about your stay.
                </p>
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
                          : "bg-white text-[#1c2a22] shadow-sm"
                      }`}
                    >
                      {message.text}
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
