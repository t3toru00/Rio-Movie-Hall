import { SHOWTIME_RULES } from '../data/rioCinemaData';

/**
 * Converts a 0-based row index to the customer-facing Row Number.
 * Client interview rule: "in my theater, I dont want row 13, just 12 and 14"
 */
export function getDisplayRowNumber(rowIndex) {
  const oneBased = rowIndex + 1;
  return oneBased >= 13 ? oneBased + 1 : oneBased;
}

/**
 * Returns the snake seat number (numbering from the screen, 10 seats per row,
 * alternating left-to-right and right-to-left, and never using seat number 13).
 */
export function getSnakeSeatNumber(rowIndex, colIndex, colsPerRow = 10) {
  const offsetInRow = rowIndex % 2 === 0 ? colIndex : (colsPerRow - 1 - colIndex);
  const rawNumber = rowIndex * colsPerRow + offsetInRow + 1;
  return rawNumber >= 13 ? rawNumber + 1 : rawNumber;
}

/**
 * Parses backend seat labels like "A1", "B10" into { rowIndex, colIndex }
 */
export function parseSeatLabel(label) {
  const match = /^([A-Z])(\d+)$/.exec(String(label).trim().toUpperCase());
  if (!match) return { rowIndex: 0, colIndex: 0 };
  return {
    rowIndex: match[1].charCodeAt(0) - 65,
    colIndex: Number(match[2]) - 1
  };
}

/**
 * Organizes flat backend seats array into structured rows with Cinema RIO metadata:
 * - displayRowNumber (skips 13)
 * - snakeNumber (snake pattern from screen, skips 13)
 * - isWheelchair (Row 1 limited wheelchair seats)
 */
export function buildCinemaRioRows(seats = [], maxWheelchairSeats = 4) {
  const rowsMap = new Map();

  for (const seat of seats) {
    const { rowIndex, colIndex } = parseSeatLabel(seat.label);
    if (!rowsMap.has(rowIndex)) {
      rowsMap.set(rowIndex, []);
    }
    rowsMap.get(rowIndex).push({
      ...seat,
      rowIndex,
      colIndex
    });
  }

  const sortedRowIndices = [...rowsMap.keys()].sort((a, b) => a - b);

  return sortedRowIndices.map((rowIndex) => {
    const rowSeats = rowsMap.get(rowIndex).sort((a, b) => a.colIndex - b.colIndex);
    const colsPerRow = rowSeats.length || 10;
    const displayRow = getDisplayRowNumber(rowIndex);
    const isWheelchairRow = rowIndex === 0;

    return {
      rowIndex,
      displayRow,
      isWheelchairRow,
      direction: rowIndex % 2 === 0 ? 'L→R' : 'R←L',
      seats: rowSeats.map((seat, idx) => ({
        ...seat,
        displayRow,
        snakeNumber: getSnakeSeatNumber(rowIndex, idx, colsPerRow),
        isWheelchair: isWheelchairRow && idx < maxWheelchairSeats
      }))
    };
  });
}

/**
 * Detects single-seat gaps ("orphan seats") created by the current selection.
 * Rule: "system alert please dont leave 1 seat between 02 seats: maybe system will auto choose the seat, and send the alert"
 */
export function detectSingleSeatGaps(rows, selectedSeats = []) {
  const selectedSet = new Set(selectedSeats);
  const gapSeats = [];

  for (const row of rows) {
    const rowHasSelection = row.seats.some((s) => selectedSet.has(s.label));
    if (!rowHasSelection) continue;

    const states = row.seats.map((seat) => {
      if (!seat.available) return 'taken';
      if (selectedSet.has(seat.label)) return 'selected';
      return 'empty';
    });

    for (let i = 0; i < states.length; i += 1) {
      if (states[i] !== 'empty') continue;
      const leftOccupied = i > 0 && (states[i - 1] === 'selected' || states[i - 1] === 'taken');
      const rightOccupied = i < states.length - 1 && (states[i + 1] === 'selected' || states[i + 1] === 'taken');
      const touchesSelection =
        (i > 0 && states[i - 1] === 'selected') ||
        (i < states.length - 1 && states[i + 1] === 'selected');

      if (leftOccupied && rightOccupied && touchesSelection) {
        gapSeats.push(row.seats[i]);
      }
    }
  }

  return gapSeats;
}

/**
 * Auto-resolves single-seat gaps in a row by shifting the user's selected seats together
 * or recommending contiguous seats in the same row.
 */
export function autoResolveSeatGaps(rows, selectedSeats = []) {
  const selectedSet = new Set(selectedSeats);
  const nextSelection = [];

  for (const row of rows) {
    const userSeatsInRow = row.seats.filter((s) => selectedSet.has(s.label));
    if (userSeatsInRow.length === 0) continue;

    const needed = userSeatsInRow.length;
    const availableInRow = row.seats.filter((s) => s.available);

    // Find a contiguous block of length `needed` in this row that does not leave a 1-seat gap next to taken seats
    let bestBlock = null;
    for (let start = 0; start <= row.seats.length - needed; start += 1) {
      const slice = row.seats.slice(start, start + needed);
      if (!slice.every((s) => s.available)) continue;

      // Check if this block creates a 1-seat gap with already-taken seats
      const testSelected = new Set(slice.map((s) => s.label));
      const gaps = detectSingleSeatGaps([row], [...testSelected]);
      if (gaps.length === 0) {
        bestBlock = slice;
        break;
      }
      if (!bestBlock) bestBlock = slice;
    }

    if (bestBlock) {
      nextSelection.push(...bestBlock.map((s) => s.label));
    } else {
      nextSelection.push(...availableInRow.slice(0, needed).map((s) => s.label));
    }
  }

  return nextSelection;
}

/**
 * Guides the customer by suggesting the best available contiguous seats near the center of the auditorium
 * without creating any 1-seat gap.
 * Rule: "when people are reserving seats, i would like to guide customer to choose seats"
 */
export function suggestBestSeats(rows, count = 2) {
  if (!rows.length || count < 1) return [];
  const idealRowIndex = Math.floor(rows.length / 2);

  const rankedRows = [...rows].sort(
    (a, b) => Math.abs(a.rowIndex - idealRowIndex) - Math.abs(b.rowIndex - idealRowIndex)
  );

  for (const row of rankedRows) {
    // Prefer standard rows over Row 1 wheelchair row unless only Row 1 is available
    if (row.isWheelchairRow && rankedRows.length > 1) continue;

    const cols = row.seats.length;
    const idealColStart = Math.max(0, Math.floor((cols - count) / 2));
    const candidateStarts = [];
    for (let start = 0; start <= cols - count; start += 1) {
      candidateStarts.push(start);
    }
    candidateStarts.sort((a, b) => Math.abs(a - idealColStart) - Math.abs(b - idealColStart));

    for (const start of candidateStarts) {
      const block = row.seats.slice(start, start + count);
      if (!block.every((s) => s.available)) continue;
      const labels = block.map((s) => s.label);
      if (detectSingleSeatGaps([row], labels).length === 0) {
        return labels;
      }
    }
  }

  // Fallback: pick first `count` available seats
  const allAvailable = rows.flatMap((r) => r.seats).filter((s) => s.available);
  return allAvailable.slice(0, count).map((s) => s.label);
}

/**
 * Computes doors-open, advertisement-start, and feature-film-start times.
 * Rule: "showtimes: advertisement 12ph, door open 15 minutes before advertisement"
 */
export function getShowtimeSchedule(startsAtIso) {
  const adsStart = new Date(startsAtIso);
  const doorsOpen = new Date(adsStart.getTime() - SHOWTIME_RULES.doorsOpenMinutesBeforeAds * 60_000);
  const filmStart = new Date(adsStart.getTime() + SHOWTIME_RULES.advertisementDurationMinutes * 60_000);

  const timeFmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });
  return {
    doorsOpenTime: timeFmt.format(doorsOpen),
    adsStartTime: timeFmt.format(adsStart),
    filmStartTime: timeFmt.format(filmStart)
  };
}

/**
 * Formats EUR currency consistently
 */
export function formatEur(amount) {
  return `€${Number(amount || 0).toFixed(2)}`;
}
