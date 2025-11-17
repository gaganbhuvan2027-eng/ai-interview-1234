import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { memberId, course, difficulty, scheduledDate, deadline } = await request.json()

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

    const { error: insertError } = await supabase.from("scheduled_interviews").insert({
      institution_id: adminProfile.institution_id,
      scheduled_by_id: user.id,
      member_id: memberId,
      course,
      difficulty,
      scheduled_date: scheduledDate,
      deadline: deadline || null,
      status: "pending",
    })

    if (insertError) throw insertError

    return NextResponse.json({ success: true, message: "Interview scheduled successfully" })
  } catch (error: any) {
    console.error("Error scheduling interview:", error)
    return NextResponse.json({ error: error.message || "Failed to schedule interview" }, { status: 500 })
  }
}
