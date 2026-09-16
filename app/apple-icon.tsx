import { ImageResponse } from "next/og";
import { LOGO_DATA_URI } from "@/features/branding/logo";

// iOS home-screen icon (Apple ignores SVG favicons, so render a PNG).
export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#070707",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_DATA_URI} width={180} height={180} alt="" />
      </div>
    ),
    size,
  );
}
