import { headers } from "next/headers";
import { DesignFrame } from "./design-frame";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function Home() {
  const h = await headers();
  const ua = h.get("user-agent") || "";
  const isMobile = /iPhone|iPad|iPod|Android|Mobile|Windows Phone/i.test(ua);
  const src = isMobile ? "/design/index.html" : "/design/desktop.html";

  return (
    <>
      <style>{`
        html,
        body {
          margin: 0;
          padding: 0;
          height: 100%;
          overflow: hidden;
          background: #ECE6D9;
        }

        .design-frame {
          display: block;
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          border: 0;
          background: #ECE6D9;
        }
      `}</style>
      <DesignFrame initialSrc={src} />
    </>
  );
}
