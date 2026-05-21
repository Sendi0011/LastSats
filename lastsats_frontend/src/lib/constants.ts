/** Default BTC price fallback if API fails */
const DEFAULT_BTC_PRICE = 97_000;

/** Cached BTC price with timestamp */
let cachedPrice = { value: DEFAULT_BTC_PRICE, timestamp: 0 };
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/** Fetch live BTC price from Coinbase API */
export async function fetchBtcPrice(): Promise<number> {
  const now = Date.now();
  
  // Return cached price if still fresh
  if (now - cachedPrice.timestamp < CACHE_DURATION) {
    return cachedPrice.value;
  }

  try {
    const response = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=BTC');
    const data = await response.json();
    const price = parseFloat(data.data.rates.USD);
    
    if (price > 0) {
      cachedPrice = { value: price, timestamp: now };
      return price;
    }
  } catch (error) {
    console.warn('Failed to fetch BTC price, using cached/default:', error);
  }
  
  return cachedPrice.value;
}

/** Format a sBTC amount to a USD string */
export async function formatUsd(sbtc: number): Promise<string> {
  const btcPrice = await fetchBtcPrice();
  return (sbtc * btcPrice).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

/** Synchronous USD formatting with cached price (for components that can't use async) */
export function formatUsdSync(sbtc: number): string {
  return (sbtc * cachedPrice.value).toLocaleString('en-US', {
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
