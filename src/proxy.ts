import { NextResponse, type NextRequest } from "next/server";

/**
 * Links pasted into chats often pick up the punctuation after them
 * ("…/pyq." or "(…/rooms?join=K7QM2P)"), which would show a 404.
 * Strip trailing punctuation from the path and send the visitor to the real page.
 */
const TRAILING = /[.,;:!?)\]'"]+$/;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    // malformed %-escape: check the raw path
  }
  if (!TRAILING.test(decoded)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = decoded.replace(TRAILING, "") || "/";
  return NextResponse.redirect(url, 308);
}

export const config = {
  // Everything except Next.js assets and API routes; the check above leaves normal paths alone.
  matcher: ["/((?!_next/|api/).*)"],
};
