type Review = {
  quote: string;
  author: string;
  location: string;
};

const REVIEWS: Review[] = [
  {
    quote:
      "The morning mist rolling over the canopy while sipping estate coffee from the balcony was unforgettable.",
    author: "Ananya M.",
    location: "Bengaluru",
  },
  {
    quote:
      "A masterclass in quiet luxury. The Canopy Suite feels like floating above the rainforest. The attention to detail in the architecture is stunning.",
    author: "Rohan K.",
    location: "Mumbai",
  },
];

function StarRating() {
  return (
    <div className="flex gap-1 text-yellow-500" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path d="M10 1.5l2.59 5.25 5.79.84-4.19 4.08.99 5.77L10 14.77l-5.18 2.67.99-5.77L1.62 7.59l5.79-.84L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}

export default function TestimonialsSection() {
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
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2">
          {REVIEWS.map((review) => (
            <div
              key={review.author}
              className="rounded-2xl border border-primary/10 bg-white p-8 shadow-md"
            >
              <StarRating />
              <p className="mt-5 text-lg leading-relaxed text-primary/90">
                &ldquo;{review.quote}&rdquo;
              </p>
              <p className="mt-6 text-sm font-medium text-primary/60">
                {review.author}, {review.location}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
