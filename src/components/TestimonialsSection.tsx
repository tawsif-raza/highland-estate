"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Review = {
  quote: string;
  author: string;
  location: string;
  rating: number;
  isGuestSubmission?: boolean;
};

const REVIEWS: Review[] = [
  {
    quote:
      "The morning mist rolling over the canopy while sipping estate coffee from the balcony was unforgettable.",
    author: "Ananya M.",
    location: "Bengaluru",
    rating: 5,
  },
  {
    quote:
      "A masterclass in quiet luxury. The Canopy Suite feels like floating above the rainforest. The attention to detail in the architecture is stunning.",
    author: "Rohan K.",
    location: "Mumbai",
    rating: 5,
  },
];

const STORAGE_KEY = "highland-estate-guest-reviews";
const STORAGE_EVENT = "highland-estate-guest-reviews-updated";

function subscribeToGuestReviews(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(STORAGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(STORAGE_EVENT, onChange);
  };
}

function getGuestReviewsSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY) ?? "[]";
}

function getGuestReviewsServerSnapshot() {
  return "[]";
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1 text-yellow-500" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-5 w-5 ${i < rating ? "" : "opacity-25"}`}
        >
          <path d="M10 1.5l2.59 5.25 5.79.84-4.19 4.08.99 5.77L10 14.77l-5.18 2.67.99-5.77L1.62 7.59l5.79-.84L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (rating: number) => void;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {Array.from({ length: 5 }).map((_, i) => {
        const starValue = i + 1;
        const filled = (hovered || value) >= starValue;
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === starValue}
            aria-label={`${starValue} star${starValue > 1 ? "s" : ""}`}
            onClick={() => onChange(starValue)}
            onMouseEnter={() => setHovered(starValue)}
            onMouseLeave={() => setHovered(0)}
            className="text-yellow-500 transition-transform hover:scale-110"
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`h-7 w-7 ${filled ? "" : "opacity-25"}`}
            >
              <path d="M10 1.5l2.59 5.25 5.79.84-4.19 4.08.99 5.77L10 14.77l-5.18 2.67.99-5.77L1.62 7.59l5.79-.84L10 1.5z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

export default function TestimonialsSection() {
  const guestReviewsJson = useSyncExternalStore(
    subscribeToGuestReviews,
    getGuestReviewsSnapshot,
    getGuestReviewsServerSnapshot
  );
  const guestReviews = useMemo<Review[]>(() => {
    try {
      return JSON.parse(guestReviewsJson);
    } catch {
      return [];
    }
  }, [guestReviewsJson]);
  const reviews = useMemo(() => [...guestReviews, ...REVIEWS], [guestReviews]);

  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [rating, setRating] = useState(0);
  const [quote, setQuote] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !quote.trim() || rating === 0) {
      setError("Please add your name, a rating, and a short review.");
      return;
    }

    const newReview: Review = {
      quote: quote.trim(),
      author: name.trim(),
      location: location.trim() || "Guest",
      rating,
      isGuestSubmission: true,
    };

    try {
      const updatedGuestReviews = [newReview, ...guestReviews];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedGuestReviews));
      window.dispatchEvent(new Event(STORAGE_EVENT));
    } catch {
      // storage may be unavailable; the form still confirms submission
    }

    setName("");
    setLocation("");
    setRating(0);
    setQuote("");
    setSubmitted(true);
    setFormOpen(false);
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <section id="testimonials" className="bg-[#FDFCFB] py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          <span className="rounded-full border border-primary/20 bg-primary/5 px-4 py-1 text-xs font-medium uppercase tracking-wide text-primary/70">
            Sample Showcase Content
          </span>
          <h2 className="mt-5 font-lora text-4xl text-primary sm:text-5xl">
            Words from Our Guests
          </h2>

          <button
            type="button"
            onClick={() => setFormOpen((open) => !open)}
            className="mt-8 rounded-full bg-primary px-6 py-3 text-sm font-medium text-white shadow-md transition-colors hover:bg-primary/90"
          >
            {formOpen ? "Cancel" : "Share Your Experience"}
          </button>

          <AnimatePresence>
            {submitted && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 text-sm font-medium text-secondary"
              >
                Thank you for sharing your experience!
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {formOpen && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onSubmit={handleSubmit}
              className="mx-auto mt-10 max-w-xl overflow-hidden rounded-2xl border border-primary/10 bg-white p-8 shadow-md"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="review-name" className="text-sm font-medium text-primary/80">
                    Name
                  </label>
                  <input
                    id="review-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ananya M."
                    className="rounded-lg border border-primary/20 px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="review-location" className="text-sm font-medium text-primary/80">
                    Location <span className="font-normal text-primary/40">(optional)</span>
                  </label>
                  <input
                    id="review-location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Bengaluru"
                    className="rounded-lg border border-primary/20 px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-1.5">
                <span className="text-sm font-medium text-primary/80">Your rating</span>
                <StarPicker value={rating} onChange={setRating} />
              </div>

              <div className="mt-4 flex flex-col gap-1.5">
                <label htmlFor="review-quote" className="text-sm font-medium text-primary/80">
                  Your review
                </label>
                <textarea
                  id="review-quote"
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                  rows={4}
                  placeholder="Tell future guests about your stay..."
                  className="resize-none rounded-lg border border-primary/20 px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                className="mt-5 w-full rounded-full bg-secondary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-secondary/90"
              >
                Submit Review
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2">
          <AnimatePresence>
            {reviews.map((review, i) => (
              <motion.div
                key={`${review.author}-${i}`}
                layout
                initial={review.isGuestSubmission ? { opacity: 0, y: 16 } : false}
                animate={{ opacity: 1, y: 0 }}
                className="relative rounded-2xl border border-primary/10 bg-white p-8 shadow-md"
              >
                {review.isGuestSubmission && (
                  <span className="absolute right-6 top-6 rounded-full bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary">
                    Guest submission
                  </span>
                )}
                <StarRating rating={review.rating} />
                <p className="mt-5 text-lg leading-relaxed text-primary/90">
                  &ldquo;{review.quote}&rdquo;
                </p>
                <p className="mt-6 text-sm font-medium text-primary/60">
                  {review.author}, {review.location}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
