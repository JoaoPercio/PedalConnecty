import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1B5E20 0%, #43A047 100%)",
          borderRadius: 96,
        }}
      >
        <svg
          width="280"
          height="280"
          viewBox="0 0 512 512"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="160" cy="300" r="72" stroke="white" strokeWidth="28" />
          <circle cx="352" cy="300" r="72" stroke="white" strokeWidth="28" />
          <path
            d="M160 300 L240 180 L300 180 L352 300"
            stroke="white"
            strokeWidth="24"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="300" cy="160" r="20" fill="#A5D6A7" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
