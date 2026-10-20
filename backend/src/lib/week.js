/** Week boundary rules: Monday–Sunday in UTC. week_start is always a Monday. */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function toIsoDateUtc(date) {
  return date.toISOString().slice(0, 10);
}

export function parseIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || toIsoDateUtc(date) !== value) {
    return null;
  }
  return date;
}

export function startOfWeekMonday(input = new Date()) {
  const source = input instanceof Date ? input : parseIsoDate(input);
  if (!source || Number.isNaN(source.getTime())) {
    throw new Error("Invalid date");
  }
  const utc = new Date(
    Date.UTC(source.getUTCFullYear(), source.getUTCMonth(), source.getUTCDate())
  );
  const day = utc.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  utc.setUTCDate(utc.getUTCDate() + diff);
  return toIsoDateUtc(utc);
}

export function endOfWeekSunday(weekStart) {
  const start = parseIsoDate(weekStart) ?? parseIsoDate(startOfWeekMonday(weekStart));
  if (!start) {
    throw new Error("Invalid week start");
  }
  return toIsoDateUtc(new Date(start.getTime() + 6 * MS_PER_DAY));
}

export function normalizeWeekStart(value) {
  if (!value) {
    return startOfWeekMonday(new Date());
  }
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return null;
  }
  return startOfWeekMonday(parsed);
}

export function weekLabel(weekStart) {
  const start = parseIsoDate(weekStart);
  if (!start) return weekStart;
  const end = parseIsoDate(endOfWeekSunday(weekStart));
  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const year = start.getUTCFullYear();
  return `${fmt.format(start)} – ${fmt.format(end)}, ${year} (UTC)`;
}

/**
 * Returns the Monday that starts the week immediately after the given weekStart.
 * weekStart must be a YYYY-MM-DD string for a Monday.
 */
export function nextWeekStart(weekStart) {
  const start = parseIsoDate(weekStart);
  if (!start) throw new Error("Invalid weekStart");
  return toIsoDateUtc(new Date(start.getTime() + 7 * MS_PER_DAY));
}
