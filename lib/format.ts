const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const coins = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export function formatMoney(amount: number) {
  return inr.format(amount);
}

export function formatSignedMoney(amount: number) {
  if (amount > 0) return `+${inr.format(amount)}`;
  if (amount < 0) return `-${inr.format(Math.abs(amount))}`;
  return inr.format(0);
}

export function formatCoins(amount: number) {
  return coins.format(amount);
}

export function defaultGameName(date = new Date()) {
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${weekday}_${yyyy}${mm}${dd}`;
}
