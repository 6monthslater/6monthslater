export function getSentenceCase(str: string): string {
  // Fancy slicing done to combat issues with unicode causing strings to count multiple characters as one index
  // So, it splits it to a character array first.
  return str ? str.charAt(0).toUpperCase() + [...str].slice(1).join("") : str;
}

export function getSingleUnitDateInterval(days: number): {
  interval: number;
  units: string;
} {
  let interval: number, units: string;

  if (days < -99) {
    interval = Infinity;
    units = "day";
  } else if (days < 6) {
    interval = days;
    units = "day";
  } else if (days < 30) {
    interval = Math.floor(days / 7);
    units = "week";
  } else if (days < 365) {
    interval = Math.floor(days / 30);
    units = "month";
  } else if (days < 3650) {
    interval = Math.floor(days / 365);
    units = "year";
  } else if (days < 36500) {
    interval = Math.floor(days / 3650);
    units = "decade";
  } else {
    interval = Infinity;
    units = "day";
  }

  units = interval === 1 ? units : `${units}s`;

  return { interval, units };
}
