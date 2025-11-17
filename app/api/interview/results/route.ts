import { createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const interviewId = searchParams.get("interviewId")

    console.log("[v0] Fetching results for interview:", interviewId)

    if (!interviewId) {
      return NextResponse.json({ error: "Interview ID is required" }, { status: 400 })
    }

    const supabase = await createAdminClient()

    const { data: analysis, error: analysisError } = await supabase
      .from("interview_results")
      .select("*")
      .eq("interview_id", interviewId)
      .maybeSingle()

    console.log("[v0] Analysis query result:", { analysis, error: analysisError })

    if (analysisError) {
      console.error("[v0] Error fetching analysis:", analysisError)
      return NextResponse.json({ error: analysisError.message }, { status: 500 })
    }

    if (!analysis) {
      console.log("[v0] No analysis found for interview:", interviewId)
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 })
    }

    const { data: responses, error: responsesError } = await supabase
      .from("interview_responses")
      .select("*")
      .eq("interview_id", interviewId)
      .order("question_number")

    if (responsesError) {
      console.error("[v0] Error fetching responses:", responsesError)
    }

    const formattedAnalysis = {
      overall_score: analysis.overall_score,
      communication_score: analysis.communication_score,
      technical_score: analysis.technical_score,
      problem_solving_score: analysis.problem_solving_score,
      confidence_score: analysis.confidence_score,
      strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
      improvements: Array.isArray(analysis.improvements) ? analysis.improvements : [],
      detailed_feedback: analysis.detailed_feedback || "",
    }

    console.log("[v0] Returning formatted analysis:", formattedAnalysis)
    return NextResponse.json({ analysis: formattedAnalysis, responses: responses || [] })
  } catch (error) {
    console.error("[v0] Error in results route:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch results" },
      { status: 500 },
    )
  }
}
