"use server"

import { createClient } from "@supabase/supabase-js"

export async function createGuestAccount() {
  try {
    console.log("[v0] Server: Creating guest account with admin API...")

    // Create admin client with service role key to bypass email confirmation
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Generate random guest credentials
    const guestEmail = `guest_${Date.now()}@hiremind.app`
    const guestPassword = `guest_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`

    // Create user with admin API - this bypasses email confirmation
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: guestEmail,
      password: guestPassword,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        is_guest: true,
        email: guestEmail,
      },
    })

    if (error) {
      console.log("[v0] Server: Guest account creation error:", error)
      return { success: false, error: error.message }
    }

    console.log("[v0] Server: Guest account created successfully")

    // Return credentials so client can sign in
    return {
      success: true,
      email: guestEmail,
      password: guestPassword,
    }
  } catch (err: any) {
    console.log("[v0] Server: Unexpected error:", err)
    return { success: false, error: err.message || "Failed to create guest account" }
  }
}
