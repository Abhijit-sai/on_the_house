import { ImageResponse } from "next/og";
import { getRallyViewByToken } from "@/features/rally/queries";

export const runtime = "nodejs";
export const alt = "Rally on On the House";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const view = await getRallyViewByToken(token).catch(() => null);

  const title = view?.rally.title ?? "Rally";
  const active = view?.rally.status === "active";
  const progress =
    view === null
      ? "Group challenge"
      : view.hasEnded
        ? `Finished · ${view.totalDays} days`
        : view.hasStarted
          ? `Day ${view.dayNumber} of ${view.totalDays}`
          : `Starts ${view.rally.start_date}`;
  const topStreak = view ? Math.max(0, ...view.standings.map((s) => s.currentStreak)) : 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #24080b 0%, #070707 50%, #1a1305 100%)",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: "#F5B942", letterSpacing: 8 }}>ON THE HOUSE</div>
            <div style={{ fontSize: 24, color: "#9C9587", marginTop: 6 }}>rally</div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              fontWeight: 800,
              color: active ? "#070707" : "#FFF4D6",
              background: active ? "#00D17A" : "rgba(255,244,214,0.12)",
              borderRadius: 999,
              padding: "12px 30px",
            }}
          >
            {active ? "ACTIVE" : (view?.rally.status ?? "rally")}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 82, fontWeight: 900, color: "#FFFFFF", lineHeight: 1.05 }}>{title}</div>
          <div style={{ fontSize: 34, color: "#9C9587", marginTop: 18, display: "flex" }}>
            {progress}
            {view ? ` · ${view.members.length} in the crew` : ""}
            {topStreak > 0 ? ` · 🔥 ${topStreak} day streak` : ""}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              display: "flex",
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "#D72638",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
            }}
          >
            🔥
          </div>
          <div style={{ fontSize: 30, color: "#FFF4D6" }}>
            You&apos;re invited — check in daily, prove it, keep the streak alive.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
