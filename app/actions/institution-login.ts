"use server"

import { createClient } from "@supabase/supabase-js"

export async function createInstitutionAdmin(email: string, password: string) {
  try {
    console.log("[v0] Server: Creating institution admin account...")

    // Create admin client with service role key to bypass email confirmation
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Validate email domain
    const emailDomain = email.split("@")[1]
    const { data: institution, error: institutionError } = await supabaseAdmin
      .from("institutions")
      .select("id, name")
      .eq("email_domain", emailDomain)
      .maybeSingle()

    if (institutionError || !institution) {
      console.log("[v0] Server: Invalid institution domain:", emailDomain)
      return { success: false, error: "This email domain is not registered with any institution" }
    }

    console.log("[v0] Server: Found institution:", institution.name)

    // Check if user already exists in auth
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const userExists = existingUser.users.find((u) => u.email === email)

    if (userExists) {
      console.log("[v0] Server: User already exists in auth, upserting profile...")

      const { error: upsertError } = await supabaseAdmin.from("users").upsert(
        {
          id: userExists.id,
          email,
          user_type: "institution_admin",
          institution_id: institution.id,
          name: email.split("@")[0],
        },
        {
          onConflict: "id",
        },
      )

      if (upsertError) {
        console.log("[v0] Server: Error upserting user profile:", upsertError)
        return { success: false, error: "Failed to create/update user profile" }
      }
      console.log("[v0] Server: User profile upserted successfully")

      return {
        success: true,
        email,
        password,
        isExisting: true,
      }
    }

    // Create user with admin API - this bypasses email confirmation
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email for testing
      user_metadata: {
        email,
        user_type: "institution_admin",
        institution_id: institution.id,
      },
    })

    if (error) {
      console.log("[v0] Server: Institution admin creation error:", error)
      return { success: false, error: error.message }
    }

    console.log("[v0] Server: Institution admin created successfully")

    const { error: upsertError } = await supabaseAdmin.from("users").upsert(
      {
        id: data.user.id,
        email,
        user_type: "institution_admin",
        institution_id: institution.id,
        name: email.split("@")[0],
      },
      {
        onConflict: "id",
      },
    )

    if (upsertError) {
      console.log("[v0] Server: Error upserting user profile:", upsertError)
      // Don't fail the whole operation, user can still login
    } else {
      console.log("[v0] Server: User profile upserted successfully")
    }

    // Return credentials so client can sign in
    return {
      success: true,
      email,
      password,
      isExisting: false,
    }
  } catch (err: any) {
    console.log("[v0] Server: Unexpected error:", err)
    return { success: false, error: err.message || "Failed to create institution admin account" }
  }
}
