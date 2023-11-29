export function getSentenceCase(str: string): string {
  // Fancy slicing done to combat issues with unicode causing strings to count multiple characters as one index
  // So, it splits it to a character array first.
  return str ? str.charAt(0).toUpperCase() + [...str].slice(1).join("") : str;
}
