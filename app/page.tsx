"use client";

export default function Home() {
  return (
    <>
      <style>{`
        html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }

        /* Mobile: показываем мобильный дизайн */
        .frame-mobile {
          display: block;
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          border: none;
        }
        .frame-desktop {
          display: none;
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          border: none;
        }

        /* Desktop: показываем десктопный дизайн */
        @media (min-width: 768px) {
          .frame-mobile  { display: none; }
          .frame-desktop { display: block; }
        }
      `}</style>

      {/* Мобильный дизайн */}
      <iframe
        className="frame-mobile"
        src="/design/index.html"
        title="FoodTrack AI Mobile"
      />

      {/* Десктопный дизайн */}
      <iframe
        className="frame-desktop"
        src="/design/desktop.html"
        title="FoodTrack AI Desktop"
      />
    </>
  );
}
