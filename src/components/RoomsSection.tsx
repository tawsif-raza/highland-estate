"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type Room = {
  id: string;
  image: string;
  title: string;
  specs: string;
  price: string;
  features: string;
};

const ROOMS: Room[] = [
  {
    id: "mist-cabin",
    image: "/images/room-mist-cabin.png",
    title: "The Mist Cabin",
    specs: "450 sq ft • Forest View • King Bed",
    price: "175$/night",
    features: "Private balcony, fireplace, handcrafted coffee bar.",
  },
  {
    id: "canopy-suite",
    image: "/images/room-canopy.png",
    title: "The Canopy Suite",
    specs: "700 sq ft • Valley View • King Bed",
    price: "265$/night",
    features: "Panoramic glass walls, private Jacuzzi, personal butler.",
  },
  {
    id: "plantation-villa",
    image: "/images/room-villa.png",
    title: "The Plantation Villa",
    specs: "1,200 sq ft • Private Estate • 2 Bedrooms",
    price: "450$/night",
    features:
      "Private plunge pool, coffee tasting deck, outdoor shower, and a dedicated concierge for the full length of your stay.",
  },
];

export default function RoomsSection() {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  return (
    <section
      id="rooms"
      className="bg-gradient-to-b from-dark-accent to-[#1a120b] py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <h2 className="text-center font-lora text-4xl text-accent sm:text-5xl">
          Sanctuaries in the Canopy
        </h2>

        <div className="mt-16 grid grid-cols-1 gap-10 perspective-[600px] md:grid-cols-3">
          {ROOMS.map((room) => (
            <article
              key={room.title}
              className="group transform-3d overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.6)] transition-all duration-500 ease-out hover:-translate-y-2 hover:rotate-x-6 hover:-rotate-y-6 hover:scale-110 hover:shadow-[0_30px_60px_rgba(0,0,0,0.8)]"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={room.image}
                  alt={room.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              </div>

              <div className="flex flex-col gap-3 p-6">
                <h3 className="font-lora text-2xl text-white">
                  {room.title}
                </h3>
                <p className="text-sm text-accent/70">{room.specs}</p>
                <p className="text-lg font-medium text-accent">
                  {room.price}
                </p>
                <p className="text-sm leading-relaxed text-accent/80">
                  {room.features}
                </p>

                <button
                  type="button"
                  onClick={() => setSelectedRoom(room)}
                  className="mt-2 text-left text-sm font-medium text-white underline underline-offset-4 transition-colors hover:text-accent"
                >
                  View Details
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl bg-[#1C2A22] p-8 text-[#E8EDEB]">
            <button
              type="button"
              onClick={() => setSelectedRoom(null)}
              aria-label="Close"
              className="absolute right-6 top-6 text-2xl leading-none text-[#E8EDEB]/70 transition-colors hover:text-[#E8EDEB]"
            >
              &times;
            </button>

            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl">
              <Image
                src={selectedRoom.image}
                alt={selectedRoom.title}
                fill
                className="object-cover"
              />
            </div>

            <h3 className="mt-6 font-lora text-3xl">{selectedRoom.title}</h3>
            <p className="mt-2 text-sm text-[#E8EDEB]/70">
              {selectedRoom.specs}
            </p>
            <p className="mt-1 text-lg font-medium">{selectedRoom.price}</p>

            <p className="mt-4 text-sm leading-relaxed text-[#E8EDEB]/80">
              {selectedRoom.features} Every stay at The Highland Estate is
              tailored around quiet luxury — from turndown rituals to estate
              coffee brewed to order, our team curates each detail so this
              room feels entirely your own for the length of your visit.
            </p>

            <Link
              href={`mailto:tawsifk35@gmail.com?subject=${encodeURIComponent(
                `Inquiry: ${selectedRoom.title}`,
              )}`}
              className="mt-8 block w-full rounded-full bg-primary py-3 text-center text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              Inquire About This Room
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
