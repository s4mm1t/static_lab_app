"use client";
import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    // On mobile redirect directly — iframes on iOS Safari break safe-area and fixed positioning
    if (window.innerWidth < 768) {
      window.location.replace("/design/index.html");
    }
  }, []);

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
