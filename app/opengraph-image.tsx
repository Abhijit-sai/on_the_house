import { ImageResponse } from "next/og";
import { LOGO_DATA_URI } from "@/features/branding/logo";

// Default link-preview card for the landing page and any app route that
// doesn't ship its own. /g and /r keep their game-specific cards.
export const runtime = "nodejs";
export const alt = "On the House — house party games for your crew";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #1a0708 0%, #070707 46%, #1a1305 100%)",
          padding: 84,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_DATA_URI} width={112} height={112} alt="" />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: 10, color: "#F5B942" }}>ON THE HOUSE</div>
            <div style={{ fontSize: 26, color: "#9C9587", marginTop: 4 }}>house party games</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 88, fontWeight: 900, color: "#FFFFFF", lineHeight: 1.02 }}>Host the night.</div>
          <div style={{ fontSize: 88, fontWeight: 900, color: "#FFFFFF", lineHeight: 1.02 }}>Settle the chaos.</div>
          <div style={{ fontSize: 32, color: "#9C9587", marginTop: 22, maxWidth: 900 }}>
            Poker settlements, rally streaks and more — your crew joins with a link.
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          {["♠ Poker Night", "🔥 Rally", "More soon"].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                fontSize: 26,
                fontWeight: 700,
                color: "#FFF4D6",
                background: "rgba(255,244,214,0.10)",
                border: "1px solid rgba(255,244,214,0.14)",
                borderRadius: 999,
                padding: "10px 26px",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
