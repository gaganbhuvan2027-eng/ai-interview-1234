import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: adminProfile } = await supabase
      .from("users")
      .select("institution_id, user_type")
      .eq("id", user.id)
      .single()

    if (!adminProfile || adminProfile.user_type !== "institution_admin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    const { data: scheduledInterviews, error } = await supabase
      .from("scheduled_interviews")
      .select(
        `
        *,
        member:member_id(id, name, email),
        scheduled_by:scheduled_by_id(name)
      `,
      )
      .eq("institution_id", adminProfile.institution_id)
      .order("scheduled_date", { ascending: true })

    if (error) throw error

    return NextResponse.json({ interviews: scheduledInterviews || [] })
  } catch (error: any) {
    console.error("Error fetching scheduled interviews:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch interviews" }, { status: 500 })
  }
}
