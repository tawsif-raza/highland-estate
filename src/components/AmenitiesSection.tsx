"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Feature = {
  image: string;
  title: string;
  text: string;
  reverse?: boolean;
};

const FEATURES: Feature[] = [
  {
    image: "/images/pool-infinity.png",
    title: "Heated Valley Infinity Pool",
    text: "Swim above the clouds in our temperature-controlled pool overlooking 50 acres of private coffee plantations.",
  },
  {
    image: "/images/dining-roastery.png",
    title: "Estate-to-Table Dining",
    text: "Savor artisanal meals paired with freshly roasted Arabica beans harvested directly from our estate.",
    reverse: true,
  },
  {
    image: "/images/spa-ayurvedic.png",
    title: "Forest Wellness Spa",
    text: "Rejuvenate with traditional wellness therapies using estate-grown herbs and organic oils.",
  },
];

function FadeInOnScroll({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
      } ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

export default function AmenitiesSection() {
  return (
    <section id="amenities" className="bg-secondary py-24 sm:py-32">
      <div className="mx-auto flex max-w-6xl flex-col gap-24 px-6 lg:px-8">
        {FEATURES.map((feature) => (
          <FadeInOnScroll key={feature.title}>
            <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16">
              <div
                className={`relative aspect-[4/3] overflow-hidden rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${
                  feature.reverse ? "md:order-2" : ""
                }`}
              >
                <Image
                  src={feature.image}
                  alt={feature.title}
                  fill
                  className="object-cover"
                />
              </div>

              <div className={feature.reverse ? "md:order-1" : ""}>
                <h3 className="font-lora text-3xl text-accent sm:text-4xl">
                  {feature.title}
                </h3>
                <p className="mt-5 text-base leading-relaxed text-accent/80 sm:text-lg">
                  {feature.text}
                </p>
              </div>
            </div>
          </FadeInOnScroll>
        ))}
      </div>
    </section>
  );
}
