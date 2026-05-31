import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const h = await headers();
  const ua = h.get("user-agent") || "";
  const isMobile = /iPhone|iPad|iPod|Android|Mobile|Windows Phone/i.test(ua);

  // Mobile gets the standalone design directly — iframes break safe-area /
  // fixed positioning on iOS Safari. This is a server-side 307, so there's
  // no flash of the desktop layout and no client JS required.
  if (isMobile) {
    redirect("/design/index.html");
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
      <iframe
        className="frame-desktop"
        src="/design/desktop.html"
        title="FoodTrack AI Desktop"
      />
    </>
  );
}
