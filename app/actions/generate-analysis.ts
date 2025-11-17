'use server'

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

export async function generateAnalysis(interviewId: string, interviewType: string = "technical", questionsSkipped: number = 0) {
  try {
    console.log("[v0] Generating analysis for interview:", interviewId)

    if (!interviewId) {
      throw new Error("Interview ID is required")
    }

    const { data: responses, error: responsesError } = await supabaseAdmin
      .from("interview_responses")
      .select("*")
      .eq("interview_id", interviewId)
      .order("question_number", { ascending: true })

    if (responsesError) {
      console.error("[v0] Error fetching responses:", responsesError)
      throw new Error("Failed to fetch responses")
    }

    if (!responses || responses.length === 0) {
      console.log("[v0] No responses found, creating default incomplete analysis")
      
      // Insert a default analysis for incomplete interviews
      const { error: insertError } = await supabaseAdmin
        .from("interview_results")
        .insert({
          interview_id: interviewId,
          overall_score: 0,
          communication_score: 0,
          technical_score: 0,
          problem_solving_score: 0,
          confidence_score: 0,
          eye_contact_score: 0,
          smile_score: 0,
          stillness_score: 0,
          face_confidence_score: 0,
          strengths: [],
          improvements: ["Complete the interview by answering questions", "Practice speaking clearly into the microphone", "Take time to think through your responses"],
          detailed_feedback: "This interview was not completed. No responses were recorded. Please ensure your microphone is working and speak clearly when answering questions. Take your time to provide thoughtful answers to each question.",
          questions_skipped: questionsSkipped,
          skip_penalty: questionsSkipped * 5
        })

      if (insertError) {
        console.error("[v0] Error storing default analysis:", insertError)
        throw new Error("Failed to store analysis")
      }

      // Update interview status
      await supabaseAdmin
        .from("interviews")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", interviewId)

      return { 
        success: true, 
        analysis: {
          overall_score: 0,
          communication_score: 0,
          technical_score: 0,
          problem_solving_score: 0,
          confidence_score: 0,
          strengths: [],
          improvements: ["Complete the interview by answering questions"],
          detailed_feedback: "This interview was not completed. No responses were recorded."
        }
      }
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

    const { error: insertError } = await supabaseAdmin
      .from("interview_results")
      .insert({
        interview_id: interviewId,
        overall_score: analysis.overall_score || 0,
        communication_score: analysis.communication_score || 0,
        technical_score: analysis.technical_score || 0,
        problem_solving_score: analysis.problem_solving_score || 0,
        confidence_score: analysis.confidence_score || 0,
        strengths: analysis.strengths || [],
        improvements: analysis.improvements || [],
        detailed_feedback: analysis.detailed_feedback || "",
        questions_skipped: questionsSkipped,
        eye_contact_score: 0,
        smile_score: 0,
        stillness_score: 0,
        face_confidence_score: 0,
        skip_penalty: questionsSkipped * 5
      })

    if (insertError) {
      console.error("[v0] Error storing analysis:", insertError)
      throw new Error("Failed to store analysis")
    }

    const { error: statusError } = await supabaseAdmin
      .from("interviews")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", interviewId)

    if (statusError) {
      console.error("[v0] Error updating interview status:", statusError)
    }

    console.log("[v0] Analysis completed and stored successfully")
    
    return { success: true, analysis }
  } catch (error) {
    console.error("[v0] Error generating analysis:", error)
    const errorMsg = error instanceof Error ? error.message : String(error)
    return { success: false, error: errorMsg }
  }
}
