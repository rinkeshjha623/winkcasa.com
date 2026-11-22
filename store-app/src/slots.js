// "Twice a day" scheduling: a skill with slots [7,17] runs once after 7:00 and once after 17:00 India time.
const IST = 330 * 60000;
export function dueBySlots(now, last, slots) {
  const dayStart = Math.floor((now + IST) / 86400000) * 86400000 - IST; // today 00:00 IST as epoch
  const opened = slots.map((h) => dayStart + h * 3600000).filter((t) => t <= now);
  if (!opened.length) return false;               // before today's first slot
  return (last || 0) < Math.max(...opened);       // not yet run since the latest slot opened
}
