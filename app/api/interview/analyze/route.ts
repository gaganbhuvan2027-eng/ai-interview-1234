import { generateText } from "ai"
import { createGroq } from "@ai-sdk/groq"
import { createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const groqClient = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { interviewId, interviewType, faceMetrics, questionsSkipped = 0 } = await request.json()

    console.log("[v0] Starting analysis for interview:", interviewId)

    if (!interviewId) {
      console.error("[v0] Missing interviewId in request")
      return NextResponse.json({ error: "Interview ID is required" }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Get all responses for this interview
    const { data: responses, error: responsesError } = await supabase
      .from("interview_responses")
      .select("*")
      .eq("interview_id", interviewId)
      .order("question_number")

    if (responsesError) {
      console.error("[v0] Error fetching responses:", responsesError)
      return NextResponse.json({ error: responsesError.message }, { status: 500 })
    }

    const validResponses = responses.filter(
      (r) => r.answer && r.answer.trim() !== "" && !r.answer.includes("[SKIPPED]"),
    )
    const hasNoParticipation = validResponses.length === 0

    console.log(`[v0] Valid responses: ${validResponses.length}, Total responses: ${responses.length}`)

    let analysis

    if (hasNoParticipation) {
      console.log("[v0] No participation detected - setting all scores to 0")
      analysis = {
        overall_score: 0,
        communication_score: 0,
        technical_score: 0,
        problem_solving_score: 0,
        confidence_score: 0,
        strengths: [],
        improvements: ["No participation detected. Please attempt to answer the questions in your next interview."],
        detailed_feedback:
          "You did not provide any meaningful responses during this interview. To get accurate feedback and improve your interview skills, please ensure you answer the interview questions thoroughly in your next session.",
      }
    } else {
      // Generate AI analysis for responses with content
      const transcript = validResponses
        .map((r) => `Q${r.question_number}: ${r.question}\nA${r.question_number}: ${r.answer}`)
        .join("\n\n")

      console.log("[v0] Generating AI analysis with", validResponses.length, "responses")
      try {
        const { text } = await generateText({
          model: groqClient("llama-3.3-70b-versatile"),
          prompt: `You are an expert technical interview evaluator with 10+ years of experience. Analyze this ${interviewType} interview transcript and provide a comprehensive, actionable performance assessment.

Interview Transcript:
${transcript}

Provide detailed analysis following these guidelines:

**Scoring (0-100 scale):**
- Use granular scoring - differentiate clearly between good and excellent performance
- Base scores on depth of technical knowledge, clarity of communication, and problem-solving approach
- Be realistic but encouraging

**Strengths:**
- Identify 4-5 specific strengths demonstrated in the interview
- Reference actual responses where possible
- Focus on both technical skills and soft skills

**Improvements:**
- Provide 4-5 specific, actionable improvement areas
- Make recommendations concrete (e.g., "Study time complexity analysis" not "Improve algorithms")
- Prioritize improvements by impact

**Detailed Feedback:**
- Write 3-4 comprehensive paragraphs (200-300 words total)
- Include specific examples from their answers
- Compare performance to industry standards for ${interviewType} interviews
- Provide a clear learning path forward
- Be encouraging while being honest about areas needing work
- End with a motivational but realistic assessment of readiness

Return ONLY this JSON format (no markdown formatting):
{
  "overall_score": <number 0-100>,
  "communication_score": <number 0-100>,
  "technical_score": <number 0-100>,
  "problem_solving_score": <number 0-100>,
  "confidence_score": <number 0-100>,
  "strengths": ["specific strength 1", "specific strength 2", "specific strength 3", "specific strength 4"],
  "improvements": ["actionable improvement 1", "actionable improvement 2", "actionable improvement 3", "actionable improvement 4"],
  "detailed_feedback": "<3-4 paragraph comprehensive feedback with specific examples and industry context>"
}

Be professional, constructive, and specific. Focus on providing value that helps the candidate improve.`,
        })

        console.log("[v0] AI response text:", text.substring(0, 200))

        let cleanedText = text.trim()
        if (cleanedText.startsWith("\`\`\`json")) {
          cleanedText = cleanedText.replace(/^\`\`\`json\s*/, "").replace(/\`\`\`\s*$/, "")
        } else if (cleanedText.startsWith("\`\`\`")) {
          cleanedText = cleanedText.replace(/^\`\`\`\s*/, "").replace(/\`\`\`\s*$/, "")
        }
        cleanedText = cleanedText.trim()

        try {
          analysis = JSON.parse(cleanedText)
          console.log("[v0] Successfully parsed analysis:", analysis)
        } catch (parseError) {
          console.error("[v0] JSON parse error:", parseError)
          console.error("[v0] Cleaned text:", cleanedText.substring(0, 200))
          console.error("[v0] Raw AI response:", text.substring(0, 200))
          throw new Error(`Failed to parse AI response as JSON: ${cleanedText.substring(0, 100)}`)
        }
      } catch (aiError) {
        console.error("[v0] AI generation error:", aiError)
        const errorMsg = aiError instanceof Error ? aiError.message : String(aiError)
        console.error("[v0] Error details:", errorMsg)
        throw aiError
      }
    }

    const skipPenalty = questionsSkipped * 10
    const adjustedOverallScore = Math.max(0, analysis.overall_score - skipPenalty)

    console.log("[v0] Questions skipped:", questionsSkipped, "Penalty:", skipPenalty)

    const { data: existingResult } = await supabase
      .from("interview_results")
      .select("id")
      .eq("interview_id", interviewId)
      .maybeSingle()

    let resultsError
    if (existingResult) {
      // Update existing result
      const { error: updateError } = await supabase
        .from("interview_results")
        .update({
          overall_score: adjustedOverallScore,
          communication_score: analysis.communication_score,
          technical_score: analysis.technical_score,
          problem_solving_score: analysis.problem_solving_score,
          confidence_score: analysis.confidence_score,
          strengths: analysis.strengths,
          improvements: analysis.improvements,
          detailed_feedback: analysis.detailed_feedback,
          eye_contact_score: faceMetrics?.eyeContact || null,
          smile_score: faceMetrics?.smile || null,
          stillness_score: faceMetrics?.stillness || null,
          face_confidence_score: faceMetrics?.confidenceScore || null,
        })
        .eq("interview_id", interviewId)
      resultsError = updateError
    } else {
      // Insert new result
      const { error: insertError } = await supabase.from("interview_results").insert({
        interview_id: interviewId,
        overall_score: adjustedOverallScore,
        communication_score: analysis.communication_score,
        technical_score: analysis.technical_score,
        problem_solving_score: analysis.problem_solving_score,
        confidence_score: analysis.confidence_score,
        strengths: analysis.strengths,
        improvements: analysis.improvements,
        detailed_feedback: analysis.detailed_feedback,
        eye_contact_score: faceMetrics?.eyeContact || null,
        smile_score: faceMetrics?.smile || null,
        stillness_score: faceMetrics?.stillness || null,
        face_confidence_score: faceMetrics?.confidenceScore || null,
      })
      resultsError = insertError
    }

    if (resultsError) {
      console.error("[v0] Error saving results:", resultsError)
      return NextResponse.json({ error: resultsError.message }, { status: 500 })
    }

    await supabase
      .from("interviews")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", interviewId)

    console.log("[v0] Analysis completed successfully")
    return NextResponse.json({ analysis })
  } catch (error) {
    console.error("[v0] Error analyzing interview:", error)
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error("[v0] Full error:", errorMsg)
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
