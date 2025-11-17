import { NextResponse } from "next/server"

export function middleware(request) {
  // Let the client handle auth, skip SSR auth check
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next|api|auth|favicon.ico).*)"],
}
