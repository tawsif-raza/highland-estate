import Image from "next/image";

export default function GallerySection() {
  return (
    <section id="gallery" className="bg-dark-accent py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <h2 className="text-center font-lora text-4xl text-accent sm:text-5xl">
          Glimpses of the Estate
        </h2>

        <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6 auto-rows-[300px]">
          <div className="relative md:col-span-2 md:row-span-1 rounded-2xl overflow-hidden group">
            <Image
              src="/images/reception.png"
              alt="The Highland Estate reception"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            />
          </div>

          <div className="relative md:col-span-1 md:row-span-2 rounded-2xl overflow-hidden group">
            <Image
              src="/images/hero-exterior.png"
              alt="The Highland Estate exterior"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            />
          </div>

          <div className="relative md:col-span-1 md:row-span-1 rounded-2xl overflow-hidden group">
            <Image
              src="/images/amenity-detail.png"
              alt="Estate coffee detail"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            />
          </div>

          <div className="relative md:col-span-1 md:row-span-1 rounded-2xl overflow-hidden group">
            <Image
              src="/images/dining-roastery.png"
              alt="Estate-to-table dining and roastery"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
