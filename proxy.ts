import { NextResponse, userAgent } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { device } = userAgent(request);
  const isMobile = device.type === "mobile" || device.type === "tablet";

  if (isMobile) {
    return NextResponse.rewrite(new URL("/design/index.html", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/",
};
