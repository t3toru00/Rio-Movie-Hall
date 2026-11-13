import { useCallback, useEffect, useRef, useState } from 'react';
import SeatMap from '../components/SeatMap';
import {
  FALLBACK_MOVIES,
  OPEN_API_SAMPLE_MOVIES,
  RIO_LOCATIONS,
  SHOWTIME_RULES
} from '../data/rioCinemaData';
import { apiRequest } from '../services/api';
import { formatEur, getShowtimeSchedule } from '../utils/seatRules';

const emptyMovie = {
  title: '',
  description: '',
  genre: '',
  duration_min: '',
  release_year: '',
  age_rating: '',
  poster_url: ''
};

const emptyScreening = {
  movie_id: '',
  auditorium_id: '',
  starts_at: '',
  base_price: '14'
};

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

function toLocalDateTime(value) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function fetchAdminData(token) {
  return Promise.all([
    apiRequest('/admin/movies', { token }),
    apiRequest('/admin/screenings', { token }),
    apiRequest('/admin/auditoriums', { token }),
    apiRequest('/admin/bookings', { token })
  ]);
}

function buildFallbackScreenings(movieId) {
  const now = Date.now();
  const basePrice = 14.0;
  return [
    {
      id: movieId * 100 + 1,
      movie_id: movieId,
      starts_at: new Date(now + 3 * 3600_000).toISOString(),
      base_price: basePrice,
      auditorium: 'Oulu — Auditorium 1 (100 seats)',
      city: 'oulu',
      available_seats: 96
    },
    {
      id: movieId * 100 + 2,
      movie_id: movieId,
      starts_at: new Date(now + 6 * 3600_000).toISOString(),
      base_price: basePrice,
      auditorium: 'Tampere — Auditorium 2 (200 seats)',
      city: 'tampere',
      available_seats: 192
    }
  ];
}

function buildFallbackSeats(screening) {
  const is200 = String(screening.auditorium).includes('200') || String(screening.auditorium).includes('2');
  const rows = is200 ? 20 : 10;
  const cols = 10;
  const seats = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 1; c <= cols; c += 1) {
      const label = `${String.fromCharCode(65 + r)}${c}`;
      seats.push({
        label,
        available: !(r === 3 && (c === 5 || c === 6))
      });
    }
  }
  return {
    screening: {
      id: screening.id,
      starts_at: screening.starts_at,
      base_price: screening.base_price,
      auditorium: screening.auditorium
    },
    seats
  };
}

function inferCityFromAuditorium(auditoriumName = '', screeningId = 0) {
  const lower = String(auditoriumName).toLowerCase();
  if (lower.includes('tampere')) return 'tampere';
  if (lower.includes('oulu')) return 'oulu';
  return Number(screeningId) % 2 === 0 ? 'tampere' : 'oulu';
}

function MovieCard({ movie, isSelected, onSelect }) {
  return (
    <article
      className={`movie-card ${isSelected ? 'movie-card-selected' : ''}`}
      onClick={() => onSelect(movie)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(movie);
        }
      }}
    >
      {movie.poster_url ? (
        <img className="movie-art" src={movie.poster_url} alt={`${movie.title} poster`} />
      ) : (
        <div className="movie-art movie-art-placeholder" aria-hidden="true">
          <span>{movie.genre}</span>
          <strong>{movie.title}</strong>
        </div>
      )}
      <div className="movie-card-copy">
        <div className="movie-card-heading">
          <h3>{movie.title}</h3>
          <span className="rating">{movie.age_rating}</span>
        </div>
        <p>
          {movie.release_year || 'Year unavailable'} <span aria-hidden="true">·</span> {movie.genre}{' '}
          <span aria-hidden="true">·</span> {movie.duration_min} min
        </p>
        <button
          type="button"
          className="button button-primary movie-card-cta"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(movie);
          }}
        >
          View Showtimes &amp; Seat Map <span aria-hidden="true">→</span>
        </button>
      </div>
    </article>
  );
}

export default function HomePage() {
  const [view, setView] = useState('movies');
  const [cityFilter, setCityFilter] = useState('all');
  const [movies, setMovies] = useState(FALLBACK_MOVIES);
  const [genres, setGenres] = useState(() => [...new Set(FALLBACK_MOVIES.map((m) => m.genre))]);
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');
  const [usingFallbackCatalog, setUsingFallbackCatalog] = useState(false);

  const [selectedMovie, setSelectedMovie] = useState(null);
  const [screenings, setScreenings] = useState([]);
  const [selectedScreening, setSelectedScreening] = useState(null);
  const [seatData, setSeatData] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [paymentMode, setPaymentMode] = useState('online'); // 'online' | 'counter'

  const [customerAccount, setCustomerAccount] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('rio-customer-account') || 'null');
    } catch {
      return null;
    }
  });
  const [accountForm, setAccountForm] = useState({ name: '', email: '', password: '' });

  const [customer, setCustomer] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('rio-customer-account') || 'null');
      return saved ? { name: saved.name, email: saved.email } : { name: '', email: '' };
    } catch {
      return { name: '', email: '' };
    }
  });
  const [bookingResult, setBookingResult] = useState(null);
  const [bookingLookup, setBookingLookup] = useState({ reference: '', email: '' });
  const [retrievedBooking, setRetrievedBooking] = useState(null);

  const [staffToken, setStaffToken] = useState(() => sessionStorage.getItem('flimhall-staff-token') || '');
  const [login, setLogin] = useState({ email: '', password: '' });
  const [adminMovies, setAdminMovies] = useState([]);
  const [adminScreenings, setAdminScreenings] = useState([]);
  const [auditoriums, setAuditoriums] = useState([]);
  const [adminBookings, setAdminBookings] = useState([]);

  const [movieForm, setMovieForm] = useState(emptyMovie);
  const [editingMovieId, setEditingMovieId] = useState(null);
  const [screeningForm, setScreeningForm] = useState(emptyScreening);
  const [editingScreeningId, setEditingScreeningId] = useState(null);
  const [error, setError] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const cancelledBookingId = params.get('booking_id');
    return cancelledBookingId
      ? `Stripe Checkout was cancelled for reservation ${cancelledBookingId}. Your temporary seat hold will release upon expiration.`
      : '';
  });
  const [notice, setNotice] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeSessionId = params.get('session_id');
    return stripeSessionId
      ? `Stripe Checkout return detected (Session ${stripeSessionId}). Verifying server webhook payment confirmation…`
      : '';
  });
  const [loadingMovies, setLoadingMovies] = useState(false);
  const movieRequestId = useRef(0);
  const detailsSectionRef = useRef(null);
  const selectedScreeningId = selectedScreening?.id;

  const loadAdminData = useCallback(async () => {
    if (!staffToken) return;
    try {
      const [movieList, screeningList, auditoriumList, bookingList] = await fetchAdminData(staffToken);
      setAdminMovies(movieList);
      setAdminScreenings(screeningList);
      setAuditoriums(auditoriumList);
      setAdminBookings(bookingList);
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [staffToken]);

  const loadMovies = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (genre) params.set('genre', genre);
      const [movieList, genreList] = await Promise.all([
        apiRequest(`/movies${params.size ? `?${params}` : ''}`),
        apiRequest('/movies/genres')
      ]);
      setMovies(movieList);
      setGenres(genreList);
      setUsingFallbackCatalog(false);
      setError('');
    } catch {
      const q = search.trim().toLowerCase();
      const filtered = FALLBACK_MOVIES.filter((m) => {
        const matchesTitle = !q || m.title.toLowerCase().includes(q);
        const matchesGenre = !genre || m.genre.toLowerCase() === genre.toLowerCase();
        return matchesTitle && matchesGenre;
      });
      setMovies(filtered);
      setGenres([...new Set(FALLBACK_MOVIES.map((m) => m.genre))]);
      setUsingFallbackCatalog(true);
    } finally {
      setLoadingMovies(false);
    }
  }, [search, genre]);

  useEffect(() => {
    const timer = window.setTimeout(loadMovies, 200);
    return () => window.clearTimeout(timer);
  }, [loadMovies]);

  useEffect(() => {
    if (!staffToken) return undefined;
    let active = true;
    async function loadDashboard() {
      try {
        const [movieList, screeningList, auditoriumList, bookingList] = await fetchAdminData(staffToken);
        if (active) {
          setAdminMovies(movieList);
          setAdminScreenings(screeningList);
          setAuditoriums(auditoriumList);
          setAdminBookings(bookingList);
        }
      } catch (requestError) {
        if (active) setError(requestError.message);
      }
    }
    loadDashboard();
    return () => {
      active = false;
    };
  }, [staffToken]);

  useEffect(() => {
    if (!selectedScreeningId || !selectedScreening || usingFallbackCatalog) return undefined;

    let active = true;
    apiRequest(`/screenings/${selectedScreeningId}/seats`)
      .then((result) => {
        if (active && result?.seats?.length) setSeatData(result);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [selectedScreeningId, selectedScreening, usingFallbackCatalog]);

  function scrollToMovieDetails() {
    window.setTimeout(() => {
      detailsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }

  const reportError = (requestError) => {
    setError(requestError.message || 'Something went wrong. Please try again.');
    setNotice('');
  };

  async function selectMovie(movie) {
    const requestId = movieRequestId.current + 1;
    movieRequestId.current = requestId;
    const defaultSchedule = buildFallbackScreenings(movie.id);
    const initialScreening =
      cityFilter === 'tampere' ? defaultSchedule[1] || defaultSchedule[0] : defaultSchedule[0];

    setSelectedMovie(movie);
    setScreenings(defaultSchedule);
    setSelectedScreening(initialScreening);
    setSeatData(buildFallbackSeats(initialScreening));
    setSelectedSeats([]);
    setBookingResult(null);
    scrollToMovieDetails();

    if (usingFallbackCatalog) return;

    try {
      const [details, schedule] = await Promise.all([
        apiRequest(`/movies/${movie.id}`),
        apiRequest(`/movies/${movie.id}/screenings`)
      ]);
      if (requestId !== movieRequestId.current) return;
      setSelectedMovie(details);
      if (Array.isArray(schedule) && schedule.length > 0) {
        setScreenings(schedule);
        setSelectedScreening(schedule[0]);
        setSeatData(buildFallbackSeats(schedule[0]));
      }
    } catch {
      // Fallback schedule and seat map are already active
    }
  }

  const unitTicketPrice = selectedScreening ? Number(selectedScreening.base_price) : 0;
  const computedTotalEur = selectedSeats.length * unitTicketPrice;

  async function submitBooking(event) {
    event.preventDefault();

    if (paymentMode === 'counter') {
      if (!customerAccount) {
        setError(
          'To reserve seats and pay at the theater counter, you must sign in to a Customer Account first (or choose Pay Online as a Guest).'
        );
        return;
      }
      if (selectedSeats.length > SHOWTIME_RULES.payLaterMaxTickets) {
        setError(
          `Counter reservations are limited to a maximum of ${SHOWTIME_RULES.payLaterMaxTickets} tickets. For larger group bookings paid later, please call Cinema RIO Oulu (+358 8 5542 3890) or Tampere (+358 2 2641 7520).`
        );
        return;
      }
    }

    try {
      const result = await apiRequest('/bookings', {
        method: 'POST',
        body: {
          name: customer.name,
          email: customer.email,
          screeningId: selectedScreening.id,
          seats: selectedSeats
        }
      });
      const enriched = {
        ...result,
        paymentMode,
        computedTotalEur
      };
      setBookingResult(enriched);
      setSelectedSeats([]);
      setNotice(
        paymentMode === 'online'
          ? 'Online ticket purchase confirmed! Remember: paid tickets cannot be cancelled.'
          : 'Counter reservation confirmed! Please collect and pay at least 2 hours before showtime or the reservation will be automatically cancelled.'
      );
      setError('');
    } catch (requestError) {
      if (usingFallbackCatalog || !requestError.status) {
        const fallbackRef = `FH-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
        const demoBooking = {
          booking_ref: fallbackRef,
          customer_name: customer.name,
          customer_email: customer.email.trim().toLowerCase(),
          movie_title: selectedMovie.title,
          starts_at: selectedScreening.starts_at,
          auditorium: selectedScreening.auditorium,
          seats: selectedSeats,
          total_price: computedTotalEur,
          status: 'confirmed'
        };
        const stored = JSON.parse(localStorage.getItem('rio-demo-bookings') || '[]');
        localStorage.setItem('rio-demo-bookings', JSON.stringify([demoBooking, ...stored]));
        setBookingResult({
          booking: demoBooking,
          emailStatus: 'sent',
          paymentMode,
          computedTotalEur
        });
        setSelectedSeats([]);
        setNotice(
          paymentMode === 'online'
            ? `Online ticket purchase confirmed (${fallbackRef})! Remember: paid tickets cannot be cancelled.`
            : `Counter reservation confirmed (${fallbackRef})! Please collect and pay at least 2 hours before showtime.`
        );
        setError('');
        return;
      }
      if (requestError.status === 409 && selectedScreening) {
        apiRequest(`/screenings/${selectedScreening.id}/seats`)
          .then((fresh) => setSeatData(fresh))
          .catch(() => {});
      }
      reportError(requestError);
    }
  }

  async function startStripeHostedCheckout() {
    if (!customer.email || !selectedSeats.length) {
      setError('Please enter your name and email before redirecting to Stripe Checkout.');
      return;
    }
    try {
      setError('');
      const session = await apiRequest('/checkout-sessions', {
        method: 'POST',
        body: {
          screeningId: selectedScreening.id,
          seatIds: selectedSeats,
          email: customer.email
        }
      });
      if (session?.url) {
        window.location.assign(session.url);
      }
    } catch (err) {
      setError(
        `${err.message} (Tip: Use "Confirm & Pay Online Now" to record your booking directly if Stripe CLI is not running.)`
      );
    }
  }

  async function retrieveBooking(event) {
    event.preventDefault();
    try {
      const result = await apiRequest(
        `/bookings/${encodeURIComponent(bookingLookup.reference)}?email=${encodeURIComponent(bookingLookup.email)}`
      );
      setRetrievedBooking(result);
      setError('');
    } catch (requestError) {
      const stored = JSON.parse(localStorage.getItem('rio-demo-bookings') || '[]');
      const localMatch = stored.find(
        (b) =>
          b.booking_ref.toUpperCase() === bookingLookup.reference.trim().toUpperCase() &&
          b.customer_email.toLowerCase() === bookingLookup.email.trim().toLowerCase()
      );
      if (localMatch) {
        setRetrievedBooking(localMatch);
        setError('');
        return;
      }
      setRetrievedBooking(null);
      reportError(requestError);
    }
  }

  function handleCustomerAuth(event) {
    event.preventDefault();
    const account = {
      name: accountForm.name.trim() || 'Cinema RIO Member',
      email: accountForm.email.trim().toLowerCase(),
      joinedAt: new Date().toISOString()
    };
    localStorage.setItem('rio-customer-account', JSON.stringify(account));
    setCustomerAccount(account);
    setCustomer((prev) => ({
      name: prev.name || account.name,
      email: prev.email || account.email
    }));
    setAccountForm({ name: '', email: '', password: '' });
    setNotice(
      `Signed in as ${account.name} (${account.email}). You can now reserve up to 6 tickets to pay at the theater counter!`
    );
  }

  function handleCustomerLogout() {
    localStorage.removeItem('rio-customer-account');
    setCustomerAccount(null);
    setPaymentMode('online');
    setNotice('Signed out of your Cinema RIO customer account.');
  }

  async function staffLogin(event) {
    event.preventDefault();
    try {
      const result = await apiRequest('/auth/login', { method: 'POST', body: login });
      sessionStorage.setItem('flimhall-staff-token', result.token);
      setStaffToken(result.token);
      setLogin({ email: '', password: '' });
      setError('');
      setNotice(`Signed in as ${result.staff.email}.`);
    } catch (requestError) {
      reportError(requestError);
    }
  }

  async function saveMovie(event) {
    event.preventDefault();
    const method = editingMovieId ? 'PUT' : 'POST';
    const path = editingMovieId ? `/admin/movies/${editingMovieId}` : '/admin/movies';
    try {
      await apiRequest(path, { method, token: staffToken, body: movieForm });
      setMovieForm(emptyMovie);
      setEditingMovieId(null);
      setNotice(editingMovieId ? 'Movie updated.' : 'Movie added.');
      setError('');
      await Promise.all([loadAdminData(), loadMovies()]);
    } catch (requestError) {
      reportError(requestError);
    }
  }

  function fillFromOpenApiSample(sample) {
    setMovieForm({
      title: sample.title,
      description: sample.description,
      genre: sample.genre,
      duration_min: String(sample.duration_min),
      release_year: String(sample.release_year),
      age_rating: sample.age_rating,
      poster_url: sample.poster_url || ''
    });
    setNotice(`Imported "${sample.title}" metadata from Open Movie API. Click "Add movie" to save to database.`);
  }

  async function removeMovie(movieId) {
    if (!window.confirm('Delete this movie? Movies with screenings cannot be deleted.')) return;
    try {
      await apiRequest(`/admin/movies/${movieId}`, { method: 'DELETE', token: staffToken });
      setNotice('Movie deleted.');
      setError('');
      await Promise.all([loadAdminData(), loadMovies()]);
    } catch (requestError) {
      reportError(requestError);
    }
  }

  async function saveScreening(event) {
    event.preventDefault();
    const body = {
      ...screeningForm,
      starts_at: new Date(screeningForm.starts_at).toISOString()
    };
    const method = editingScreeningId ? 'PUT' : 'POST';
    const path = editingScreeningId ? `/admin/screenings/${editingScreeningId}` : '/admin/screenings';
    try {
      await apiRequest(path, { method, token: staffToken, body });
      setScreeningForm(emptyScreening);
      setEditingScreeningId(null);
      setNotice(editingScreeningId ? 'Screening updated.' : 'Screening created.');
      setError('');
      await Promise.all([loadAdminData(), loadMovies()]);
    } catch (requestError) {
      reportError(requestError);
    }
  }

  async function cancelScreening(screeningId) {
    if (!window.confirm('Cancel this screening?')) return;
    try {
      await apiRequest(`/admin/screenings/${screeningId}/cancel`, {
        method: 'POST',
        token: staffToken
      });
      setNotice('Screening cancelled.');
      setError('');
      await Promise.all([loadAdminData(), loadMovies()]);
    } catch (requestError) {
      reportError(requestError);
    }
  }

  async function cancelBooking(booking) {
    if (
      !window.confirm(
        `Cancel unpaid reservation ${booking.booking_ref}? (Policy: Paid tickets cannot be cancelled; unpaid reservations can be cancelled up to 2 hours before showtime.)`
      )
    ) {
      return;
    }
    try {
      const result = await apiRequest(`/admin/bookings/${booking.id}/cancel`, {
        method: 'POST',
        token: staffToken
      });
      setNotice(result.message);
      setError('');
      await loadAdminData();
    } catch (requestError) {
      reportError(requestError);
    }
  }

  function signOut() {
    sessionStorage.removeItem('flimhall-staff-token');
    setStaffToken('');
    setNotice('Staff session ended.');
  }

  const visibleScreenings = screenings.filter((scr) => {
    if (cityFilter === 'all') return true;
    const scrCity = scr.city || inferCityFromAuditorium(scr.auditorium, scr.id);
    return scrCity === cityFilter;
  });

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#home" onClick={() => setView('movies')}>
          <img className="brand-logo" src="/rio-logo.png" alt="Cinema RIO Oulu & Tampere marquee logo" />
          <span>
            <strong>CINEMA RIO</strong>
            <small>OULU • TAMPERE · FINLAND</small>
          </span>
        </a>

        <nav className="nav" aria-label="Main navigation">
          <button
            className={view === 'movies' ? 'nav-link active' : 'nav-link'}
            onClick={() => setView('movies')}
          >
            Movies &amp; Tickets
          </button>
          <button
            className={view === 'retrieve' ? 'nav-link active' : 'nav-link'}
            onClick={() => setView('retrieve')}
          >
            Find Booking
          </button>
          <button
            className={view === 'account' ? 'nav-link active' : 'nav-link'}
            onClick={() => setView('account')}
          >
            {customerAccount ? `Member: ${customerAccount.name}` : 'Customer Account'}
          </button>
          <button
            className={view === 'staff' ? 'nav-link active' : 'nav-link'}
            onClick={() => setView('staff')}
          >
            Staff &amp; Admin
          </button>
        </nav>

        <a className="header-cta" href="#movie-list" onClick={() => setView('movies')}>
          Book Tickets <span aria-hidden="true">↗</span>
        </a>
      </header>

      <div className="location-bar" aria-label="Cinema RIO Theater Locations">
        <div className="location-pills">
          <button
            type="button"
            className={cityFilter === 'all' ? 'loc-pill active' : 'loc-pill'}
            onClick={() => setCityFilter('all')}
          >
            All Locations (Oulu &amp; Tampere)
          </button>
          {RIO_LOCATIONS.map((loc) => (
            <button
              type="button"
              key={loc.id}
              className={cityFilter === loc.id ? 'loc-pill active' : 'loc-pill'}
              onClick={() => setCityFilter(loc.id)}
            >
              <strong>{loc.name}</strong> · {loc.address} · {loc.phone}
            </button>
          ))}
        </div>
      </div>

      <div className="message-region" aria-live="polite">
        {usingFallbackCatalog && (
          <div className="message warning-message">
            <span>
              <strong>Resilient Mode Active:</strong> External API/Database connection unavailable — running on Cinema
              RIO local backup catalog so customers can still browse and book seats without interruption.
            </span>
          </div>
        )}
        {error && (
          <div className="message error-message">
            {error}
            <button onClick={() => setError('')} aria-label="Dismiss error">
              ×
            </button>
          </div>
        )}
        {notice && (
          <div className="message success-message">
            {notice}
            <button onClick={() => setNotice('')} aria-label="Dismiss message">
              ×
            </button>
          </div>
        )}
      </div>

      {view === 'movies' && (
        <>
          <section className="hero" id="home">
            <div className="hero-content">
              <span className="eyebrow">
                <span className="live-dot" /> CINEMA RIO · OULU &amp; TAMPERE
              </span>
              <h1>
                Gold, Velvet &amp; <br />
                <em>The Big Screen.</em>
              </h1>
              <p>
                Experience cinema in Oulu and Tampere across our 100-seat and 200-seat auditoriums. Buy tickets online
                instantly without registering, or sign in to reserve seats and pay at the counter.
              </p>
              <div className="hero-cta-group">
                <a className="button button-primary" href="#movie-list">
                  Explore Movies &amp; Showtimes <span aria-hidden="true">↓</span>
                </a>
                <button className="button button-secondary" onClick={() => setView('account')}>
                  Customer Account
                </button>
              </div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="film-frame">
                <img className="hero-marquee-img" src="/rio-logo.png" alt="" />
                <strong>
                  OULU <br />
                  <i>&amp; TAMPERE</i>
                </strong>
                <small>100 &amp; 200 SEAT HALLS · NO ROW 13 · ♿ ACCESSIBLE</small>
              </div>
              <span className="hero-orbit orbit-one" />
              <span className="hero-orbit orbit-two" />
            </div>
            <div className="hero-foot">
              <span>DOORS OPEN: 15 MIN BEFORE ADS</span>
              <span>ADVERTISEMENTS: 12 MIN</span>
              <span>OULU &amp; TAMPERE AUDITORIUMS</span>
            </div>
          </section>

          <section className="movie-section" id="movie-list">
            <div className="section-heading">
              <div>
                <span className="section-kicker">NOW SHOWING AT CINEMA RIO</span>
                <h2>Find your film.</h2>
              </div>
              <span className="movie-count">
                {movies.length} {movies.length === 1 ? 'movie' : 'movies'} available
              </span>
            </div>
            <div className="filters">
              <label className="search-field">
                <span aria-hidden="true">⌕</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by movie title"
                  aria-label="Search movies by title"
                />
              </label>
              <label className="genre-field">
                <span className="sr-only">Filter by genre</span>
                <select value={genre} onChange={(event) => setGenre(event.target.value)}>
                  <option value="">All genres</option>
                  {genres.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {loadingMovies ? (
              <p className="empty-state">Loading movies…</p>
            ) : movies.length ? (
              <div className="movie-grid">
                {movies.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    isSelected={selectedMovie?.id === movie.id}
                    onSelect={() => selectMovie(movie)}
                  />
                ))}
              </div>
            ) : (
              <p className="empty-state">No movies match your search. Try another title or genre.</p>
            )}
          </section>

          {selectedMovie && (
            <section ref={detailsSectionRef} className="details-section" id="movie-details">
              <div className="details-header">
                <div>
                  <span className="section-kicker">MOVIE DETAILS &amp; SCHEDULE</span>
                  <h2>{selectedMovie.title}</h2>
                  <p>
                    {selectedMovie.release_year || 'Year unavailable'} <span aria-hidden="true">·</span>{' '}
                    {selectedMovie.genre} <span aria-hidden="true">·</span> {selectedMovie.duration_min} min{' '}
                    <span aria-hidden="true">·</span> Age Rating: <strong>{selectedMovie.age_rating}</strong>
                  </p>
                </div>
                <button
                  className="icon-button"
                  onClick={() => {
                    movieRequestId.current += 1;
                    setSelectedMovie(null);
                    setSelectedScreening(null);
                    setSeatData(null);
                  }}
                  aria-label="Close movie details"
                >
                  ×
                </button>
              </div>
              {selectedMovie.description && <p className="movie-description">{selectedMovie.description}</p>}

              <div className="schedule-policy-banner">
                <span>
                  <strong>Showtime Schedule Policy:</strong> Auditorium doors open <strong>15 minutes</strong> before
                  advertisements. Advertisements run for <strong>12 minutes</strong> before the feature film begins.
                </span>
              </div>

              <h3 className="subheading">
                Choose a screening ({cityFilter === 'all' ? 'Oulu & Tampere' : cityFilter.toUpperCase()})
              </h3>
              {visibleScreenings.length ? (
                <div className="screening-list">
                  {visibleScreenings.map((screening) => {
                    const timeline = getShowtimeSchedule(screening.starts_at);
                    const cityLabel =
                      inferCityFromAuditorium(screening.auditorium, screening.id) === 'tampere'
                        ? 'Cinema RIO Tampere'
                        : 'Cinema RIO Oulu';
                    return (
                      <button
                        className={`screening-option ${selectedScreening?.id === screening.id ? 'chosen' : ''}`}
                        key={screening.id}
                        onClick={() => {
                          setSelectedScreening(screening);
                          setSeatData(buildFallbackSeats(screening));
                          setSelectedSeats([]);
                          setBookingResult(null);
                        }}
                      >
                        <span>
                          <strong>{cityLabel}</strong> · {formatDate(screening.starts_at)}
                        </span>
                        <small>
                          {screening.auditorium} · {screening.available_seats} seats available
                        </small>
                        <small className="timeline-sub">
                          Doors {timeline.doorsOpenTime} · Ads {timeline.adsStartTime} (12m) · Film{' '}
                          {timeline.filmStartTime}
                        </small>
                        <strong>{formatEur(screening.base_price)}</strong>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="empty-state">No upcoming screenings are available for this location filter.</p>
              )}

              {selectedScreening && seatData && !bookingResult && (
                <div className="booking-panel">
                  <SeatMap
                    auditoriumName={seatData.screening.auditorium}
                    seats={seatData.seats}
                    selectedSeats={selectedSeats}
                    onChangeSelectedSeats={setSelectedSeats}
                  />

                  <form className="booking-form" onSubmit={submitBooking}>
                    <div className="checkout-mode-selector">
                      <span className="section-kicker">CHOOSE HOW TO BOOK</span>
                      <div className="mode-cards">
                        <label className={`mode-card ${paymentMode === 'online' ? 'active' : ''}`}>
                          <input
                            type="radio"
                            name="paymentMode"
                            value="online"
                            checked={paymentMode === 'online'}
                            onChange={() => setPaymentMode('online')}
                          />
                          <strong>1. Pay Online Now (Guest or Member)</strong>
                          <small>
                            No account required · Instant confirmation · Paid tickets are non-refundable / cannot be
                            cancelled
                          </small>
                        </label>

                        <label className={`mode-card ${paymentMode === 'counter' ? 'active' : ''}`}>
                          <input
                            type="radio"
                            name="paymentMode"
                            value="counter"
                            checked={paymentMode === 'counter'}
                            onChange={() => setPaymentMode('counter')}
                          />
                          <strong>2. Reserve &amp; Pay at Theater Counter (Account Required)</strong>
                          <small>
                            Requires Customer Account · Max 6 tickets · Auto-cancelled if not collected 2 hours before
                            showtime
                          </small>
                        </label>
                      </div>
                    </div>

                    {paymentMode === 'counter' && !customerAccount && (
                      <div className="counter-auth-prompt">
                        <span>
                          <strong>Account Required for Counter Reservation:</strong> Guests can pay online immediately,
                          but reserving seats to pay at the theater requires a registered account.
                        </span>
                        <button type="button" className="button button-secondary" onClick={() => setView('account')}>
                          Sign in / Register Account
                        </button>
                      </div>
                    )}

                    <label>
                      Your name
                      <input
                        required
                        maxLength="120"
                        value={customer.name}
                        onChange={(event) => setCustomer({ ...customer, name: event.target.value })}
                      />
                    </label>
                    <label>
                      Email for confirmation &amp; entrance pass
                      <input
                        required
                        type="email"
                        value={customer.email}
                        onChange={(event) => setCustomer({ ...customer, email: event.target.value })}
                      />
                    </label>

                    <div className="booking-total">
                      <div>
                        <span>
                          {selectedSeats.length ? selectedSeats.join(', ') : 'Select your seats'} ·{' '}
                          {selectedSeats.length} {selectedSeats.length === 1 ? 'ticket' : 'tickets'}
                        </span>
                        <small className="pricing-breakdown">
                          {selectedSeats.length} × {formatEur(unitTicketPrice)} base ticket price
                        </small>
                      </div>
                      <strong>{formatEur(computedTotalEur)}</strong>
                    </div>

                    <div className="checkout-buttons-row">
                      <button type="submit" className="button button-primary" disabled={!selectedSeats.length}>
                        {paymentMode === 'online'
                          ? 'Confirm & Pay Online Now'
                          : 'Confirm Counter Reservation (Pay 2h Before Film)'}
                      </button>
                      {paymentMode === 'online' && (
                        <button
                          type="button"
                          className="button button-secondary"
                          disabled={!selectedSeats.length}
                          onClick={startStripeHostedCheckout}
                        >
                          Pay via Stripe Hosted Checkout ↗
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              )}

              {bookingResult && (
                <div className="booking-receipt">
                  <span className="receipt-check">✓</span>
                  <div>
                    <span className="section-kicker">
                      {bookingResult.paymentMode === 'counter'
                        ? 'COUNTER RESERVATION HELD (UNPAID)'
                        : 'ONLINE TICKET PAID & CONFIRMED'}
                    </span>
                    <h3>Present this Entrance Pass at Cinema RIO.</h3>
                    <p>
                      Booking Reference: <strong>{bookingResult.booking.booking_ref}</strong>
                    </p>
                    <p>
                      Film: <strong>{bookingResult.booking.movie_title}</strong> ({selectedMovie.age_rating}) · Seats:{' '}
                      <strong>{bookingResult.booking.seats.join(', ')}</strong> · Total:{' '}
                      <strong>
                        {formatEur(bookingResult.computedTotalEur ?? bookingResult.booking.total_price)}
                      </strong>
                    </p>
                    {bookingResult.paymentMode === 'counter' ? (
                      <p className="email-warning">
                        <strong>Important Pickup Rule:</strong> You must arrive and pay at the theater counter at least{' '}
                        <strong>2 hours before the movie starts</strong>, otherwise your reservation is automatically
                        cancelled.
                      </p>
                    ) : (
                      <p className="email-sent">
                        <strong>Entrance &amp; Cancellation Policy:</strong> Paid tickets are final and cannot be
                        cancelled.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {view === 'account' && (
        <section className="workspace-section">
          <span className="section-kicker">CINEMA RIO CUSTOMER MEMBERSHIP</span>
          <h1>Customer Account.</h1>
          <p className="workspace-intro">
            Guests can buy and pay for tickets online without registering. Create or sign in to a Customer Account if
            you want to <strong>reserve seats and pay at the theater counter</strong> (up to 6 tickets, pickup 2h
            before showtime).
          </p>

          {customerAccount ? (
            <article className="result-card">
              <span className="section-kicker">SIGNED-IN CUSTOMER</span>
              <h2>{customerAccount.name}</h2>
              <p>Email: {customerAccount.email}</p>
              <p>
                Benefits Active: <strong>Reserve &amp; Pay at Theater (up to 6 seats)</strong>
              </p>
              <div className="form-actions" style={{ marginTop: '18px' }}>
                <button className="button button-primary" onClick={() => setView('movies')}>
                  Browse Movies &amp; Book Seats
                </button>
                <button className="button button-secondary" onClick={handleCustomerLogout}>
                  Sign out
                </button>
              </div>
            </article>
          ) : (
            <form className="stack-form retrieve-form" onSubmit={handleCustomerAuth}>
              <label>
                Full name
                <input
                  required
                  placeholder="Aino Virtanen"
                  value={accountForm.name}
                  onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                />
              </label>
              <label>
                Email address
                <input
                  required
                  type="email"
                  placeholder="aino@example.fi"
                  value={accountForm.email}
                  onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                />
              </label>
              <label>
                Password
                <input
                  required
                  type="password"
                  minLength="6"
                  value={accountForm.password}
                  onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                />
              </label>
              <button className="button button-primary" type="submit">
                Sign In / Register Customer Account
              </button>
            </form>
          )}
        </section>
      )}

      {view === 'retrieve' && (
        <section className="workspace-section">
          <span className="section-kicker">YOUR RESERVATION &amp; ENTRANCE PASS</span>
          <h1>Find your booking.</h1>
          <p className="workspace-intro">
            Enter the booking reference from your confirmation and the email used to book.
          </p>
          <form className="stack-form retrieve-form" onSubmit={retrieveBooking}>
            <label>
              Booking reference
              <input
                required
                placeholder="FH-A1B2C3D4E5"
                value={bookingLookup.reference}
                onChange={(event) => setBookingLookup({ ...bookingLookup, reference: event.target.value })}
              />
            </label>
            <label>
              Booking email
              <input
                required
                type="email"
                value={bookingLookup.email}
                onChange={(event) => setBookingLookup({ ...bookingLookup, email: event.target.value })}
              />
            </label>
            <button className="button button-primary">Retrieve booking</button>
          </form>
          {retrievedBooking && (
            <article className="result-card">
              <span className="section-kicker">BOOKING {retrievedBooking.status.toUpperCase()}</span>
              <h2>{retrievedBooking.movie_title}</h2>
              <p>
                {formatDate(retrievedBooking.starts_at)} · {retrievedBooking.auditorium}
              </p>
              <p>
                Seats: <strong>{retrievedBooking.seats.join(', ')}</strong> · Total:{' '}
                <strong>{formatEur(retrievedBooking.total_price)}</strong>
              </p>
              <p>
                Entrance Reference: <strong>{retrievedBooking.booking_ref}</strong>
              </p>
            </article>
          )}
        </section>
      )}

      {view === 'staff' && (
        <section className="workspace-section staff-workspace">
          {!staffToken ? (
            <>
              <span className="section-kicker">THEATER STAFF &amp; ADMIN ACCESS</span>
              <h1>Staff Sign In.</h1>
              <p className="workspace-intro">
                Authorized access for Cinema RIO Staff and Admins to manage movies, seating maps, showtimes, and
                bookings.
              </p>
              <form className="stack-form retrieve-form" onSubmit={staffLogin}>
                <label>
                  Staff / Admin email
                  <input
                    required
                    type="email"
                    autoComplete="username"
                    value={login.email}
                    onChange={(event) => setLogin({ ...login, email: event.target.value })}
                  />
                </label>
                <label>
                  Password
                  <input
                    required
                    type="password"
                    autoComplete="current-password"
                    value={login.password}
                    onChange={(event) => setLogin({ ...login, password: event.target.value })}
                  />
                </label>
                <button className="button button-primary">Sign in</button>
              </form>
              <p className="muted-note">
                Staff access is authenticated on the server via ADMIN_EMAIL and ADMIN_PASSWORD.
              </p>
            </>
          ) : (
            <>
              <div className="staff-heading">
                <div>
                  <span className="section-kicker">CINEMA RIO MANAGEMENT PORTAL</span>
                  <h1>Staff &amp; Admin Dashboard.</h1>
                </div>
                <button className="button button-secondary" onClick={signOut}>
                  Sign out
                </button>
              </div>

              <div className="admin-grid">
                <section className="admin-card">
                  <span className="section-kicker">
                    {editingMovieId ? 'EDIT MOVIE' : 'MOVIE CATALOGUE & OPEN API IMPORT'}
                  </span>
                  <h2>{editingMovieId ? 'Update movie' : 'Add or import a movie'}</h2>

                  <div className="open-api-import-bar">
                    <small>Quick import from Open Movie API:</small>
                    <div className="open-api-chips">
                      {OPEN_API_SAMPLE_MOVIES.map((sample) => (
                        <button
                          key={sample.title}
                          type="button"
                          className="loc-pill"
                          onClick={() => fillFromOpenApiSample(sample)}
                        >
                          + {sample.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  <form className="stack-form" onSubmit={saveMovie}>
                    <label>
                      Title
                      <input
                        required
                        maxLength="180"
                        value={movieForm.title}
                        onChange={(event) => setMovieForm({ ...movieForm, title: event.target.value })}
                      />
                    </label>
                    <label>
                      Description
                      <textarea
                        maxLength="5000"
                        rows="3"
                        value={movieForm.description}
                        onChange={(event) => setMovieForm({ ...movieForm, description: event.target.value })}
                      />
                    </label>
                    <div className="form-row">
                      <label>
                        Genre
                        <input
                          required
                          value={movieForm.genre}
                          onChange={(event) => setMovieForm({ ...movieForm, genre: event.target.value })}
                        />
                      </label>
                      <label>
                        Duration (min)
                        <input
                          required
                          type="number"
                          min="1"
                          max="600"
                          value={movieForm.duration_min}
                          onChange={(event) => setMovieForm({ ...movieForm, duration_min: event.target.value })}
                        />
                      </label>
                    </div>
                    <label>
                      Release year
                      <input
                        required
                        type="number"
                        min="1888"
                        max="2100"
                        value={movieForm.release_year}
                        onChange={(event) => setMovieForm({ ...movieForm, release_year: event.target.value })}
                      />
                    </label>
                    <div className="form-row">
                      <label>
                        Age rating
                        <input
                          required
                          placeholder="PG-13"
                          value={movieForm.age_rating}
                          onChange={(event) => setMovieForm({ ...movieForm, age_rating: event.target.value })}
                        />
                      </label>
                      <label>
                        Poster URL
                        <input
                          type="url"
                          placeholder="https://"
                          value={movieForm.poster_url}
                          onChange={(event) => setMovieForm({ ...movieForm, poster_url: event.target.value })}
                        />
                      </label>
                    </div>
                    <div className="form-actions">
                      <button className="button button-primary">
                        {editingMovieId ? 'Save changes' : 'Add movie'}
                      </button>
                      {editingMovieId && (
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => {
                            setEditingMovieId(null);
                            setMovieForm(emptyMovie);
                          }}
                        >
                          Stop editing
                        </button>
                      )}
                    </div>
                  </form>
                  <div className="admin-list">
                    {adminMovies.map((movie) => (
                      <div className="admin-list-row" key={movie.id}>
                        <span>
                          <strong>{movie.title}</strong>
                          <small>
                            {movie.release_year || 'Year unavailable'} · {movie.genre} · {movie.duration_min} min
                          </small>
                        </span>
                        <span className="row-actions">
                          <button
                            className="text-button"
                            onClick={() => {
                              setEditingMovieId(movie.id);
                              setMovieForm({
                                ...movie,
                                duration_min: String(movie.duration_min),
                                poster_url: movie.poster_url || ''
                              });
                            }}
                          >
                            Edit
                          </button>
                          <button className="text-button danger-text" onClick={() => removeMovie(movie.id)}>
                            Delete
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="admin-card">
                  <span className="section-kicker">{editingScreeningId ? 'EDIT SCREENING' : 'SHOWTIMES'}</span>
                  <h2>{editingScreeningId ? 'Update screening' : 'Schedule a screening'}</h2>
                  <form className="stack-form" onSubmit={saveScreening}>
                    <label>
                      Movie
                      <select
                        required
                        value={screeningForm.movie_id}
                        onChange={(event) => setScreeningForm({ ...screeningForm, movie_id: event.target.value })}
                      >
                        <option value="">Select a movie</option>
                        {adminMovies.map((movie) => (
                          <option key={movie.id} value={movie.id}>
                            {movie.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Auditorium
                      <select
                        required
                        value={screeningForm.auditorium_id}
                        onChange={(event) =>
                          setScreeningForm({ ...screeningForm, auditorium_id: event.target.value })
                        }
                      >
                        <option value="">Select a screen</option>
                        {auditoriums.map((room) => (
                          <option key={room.id} value={room.id}>
                            {room.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="form-row">
                      <label>
                        Date and time
                        <input
                          required
                          type="datetime-local"
                          value={screeningForm.starts_at}
                          onChange={(event) =>
                            setScreeningForm({ ...screeningForm, starts_at: event.target.value })
                          }
                        />
                      </label>
                      <label>
                        Base ticket price (€)
                        <input
                          required
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={screeningForm.base_price}
                          onChange={(event) =>
                            setScreeningForm({ ...screeningForm, base_price: event.target.value })
                          }
                        />
                      </label>
                    </div>
                    <div className="form-actions">
                      <button className="button button-primary">
                        {editingScreeningId ? 'Save changes' : 'Create screening'}
                      </button>
                      {editingScreeningId && (
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => {
                            setEditingScreeningId(null);
                            setScreeningForm(emptyScreening);
                          }}
                        >
                          Stop editing
                        </button>
                      )}
                    </div>
                  </form>
                  <div className="admin-list">
                    {adminScreenings.map((screening) => (
                      <div className="admin-list-row" key={screening.id}>
                        <span>
                          <strong>{screening.movie_title}</strong>
                          <small>
                            {formatDate(screening.starts_at)} · {screening.auditorium} · {screening.status}
                          </small>
                        </span>
                        {screening.status === 'scheduled' && (
                          <span className="row-actions">
                            <button
                              className="text-button"
                              onClick={() => {
                                setEditingScreeningId(screening.id);
                                setScreeningForm({
                                  movie_id: String(screening.movie_id),
                                  auditorium_id: String(screening.auditorium_id),
                                  starts_at: toLocalDateTime(screening.starts_at),
                                  base_price: String(screening.base_price)
                                });
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="text-button danger-text"
                              onClick={() => cancelScreening(screening.id)}
                            >
                              Cancel
                            </button>
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="admin-card bookings-card">
                  <span className="section-kicker">CUSTOMER RESERVATIONS &amp; CANCELLATIONS</span>
                  <h2>
                    Customer bookings <span className="subtle-count">{adminBookings.length}</span>
                  </h2>
                  {adminBookings.length ? (
                    <div className="admin-list">
                      {adminBookings.map((booking) => (
                        <div className="admin-list-row booking-row" key={booking.id}>
                          <span>
                            <strong>
                              {booking.booking_ref} · {booking.customer_name}
                            </strong>
                            <small>
                              {booking.customer_email} · {booking.movie_title} · Seats: {booking.seats.join(', ')}
                            </small>
                            <small>
                              {formatDate(booking.starts_at)} · {formatEur(booking.total_price)} · {booking.status}
                            </small>
                          </span>
                          {booking.status === 'confirmed' && (
                            <button className="text-button danger-text" onClick={() => cancelBooking(booking)}>
                              Cancel eligible reservation
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-state">No bookings yet.</p>
                  )}
                </section>
              </div>
            </>
          )}
        </section>
      )}

      <footer className="site-footer">
        <div>
          <strong>CINEMA RIO</strong> <i>·</i> OULU (Kauppurienkatu 45 · +358 8 5542 3890) &amp; TAMPERE (Hämeenkatu 27
          · +358 2 2641 7520)
        </div>
        <div className="footer-links">
          <button onClick={() => setView('retrieve')}>Retrieve a booking</button>
          <button onClick={() => setView('account')}>Customer Account</button>
        </div>
      </footer>
    </main>
  );
}
