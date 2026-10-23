export type Mentor = {
  id: string;
  firstName: string;
  lastName: string;
  headline: string; // « Ingénieur · Informatique »
  study: string; // « M2 · Informatique »
  city: string;
  origin: string; // « Casablanca »
  rating: number;
  sessions: number;
  responseHours: number;
  quote: string;
  specialties: string[];
  languages: ('ar' | 'fr' | 'en' | 'ber')[];
  journey: { year: string; title: string; detail: string }[];
  reviews: { author: string; text: string; rating: number }[];
  availableThisWeek: boolean;
  avatarColor: string;
};

export type Booking = {
  id: string;
  mentorId: string;
  startsAt: string;
  topic: string;
  /** pending = demande envoyée, le mentor n'a pas encore répondu. cancelled = déclinée ou annulée. */
  status: 'pending' | 'confirmed' | 'cancelled' | 'done';
};

export type Group = {
  id: string;
  name: string;
  city: string;
  description: string;
  tags: string[];
  members: number;
  privacy: 'public' | 'private';
  cover: readonly [string, string];
  emoji: string;
};

export type Post = {
  id: string;
  groupId: string;
  author: string;
  authorColor: string;
  createdAt: string;
  body: string;
  likes: number;
  comments: { author: string; body: string; isAuthor?: boolean }[];
};

export type CommunityEvent = {
  id: string;
  groupId?: string;
  title: string;
  city: string;
  place: string;
  address: string;
  startsAt: string;
  description: string;
  capacity: number;
  attendees: number;
  price: 'free' | 'paid';
  link?: string;
  cover: readonly [string, string];
  emoji: string;
};

export type Partner = { id: string; name: string; kind: 'school' | 'bank' | 'insurance'; tagline: string; color: string };
