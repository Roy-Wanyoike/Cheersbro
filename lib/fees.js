// Cheersbro fee and split logic
const FEE_PERCENT = Number(process.env.CHEERSBRO_FEE_PERCENT || 2); // default 2%

export function calculateSplit(amount) {
  const fee = Number((amount * (FEE_PERCENT / 100)).toFixed(2));
  const recipient = Number((amount - fee).toFixed(2));
  return { fee, recipient, feePercent: FEE_PERCENT };
}

export function getFeePercent() {
  return FEE_PERCENT;
}
