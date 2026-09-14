import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#08111d",
        color: "#f8fafc",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <div
        style={{
          alignItems: "center",
          border: "7px solid #31d6c4",
          borderRadius: 36,
          display: "flex",
          fontSize: 54,
          fontWeight: 800,
          height: 116,
          justifyContent: "center",
          letterSpacing: -4,
          width: 116,
        }}
      >
        PM
      </div>
    </div>,
    size,
  );
}
