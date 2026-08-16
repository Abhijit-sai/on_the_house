import { ImageResponse } from "next/og";
import { getPublicGameDetail } from "@/features/poker/public-queries";
import { roundMoney } from "@/features/settlement/calculations";

export const runtime = "nodejs";
export const alt = "Poker Night on On the House";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const statusCopy: Record<string, string> = {
  draft: "Table being set",
  live: "LIVE NOW",
  paused: "Paused",
  tally_pending: "Counting chips",
  pending_settlement: "Settling up",
  closed: "Final results",
  cancelled: "Cancelled",
};

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const detail = await getPublicGameDetail(token).catch(() => null);

  const title = detail?.game.name ?? "Poker Night";
  const status = detail ? (statusCopy[detail.game.status] ?? "Poker Night") : "Poker Night";
  const tracked = detail ? roundMoney(detail.buyIns.reduce((sum, b) => sum + b.money_amount, 0)) : 0;
  const players = detail?.seats.length ?? 0;
  const isLive = detail?.game.status === "live";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #1a0708 0%, #070707 45%, #1a1305 100%)",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: "#F5B942", letterSpacing: 8 }}>ON THE HOUSE</div>
            <div style={{ fontSize: 24, color: "#9C9587", marginTop: 6 }}>house party games</div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              fontWeight: 800,
              color: isLive ? "#070707" : "#FFF4D6",
              background: isLive ? "#00D17A" : "rgba(255,244,214,0.12)",
              borderRadius: 999,
              padding: "12px 30px",
            }}
          >
            {status}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 82, fontWeight: 900, color: "#FFFFFF", lineHeight: 1.05 }}>{title}</div>
          <div style={{ fontSize: 34, color: "#9C9587", marginTop: 18, display: "flex" }}>
            Poker Night · {players} players{tracked > 0 ? ` · ₹${tracked.toLocaleString("en-IN")} on the table` : ""}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              display: "flex",
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "#F5B942",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
            }}
          >
            ♠
          </div>
          <div style={{ fontSize: 30, color: "#FFF4D6" }}>
            Tap to follow the table — buy-ins, chips and who pays whom.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
