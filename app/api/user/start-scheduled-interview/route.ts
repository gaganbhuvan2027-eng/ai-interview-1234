import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { scheduleId } = await request.json()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify the scheduled interview belongs to this user
    const { data: scheduledInterview, error: fetchError } = await supabase
      .from("scheduled_interviews")
      .select("*")
      .eq("id", scheduleId)
      .eq("member_id", user.id)
      .single()

    if (fetchError || !scheduledInterview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 })
    }

    // Create a new interview session
    const { data: interview, error: insertError } = await supabase
      .from("interviews")
      .insert({
        user_id: user.id,
        interview_type: scheduledInterview.course,
        difficulty: scheduledInterview.difficulty,
        status: "in_progress",
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Update scheduled interview status to in_progress
    await supabase
      .from("scheduled_interviews")
      .update({ status: "in_progress" })
      .eq("id", scheduleId)

    return NextResponse.json({ 
      success: true, 
      interviewId: interview.id,
      interviewType: scheduledInterview.course,
      difficulty: scheduledInterview.difficulty
    })
  } catch (error: any) {
    console.error("Error starting scheduled interview:", error)
    return NextResponse.json({ error: error.message || "Failed to start interview" }, { status: 500 })
  }
}
