/**
 * Returns `count` UTC Date objects spread randomly across the remaining PT send window.
 * Emails are scheduled at least 20 minutes from now and no later than windowEndHour PT.
 * If the window has already passed for today, returns an empty array.
 */
export function scheduleEmailsInWindow(
  count: number,
  windowStartHour: number,
  windowEndHour: number,
): Date[] {
  if (count === 0) return [];

  const now = new Date();

  // toLocaleString on a UTC Node process gives a Date whose .getHours()
  // reflects PT clock time (the string is parsed as local = UTC on Vercel).
  const ptNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  const ptCurrentMinutes = ptNow.getHours() * 60 + ptNow.getMinutes();

  // UTC-PT offset in ms (positive: PT is behind UTC)
  const utcOffsetMs = now.getTime() - ptNow.getTime();

  const windowStartMinutes = windowStartHour * 60;
  const windowEndMinutes = windowEndHour * 60;

  // Must be at least 20 min from now and within the declared window
  const effectiveStartMinutes = Math.max(windowStartMinutes, ptCurrentMinutes + 20);
  if (effectiveStartMinutes >= windowEndMinutes) return [];

  const span = windowEndMinutes - effectiveStartMinutes;

  // PT midnight as a real UTC Date
  const ptMidnight = new Date(ptNow);
  ptMidnight.setHours(0, 0, 0, 0);
  const ptMidnightUTC = new Date(ptMidnight.getTime() + utcOffsetMs);

  return Array.from({ length: count }, () => {
    const offsetMinutes = Math.floor(Math.random() * span);
    return new Date(ptMidnightUTC.getTime() + (effectiveStartMinutes + offsetMinutes) * 60_000);
  });
}
