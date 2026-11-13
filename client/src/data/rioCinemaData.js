export const RIO_LOCATIONS = [
  {
    id: 'oulu',
    name: 'Cinema RIO Oulu',
    city: 'Oulu',
    address: 'Kauppurienkatu 45, 90100 Oulu, Finland',
    phone: '+358 8 5542 3890',
    auditoriums: [
      { id: 'oulu-1', name: 'Oulu — Auditorium 1', capacity: 100, rows: 10, cols: 10, wheelchairSeats: 4 },
      { id: 'oulu-2', name: 'Oulu — Auditorium 2', capacity: 200, rows: 20, cols: 10, wheelchairSeats: 6 }
    ]
  },
  {
    id: 'tampere',
    name: 'Cinema RIO Tampere',
    city: 'Tampere',
    address: 'Hämeenkatu 27, 33100 Tampere, Finland',
    phone: '+358 2 2641 7520',
    auditoriums: [
      { id: 'tampere-1', name: 'Tampere — Auditorium 1', capacity: 100, rows: 10, cols: 10, wheelchairSeats: 4 },
      { id: 'tampere-2', name: 'Tampere — Auditorium 2', capacity: 200, rows: 20, cols: 10, wheelchairSeats: 6 }
    ]
  }
];

export const SHOWTIME_RULES = {
  doorsOpenMinutesBeforeAds: 15,
  advertisementDurationMinutes: 12,
  seatHoldMinutes: 15,
  payLaterMaxTickets: 6,
  payLaterPickupHoursBefore: 2,
  childDiscountRate: 0.5,
  loyaltyTenTicketsDiscountRate: 0.5,
  standardMarkupRate: 1.15
};

// Fallback catalog if the backend database or external movie API is unreachable
// ("if the external doesn't work, I want my business still run, our customers can buy tickets")
export const FALLBACK_MOVIES = [
  {
    id: 1,
    title: 'The Last Horizon',
    description: 'A deep-space crew races to bring a lost station home before its orbit decays.',
    genre: 'Sci-Fi',
    duration_min: 128,
    age_rating: 'PG-13',
    release_year: 2026,
    poster_url: ''
  },
  {
    id: 2,
    title: 'Midnight in Bloom',
    description: 'Two strangers find a new beginning during one unforgettable Nordic city night.',
    genre: 'Romance',
    duration_min: 104,
    age_rating: 'PG-13',
    release_year: 2025,
    poster_url: ''
  },
  {
    id: 3,
    title: 'The Clockwork Case',
    description: 'A sharp detective follows a trail of impossible clues through a changing city.',
    genre: 'Mystery',
    duration_min: 116,
    age_rating: 'PG-13',
    release_year: 2024,
    poster_url: ''
  },
  {
    id: 4,
    title: 'Wildwood',
    description: 'A family discovers that the forest beyond their town is full of unexpected magic.',
    genre: 'Adventure',
    duration_min: 110,
    age_rating: 'PG',
    release_year: 2023,
    poster_url: ''
  },
  {
    id: 5,
    title: 'Laugh Track',
    description: 'An aspiring comic gets one week to turn a tiny club into a big break.',
    genre: 'Comedy',
    duration_min: 97,
    age_rating: 'PG-13',
    release_year: 2022,
    poster_url: ''
  },
  {
    id: 6,
    title: 'Deep Blue',
    description: 'A marine biologist uncovers a mystery in the deepest part of the ocean.',
    genre: 'Drama',
    duration_min: 121,
    age_rating: 'PG-13',
    release_year: 2021,
    poster_url: ''
  }
];

export const OPEN_API_SAMPLE_MOVIES = [
  {
    title: 'Northern Lights Odyssey',
    description: 'Imported from Open Movie API: An Arctic expedition uncovers an ancient signal beneath Lapland.',
    genre: 'Sci-Fi',
    duration_min: 134,
    release_year: 2026,
    age_rating: 'PG-13',
    poster_url: ''
  },
  {
    title: 'Shadows Over Tammerkoski',
    description: 'Imported from Open Movie API: A gripping Finnish noir thriller set in industrial Tampere.',
    genre: 'Mystery',
    duration_min: 118,
    release_year: 2026,
    age_rating: '16+',
    poster_url: ''
  },
  {
    title: 'Little Polar Express',
    description: 'Imported from Open Movie API: A heartwarming family animation across snowy Oulu.',
    genre: 'Adventure',
    duration_min: 92,
    release_year: 2025,
    age_rating: 'S',
    poster_url: ''
  }
];
