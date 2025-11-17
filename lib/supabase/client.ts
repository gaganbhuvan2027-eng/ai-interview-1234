import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      get(name: string) {
        if (typeof document === "undefined") return undefined
        const cookies = document.cookie.split("; ")
        const cookie = cookies.find((row) => row.startsWith(`${name}=`))
        return cookie ? decodeURIComponent(cookie.split("=")[1]) : undefined
      },
      set(name: string, value: string, options: any) {
        if (typeof document === "undefined") return

        const cookieOptions = [
          `${name}=${encodeURIComponent(value)}`,
          "path=/",
          `max-age=${options.maxAge || 31536000}`,
          "SameSite=Lax",
        ]

        // Only add Secure flag in production
        if (window.location.protocol === "https:") {
          cookieOptions.push("Secure")
        }

        document.cookie = cookieOptions.join("; ")
      },
      remove(name: string, options: any) {
        if (typeof document === "undefined") return
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
      },
    },
  })
}
