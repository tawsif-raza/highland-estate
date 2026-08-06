// In-memory booking data layer for the Estate Concierge chatbot demo.
// Reuses the room catalog from RoomsSection.tsx (id/name/image), extended
// with fields needed for availability + pricing. All state here is
// in-memory and resets on redeploy — that's fine for this demo.

export interface SeasonRule {
  month: number; // 1-12
  multiplier: number; // e.g. 1.3 = 30% peak season surcharge
}

export interface Room {
  id: string;
  title: string;
  image: string;
  specs: string;
  features: string;
  basePricePerNight: number; // INR
  maxGuests: number;
  seasonMultipliers: SeasonRule[];
}

export interface DateRange {
  start: string; // ISO date, e.g. "2026-08-12"
  end: string; // ISO date, exclusive checkout date
}

export interface SpecialService {
  id: string;
  title: string;
  description: string;
  price: number; // INR
}

export interface SpecialServiceLine {
  id: string;
  title: string;
  price: number;
}

export interface Booking {
  bookingId: string;
  roomId: string;
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
  createdAt: string;
  specialServices: SpecialServiceLine[];
  comped: boolean;
  originalTotal: number;
}

export interface CreateBookingInput {
  roomId: string;
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  specialServiceIds?: string[];
  // Internal-only: never accept this from a tool-call argument. Route.ts
  // sets this from its own server-side VIP detection, not from anything
  // the model or guest can supply directly.
  comped?: boolean;
}

// Coorg/Chikmagalur-style coffee plantation resort: peak season is the
// cool, dry Oct-Feb stretch (post-monsoon, wedding/holiday season), plus a
// smaller bump around the May long-weekend/summer-break travel window.
const PEAK_SEASON: SeasonRule[] = [
  { month: 10, multiplier: 1.2 },
  { month: 11, multiplier: 1.3 },
  { month: 12, multiplier: 1.4 },
  { month: 1, multiplier: 1.3 },
  { month: 2, multiplier: 1.15 },
  { month: 5, multiplier: 1.1 },
];

export const ROOMS: Room[] = [
  {
    id: "mist-cabin",
    title: "The Mist Cabin",
    image: "/images/room-mist-cabin.png",
    specs: "450 sq ft • Forest View • King Bed",
    features: "Private balcony, fireplace, handcrafted coffee bar.",
    basePricePerNight: 14500,
    maxGuests: 2,
    seasonMultipliers: PEAK_SEASON,
  },
  {
    id: "canopy-suite",
    title: "The Canopy Suite",
    image: "/images/room-canopy.png",
    specs: "700 sq ft • Valley View • King Bed",
    features: "Panoramic glass walls, private Jacuzzi, personal butler.",
    basePricePerNight: 22000,
    maxGuests: 3,
    seasonMultipliers: PEAK_SEASON,
  },
  {
    id: "plantation-villa",
    title: "The Plantation Villa",
    image: "/images/room-villa.png",
    specs: "1,200 sq ft • Private Estate • 2 Bedrooms",
    features:
      "Private plunge pool, coffee tasting deck, outdoor shower, and a dedicated concierge for the full length of your stay.",
    basePricePerNight: 37500,
    maxGuests: 5,
    seasonMultipliers: PEAK_SEASON,
  },
];

export const SPECIAL_SERVICES: SpecialService[] = [
  {
    id: "candlelit-dinner",
    title: "Private Candlelit Dinner",
    description:
      "A private, chef-curated dinner for two, served candlelit on the plantation deck.",
    price: 6500,
  },
  {
    id: "couples-spa",
    title: "Couples' Spa Session",
    description:
      "A side-by-side Ayurvedic spa session for two, using estate-grown botanicals.",
    price: 8500,
  },
  {
    id: "sunset-plantation-walk",
    title: "Sunset Plantation Walk",
    description:
      "A private guided walk through the coffee plantation at sunset, with an estate coffee tasting.",
    price: 3000,
  },
  {
    id: "in-room-breakfast",
    title: "In-Room Breakfast",
    description:
      "A curated breakfast spread served privately in-room, featuring estate coffee and seasonal produce.",
    price: 2200,
  },
];

function getSpecialService(id: string): SpecialService | undefined {
  return SPECIAL_SERVICES.find((s) => s.id === id);
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Seeded fake bookings over the next 60 days so availability checks have
// something realistic to reject.
export const BLOCKED_RANGES: Record<string, DateRange[]> = {
  "mist-cabin": [
    { start: daysFromNow(3), end: daysFromNow(6) },
    { start: daysFromNow(15), end: daysFromNow(17) },
    { start: daysFromNow(30), end: daysFromNow(35) },
    { start: daysFromNow(50), end: daysFromNow(52) },
  ],
  "canopy-suite": [
    { start: daysFromNow(5), end: daysFromNow(9) },
    { start: daysFromNow(20), end: daysFromNow(23) },
    { start: daysFromNow(40), end: daysFromNow(45) },
  ],
  "plantation-villa": [
    { start: daysFromNow(1), end: daysFromNow(4) },
    { start: daysFromNow(25), end: daysFromNow(31) },
    { start: daysFromNow(47), end: daysFromNow(49) },
    { start: daysFromNow(58), end: daysFromNow(60) },
  ],
};

export const BOOKINGS: Booking[] = [];

function getRoom(roomId: string): Room | undefined {
  return ROOMS.find((r) => r.id === roomId);
}

function parseDate(value: string): Date {
  const d = new Date(`${value}T00:00:00Z`);
  return d;
}

function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function checkAvailability(
  roomId: string,
  checkIn: string,
  checkOut: string,
): { available: boolean; reason?: string } {
  const room = getRoom(roomId);
  if (!room) {
    return { available: false, reason: `Unknown room id "${roomId}".` };
  }

  const checkInDate = parseDate(checkIn);
  const checkOutDate = parseDate(checkOut);

  if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) {
    return { available: false, reason: "Invalid check-in or check-out date." };
  }

  if (checkOutDate <= checkInDate) {
    return { available: false, reason: "Check-out must be after check-in." };
  }

  const blocked = BLOCKED_RANGES[roomId] ?? [];
  for (const range of blocked) {
    const blockedStart = parseDate(range.start);
    const blockedEnd = parseDate(range.end);
    if (rangesOverlap(checkInDate, checkOutDate, blockedStart, blockedEnd)) {
      return {
        available: false,
        reason: `${room.title} is already booked from ${range.start} to ${range.end}.`,
      };
    }
  }

  return { available: true };
}

export type PriceBreakdown =
  | {
      nights: number;
      baseTotal: number;
      seasonAdjustment: number;
      roomTotal: number;
      specialServices: SpecialServiceLine[];
      specialServicesTotal: number;
      // Amount actually due: equals originalTotal unless `comped` is true,
      // in which case it's 0. Every non-comped caller sees the same number
      // here as before this field set existed.
      total: number;
      // What the stay + services would have cost, regardless of comping —
      // always present so a comped booking can still show "was $X".
      originalTotal: number;
      comped: boolean;
    }
  | { error: string };

export function calculatePrice(
  roomId: string,
  checkIn: string,
  checkOut: string,
  guests: number,
  options: { specialServiceIds?: string[]; comped?: boolean } = {},
): PriceBreakdown {
  const { specialServiceIds = [], comped = false } = options;

  const room = getRoom(roomId);
  if (!room) {
    return { error: `Unknown room id "${roomId}".` };
  }

  if (guests > room.maxGuests) {
    return {
      error: `${room.title} sleeps a maximum of ${room.maxGuests} guests (requested ${guests}).`,
    };
  }

  const checkInDate = parseDate(checkIn);
  const checkOutDate = parseDate(checkOut);

  if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) {
    return { error: "Invalid check-in or check-out date." };
  }

  if (checkOutDate <= checkInDate) {
    return { error: "Check-out must be after check-in." };
  }

  const msPerNight = 1000 * 60 * 60 * 24;
  const nights = Math.round(
    (checkOutDate.getTime() - checkInDate.getTime()) / msPerNight,
  );

  let baseTotal = 0;
  let seasonAdjustment = 0;

  const cursor = new Date(checkInDate);
  for (let i = 0; i < nights; i++) {
    const month = cursor.getUTCMonth() + 1;
    const rule = room.seasonMultipliers.find((r) => r.month === month);
    const nightlyBase = room.basePricePerNight;
    const nightlyTotal = rule ? nightlyBase * rule.multiplier : nightlyBase;

    baseTotal += nightlyBase;
    seasonAdjustment += nightlyTotal - nightlyBase;

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const roomTotal = Math.round(baseTotal + seasonAdjustment);

  const specialServices: SpecialServiceLine[] = [];
  let specialServicesTotal = 0;
  for (const id of specialServiceIds) {
    const service = getSpecialService(id);
    if (!service) {
      return { error: `Unknown special service "${id}".` };
    }
    specialServices.push({ id: service.id, title: service.title, price: service.price });
    specialServicesTotal += service.price;
  }

  const originalTotal = roomTotal + specialServicesTotal;

  return {
    nights,
    baseTotal: Math.round(baseTotal),
    seasonAdjustment: Math.round(seasonAdjustment),
    roomTotal,
    specialServices,
    specialServicesTotal,
    originalTotal,
    total: comped ? 0 : originalTotal,
    comped,
  };
}

function generateBookingId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `bk_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export type CreateBookingResult =
  | {
      bookingId: string;
      confirmation: {
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
    }
  | { error: string };

export function createBooking(
  input: CreateBookingInput,
): CreateBookingResult {
  const room = getRoom(input.roomId);
  if (!room) {
    return { error: `Unknown room id "${input.roomId}".` };
  }

  // Re-check availability server-side — never trust the caller's claim
  // that the dates are free.
  const availability = checkAvailability(
    input.roomId,
    input.checkIn,
    input.checkOut,
  );
  if (!availability.available) {
    return { error: availability.reason ?? "Room is not available for the selected dates." };
  }

  const price = calculatePrice(
    input.roomId,
    input.checkIn,
    input.checkOut,
    input.guests,
    { specialServiceIds: input.specialServiceIds, comped: input.comped },
  );
  if ("error" in price) {
    return { error: price.error };
  }

  const bookingId = generateBookingId();
  const booking: Booking = {
    bookingId,
    roomId: input.roomId,
    guestName: input.guestName,
    guestEmail: input.guestEmail,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guests: input.guests,
    total: price.total,
    createdAt: new Date().toISOString(),
    specialServices: price.specialServices,
    comped: price.comped,
    originalTotal: price.originalTotal,
  };

  BOOKINGS.push(booking);

  // Re-block these dates so subsequent availability checks reject them.
  const blocked = BLOCKED_RANGES[input.roomId] ?? [];
  blocked.push({ start: input.checkIn, end: input.checkOut });
  BLOCKED_RANGES[input.roomId] = blocked;

  return {
    bookingId,
    confirmation: {
      bookingId,
      roomTitle: room.title,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      guests: input.guests,
      nights: price.nights,
      total: price.total,
      guestName: input.guestName,
      guestEmail: input.guestEmail,
      specialServices: price.specialServices,
      specialServicesTotal: price.specialServicesTotal,
      originalTotal: price.originalTotal,
      comped: price.comped,
    },
  };
}
