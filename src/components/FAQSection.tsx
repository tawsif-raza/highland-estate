"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type FAQ = {
  question: string;
  answer: string;
};

const FAQS: FAQ[] = [
  {
    question: "What is the best time to visit the estate?",
    answer:
      "The estate is beautiful year-round, but the coffee harvest season from November to February offers a truly special experience with cool morning fog.",
  },
  {
    question: "Do you offer guided coffee tours?",
    answer:
      "Yes, every stay includes a complimentary morning walk through the plantation with our head roaster.",
  },
  {
    question: "Is the estate child-friendly?",
    answer:
      "While we welcome guests of all ages, our steep trails and quiet atmosphere are best suited for adults and older children seeking a peaceful retreat.",
  },
  {
    question: "Is there Wi-Fi in the rooms?",
    answer:
      "Yes, we offer high-speed satellite Wi-Fi across the property so you can stay connected while surrounded by nature.",
  },
];

function FAQItem({
  faq,
  isOpen,
  onToggle,
}: {
  faq: FAQ;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-accent/10 bg-secondary">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left"
      >
        <span className="text-base font-medium text-accent sm:text-lg">
          {faq.question}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-accent/10 text-xl leading-none text-accent"
        >
          +
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="px-6 pb-5 text-sm leading-relaxed text-accent/70 sm:text-base">
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="bg-dark-accent py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <h2 className="text-center font-lora text-4xl text-accent sm:text-5xl">
          Frequently Asked Questions
        </h2>

        <div className="mt-14 flex flex-col gap-4">
          {FAQS.map((faq, index) => (
            <FAQItem
              key={faq.question}
              faq={faq}
              isOpen={openIndex === index}
              onToggle={() =>
                setOpenIndex((current) => (current === index ? null : index))
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}
