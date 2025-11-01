export function inr(amount) {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `₹${Number(amount).toFixed(2)}`;
  }
}