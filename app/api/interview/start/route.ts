import { createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { interviewType, userId, userEmail, userName, duration, difficulty, customScenario } = await request.json()

    console.log("[v0] Starting interview for user:", userId, "difficulty:", difficulty)

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    let questionCount: number
    if (duration <= 10) {
      questionCount = 6
    } else if (duration <= 30) {
      questionCount = 14
    } else if (duration <= 60) {
      questionCount = 25
    } else {
      // For custom durations > 60 minutes, scale proportionally
      questionCount = Math.ceil((duration / 60) * 25)
    }

    console.log("[v0] Duration:", duration, "minutes → Question count:", questionCount)

    const supabase = await createAdminClient()

    try {
      const { error: userError } = await supabase.from("users").upsert(
        {
          id: userId,
          email: userEmail || `user_${userId}@hiremind.app`,
          name: userName || "User",
        },
        {
          onConflict: "id",
          ignoreDuplicates: false,
        },
      )

      if (userError) {
        console.log("[v0] Note: Could not upsert user:", userError.message)
      } else {
        console.log("[v0] User record ensured")
      }
    } catch (userErr) {
      console.log("[v0] User upsert skipped, continuing with interview creation")
    }

    const result = await supabase
      .from("interviews")
      .insert({
        user_id: userId,
        interview_type: interviewType,
        status: "in_progress",
        started_at: new Date().toISOString(),
        difficulty: difficulty || "intermediate",
      })
      .select()
      .single()

    const interview = result.data
    const error = result.error

    if (error) {
      console.error("[v0] Error creating interview:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Interview created successfully:", interview.id, "with", questionCount, "questions")
    return NextResponse.json({ interview: { ...interview, question_count: questionCount } })
  } catch (error) {
    console.error("[v0] Error in start interview:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
