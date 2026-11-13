import { buildCinemaRioRows } from '../utils/seatRules';

export default function SeatMap({
  auditoriumName,
  seats = [],
  selectedSeats = [],
  onChangeSelectedSeats
}) {
  const rows = buildCinemaRioRows(seats, 4);

  function toggleSeat(seat) {
    if (!seat.available) return;
    const isSelected = selectedSeats.includes(seat.label);
    const next = isSelected
      ? selectedSeats.filter((item) => item !== seat.label)
      : [...selectedSeats, seat.label];
    onChangeSelectedSeats(next);
  }

  return (
    <div className="rio-seat-experience">
      <div className="seat-toolbar">
        <div>
          <span className="section-kicker">CINEMA RIO AUDITORIUM MAP</span>
          <h3>{auditoriumName}</h3>
          <p className="seat-rule-note">
            Snake numbering from screen (10 seats/row) · No Row 13 or Seat #13 · Row 1 reserved for ♿ Wheelchair access
          </p>
        </div>
      </div>

      <div className="auditorium-stage">
        <div className="screen-curve">
          <span>CINEMA RIO SILVER SCREEN (FRONT)</span>
        </div>

        <div className="rio-rows-container" role="group" aria-label="Select available seats">
          {rows.map((row) => (
            <div
              key={row.rowIndex}
              className={`rio-seat-row ${row.isWheelchairRow ? 'wheelchair-row' : ''} ${
                row.displayRow === 14 ? 'skipped-row-13' : ''
              }`}
            >
              <div className="row-label">
                <strong>Row {row.displayRow}</strong>
                <small>{row.isWheelchairRow ? '♿ Accessible' : row.direction}</small>
              </div>

              <div className="row-seats-grid">
                {row.seats.map((seat) => {
                  const isSelected = selectedSeats.includes(seat.label);
                  return (
                    <button
                      type="button"
                      key={seat.label}
                      disabled={!seat.available}
                      aria-pressed={isSelected}
                      aria-label={`Row ${seat.displayRow}, Snake Seat ${seat.snakeNumber} (${seat.label})${
                        seat.isWheelchair ? ', Wheelchair accessible' : ''
                      }${seat.available ? '' : ', unavailable'}`}
                      title={`Row ${seat.displayRow} · Seat #${seat.snakeNumber} (${seat.label})${
                        seat.isWheelchair ? ' · ♿ Wheelchair Accessible' : ''
                      }`}
                      className={[
                        'seat',
                        !seat.available ? 'unavailable' : '',
                        isSelected ? 'selected' : '',
                        seat.isWheelchair ? 'wheelchair-seat' : ''
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => toggleSeat(seat)}
                    >
                      <span className="seat-snake-num">
                        {seat.isWheelchair ? `♿${seat.snakeNumber}` : seat.snakeNumber}
                      </span>
                      <small className="seat-code-sub">{seat.label}</small>
                    </button>
                  );
                })}
              </div>

              <div className="row-label row-label-right">
                <strong>R{row.displayRow}</strong>
              </div>
            </div>
          ))}
        </div>

        <div className="auditorium-back-entrances">
          <div className="entrance-badge">🚪↗ BACK ENTRANCE (LEFT SIDE)</div>
          <div className="entrance-center-note">REAR OF AUDITORIUM</div>
          <div className="entrance-badge">↖🚪 BACK ENTRANCE (RIGHT SIDE)</div>
        </div>
      </div>

      <div className="seat-legend">
        <span>
          <i className="legend-dot available-dot" /> Available
        </span>
        <span>
          <i className="legend-dot selected-dot" /> Selected
        </span>
        <span>
          <i className="legend-dot wheelchair-dot" /> ♿ Wheelchair Row (Row 1)
        </span>
        <span>
          <i className="legend-dot taken-dot" /> Reserved / Sold
        </span>
      </div>
    </div>
  );
}
