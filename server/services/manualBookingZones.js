const NUSC_HOME_MATCH_SLUG_PREFIX = 'nusc-home-match-';
const NUSC_GENERAL_ZONES = new Set(['G-1', 'G-2', 'G-3', 'G-4', 'G-5']);

function normalizeManualBookingZone(zone) {
  return typeof zone === 'string' ? zone.trim().toUpperCase() : zone;
}

function getManualBookingZoneError(eventSlug, ticketItems) {
  const isNuscHomeMatchEvent = typeof eventSlug === 'string'
    && eventSlug.startsWith(NUSC_HOME_MATCH_SLUG_PREFIX);

  for (const item of ticketItems) {
    const hasZone = item.zone !== undefined
      && item.zone !== null
      && !(typeof item.zone === 'string' && item.zone.trim() === '');
    const zone = normalizeManualBookingZone(item.zone);
    const isValidZone = typeof zone === 'string' && NUSC_GENERAL_ZONES.has(zone);

    if (hasZone && (!isNuscHomeMatchEvent || item.ticketType !== 'General Pass' || !isValidZone)) {
      return 'Seating zones are only valid as G-1 through G-5 for NUSC Home Match General Pass tickets.';
    }

    if (isNuscHomeMatchEvent && item.ticketType === 'General Pass' && !isValidZone) {
      return 'Choose a seating zone from G-1 to G-5 for each NUSC General Pass ticket.';
    }
  }

  return null;
}

module.exports = {
  getManualBookingZoneError,
  normalizeManualBookingZone,
};
