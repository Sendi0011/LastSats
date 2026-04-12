/** Approximate BTC/sBTC price in USD — replace with live feed when ready */
export const BTC_PRICE_USD = 97_000;

/** Format a sBTC amount to a USD string */
export function formatUsd(sbtc: number): string {
  return (sbtc * BTC_PRICE_USD).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

/** Format a sBTC amount with 5 decimal places */
export function formatSbtc(amount: number): string {
  return amount.toFixed(5);
}

/** Shorten a Stacks address for display */
export function shortAddress(address: string, start = 6, end = 4): string {
  if (address.length <= start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}
