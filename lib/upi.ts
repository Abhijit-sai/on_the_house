export function upiLink(upiId: string, payeeName: string, amount: number, gameName: string) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: amount.toFixed(2),
    cu: "INR",
    tn: `Game settlement - ${gameName}`,
  });

  return `upi://pay?${params.toString()}`;
}
