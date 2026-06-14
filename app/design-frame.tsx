"use client";

import { useEffect, useState } from "react";

const DESIGN_ASSET_VERSION = "navdock-20260614-1";

type DesignFrameProps = {
  initialSrc: string;
};

function versionedDesignSrc(path: string) {
  const [pathname] = path.split("?");
  return `${pathname}?v=${DESIGN_ASSET_VERSION}`;
}

export function DesignFrame({ initialSrc }: DesignFrameProps) {
  const [src, setSrc] = useState(() => versionedDesignSrc(initialSrc));

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const pick = () => setSrc(versionedDesignSrc(media.matches ? "/design/index.html" : "/design/desktop.html"));

    pick();
    media.addEventListener("change", pick);
    return () => media.removeEventListener("change", pick);
  }, []);

  return (
    <iframe
      data-design-frame
      className="design-frame"
      src={src}
      title="static_lab"
      allow="camera"
    />
  );
}
