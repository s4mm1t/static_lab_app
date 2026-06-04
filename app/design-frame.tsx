"use client";

import { useEffect, useState } from "react";

type DesignFrameProps = {
  initialSrc: string;
};

export function DesignFrame({ initialSrc }: DesignFrameProps) {
  const [src, setSrc] = useState(initialSrc);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const pick = () => setSrc(media.matches ? "/design/index.html" : "/design/desktop.html");

    pick();
    media.addEventListener("change", pick);
    return () => media.removeEventListener("change", pick);
  }, []);

  return (
    <iframe
      data-design-frame
      className="design-frame"
      src={src}
      title="FoodTrack AI"
      allow="camera"
    />
  );
}
