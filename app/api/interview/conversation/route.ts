import { generateText } from "ai"
import { createXai } from "@ai-sdk/xai"
import { createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const xaiClient = createXai({
  apiKey: process.env.XAI_API_KEY,
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const interviewId = searchParams.get("interviewId")

    console.log("[v0] Fetching conversation for interview:", interviewId)

    if (!interviewId) {
      return NextResponse.json({ error: "Interview ID is required" }, { status: 400 })
    }

    const supabase = await createAdminClient()

    console.log("[v0] Querying interview_responses table...")

    const { data: responses, error: responsesError } = await supabase
      .from("interview_responses")
      .select("*")
      .eq("interview_id", interviewId)
      .order("question_number")

    console.log("[v0] Query result:", {
      responseCount: responses?.length || 0,
      error: responsesError,
      responses: responses,
    })

    if (responsesError) {
      console.error("[v0] Error fetching responses:", responsesError)
      return NextResponse.json({ error: responsesError.message }, { status: 500 })
    }

    if (!responses || responses.length === 0) {
      console.log("[v0] No responses found for interview:", interviewId)
      return NextResponse.json({ conversation: [], probableAnswers: [] })
    }

    const conversation = responses.map((r) => ({
      questionNumber: r.question_number,
      question: r.question,
      userAnswer: r.answer || "[No response provided]",
      skipped: r.skipped || false,
    }))

    const allQuestions = responses
      .filter((r) => r.question)
      .map((r) => `Q${r.question_number}: ${r.question}`)
      .join("\n\n")

    let probableAnswers = []

    if (allQuestions && responses.length > 0) {
      try {
        console.log("[v0] Generating probable answers for", responses.length, "questions...")

        const { text } = await generateText({
          model: xaiClient("grok-2"),
          prompt: `You are an expert in providing model answers for interview questions. For each question below, provide a concise, professional probable answer that demonstrates strong technical knowledge and communication skills.

Questions:
${allQuestions}

Provide your response as a JSON array with this format:
[
  {
    "questionNumber": 1,
    "probableAnswer": "A comprehensive answer that demonstrates expertise..."
  },
  ...
]

Be specific, professional, and demonstrate best practices in the field.`,
        })

        console.log("[v0] AI response received, parsing...")

        let cleanedText = text.trim()
        if (cleanedText.startsWith("\`\`\`json")) {
          cleanedText = cleanedText.replace(/^\`\`\`json\s*/, "").replace(/\`\`\`\s*$/, "")
        } else if (cleanedText.startsWith("\`\`\`")) {
          cleanedText = cleanedText.replace(/^\`\`\`\s*/, "").replace(/\`\`\`\s*$/, "")
        }

        probableAnswers = JSON.parse(cleanedText)
        console.log("[v0] Successfully generated", probableAnswers.length, "probable answers")
      } catch (error) {
        console.error("[v0] Error generating probable answers:", error)
        // Continue without probable answers if generation fails
      }
    }

    return NextResponse.json({ conversation, probableAnswers })
  } catch (error) {
    console.error("[v0] Error in conversation route:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch conversation" },
      { status: 500 },
    )
  }
}
