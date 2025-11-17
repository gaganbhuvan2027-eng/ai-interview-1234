import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { generateText } from "ai"
import { createGroq } from "@ai-sdk/groq"

const groqClient = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function POST(request: Request) {
  try {
    const { interviewId, interviewType, questionsSkipped = 0 } = await request.json()

    console.log("[v0] Triggering analysis for interview:", interviewId)

    if (!interviewId) {
      return NextResponse.json({ error: "Interview ID is required" }, { status: 400 })
    }

    const { data: responses, error: responsesError } = await supabaseAdmin
      .from("interview_responses")
      .select("*")
      .eq("interview_id", interviewId)
      .order("question_number", { ascending: true })

    if (responsesError) {
      console.error("[v0] Error fetching responses:", responsesError)
      return NextResponse.json({ error: "Failed to fetch responses" }, { status: 500 })
    }

    if (!responses || responses.length === 0) {
      console.log("[v0] No responses found for interview:", interviewId)
      return NextResponse.json({ error: "No responses found" }, { status: 404 })
    }

    const conversationText = responses
      .map(
        (r: any) =>
          `Q${r.question_number}: ${r.question}\nA: ${r.answer || "[Skipped]"}`
      )
      .join("\n\n")

    const prompt = `You are an expert interview coach. Analyze this ${interviewType} interview performance and provide detailed feedback.

Interview Transcript:
${conversationText}

Questions Skipped: ${questionsSkipped}

Provide a comprehensive analysis with:
1. Overall score (0-100)
2. Communication score (0-100)
3. Technical/domain knowledge score (0-100)
4. Problem-solving score (0-100)
5. Confidence score (0-100)
6. 3-5 key strengths
7. 3-5 areas for improvement
8. Detailed written feedback (2-3 paragraphs)

Return ONLY valid JSON in this exact format:
{
  "overall_score": number,
  "communication_score": number,
  "technical_score": number,
  "problem_solving_score": number,
  "confidence_score": number,
  "strengths": ["strength 1", "strength 2", ...],
  "improvements": ["improvement 1", "improvement 2", ...],
  "detailed_feedback": "detailed paragraph feedback"
}`

    const { text } = await generateText({
      model: groqClient("llama-3.3-70b-versatile"),
      prompt,
    })

    let analysis
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text)
    } catch (parseError) {
      console.error("[v0] Error parsing AI response:", text)
      throw new Error("Failed to parse AI analysis")
    }

    const { error: updateError } = await supabaseAdmin
      .from("interviews")
      .update({
        analysis: analysis,
        completed_at: new Date().toISOString(),
      })
      .eq("id", interviewId)

    if (updateError) {
      console.error("[v0] Error storing analysis:", updateError)
      return NextResponse.json({ error: "Failed to store analysis" }, { status: 500 })
    }

    console.log("[v0] Analysis completed and stored successfully")
    
    return NextResponse.json({ success: true, analysis })
  } catch (error) {
    console.error("[v0] Error generating analysis:", error)
    const errorMsg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
