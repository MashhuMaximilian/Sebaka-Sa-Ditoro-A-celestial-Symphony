"use client";
import dynamic from "next/dynamic";
const LegacyObservatory = dynamic(
  () => import("@/components/observatory/LegacyObservatory"),
  { ssr: false },
);
export default function ClassicPage() {
  return (
    <>
      <LegacyObservatory />
      <a
        href="/"
        style={{
          position: "fixed",
          top: 12,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 100,
          padding: "8px 16px",
          borderRadius: 20,
          background: "#0b172ddd",
          color: "#e7d5ac",
          fontSize: 12,
        }}
      >
        ← Back to the observatory
      </a>
    </>
  );
}
