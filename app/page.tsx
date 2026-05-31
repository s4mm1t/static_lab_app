"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const isMobile =
      /iPhone|iPad|iPod|Android|Mobile/i.test(ua) ||
      window.matchMedia("(max-width: 767px)").matches ||
      window.innerWidth < 768;

    if (isMobile) {
      // iframes break safe-area + fixed positioning on iOS — go straight to the design
      window.location.replace("/design/index.html");
      return;
    }
    setChecked(true);
  }, []);

  // Avoid flashing the desktop iframe before the mobile check resolves
  if (!checked) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#ECE6D9",
        }}
      />
    );
  }

  return (
    <>
      <style>{`
        html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }
        .frame-desktop {
          display: block;
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          border: none;
        }
      `}</style>

      {/* Desktop only — mobile is handled by the redirect above */}
      <iframe
        className="frame-desktop"
        src="/design/desktop.html"
        title="FoodTrack AI Desktop"
      />
    </>
  );
}
