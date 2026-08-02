import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <Image
        src="/images/hero-exterior.png"
        alt="The Highland Estate exterior nestled in misty hills"
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 text-center">
        <h1 className="font-lora text-5xl leading-tight text-white sm:text-6xl md:text-7xl">
          Where the misty hills meet calm luxury.
        </h1>
        <p className="mt-6 text-lg text-white/90 sm:text-xl">
          Lose yourself in the clouds.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="#rooms"
            className="rounded-full border border-white px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-white hover:text-secondary"
          >
            Explore Suites
          </Link>
          <Link
            href="#book"
            className="rounded-full bg-primary px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            Check Availability
          </Link>
        </div>
      </div>
    </section>
  );
}
