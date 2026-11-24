export function calculateRoyaltyRate(rate: number, amount: number): number {
  if (rate < 0 || amount < 0) {
    throw new Error('Rate and amount must be non-negative');
  }
  return (rate / 100) * amount;
}
