import { type NextRequest, NextResponse } from "next/server"
import { createGroq } from "@ai-sdk/groq"
import { generateText } from "ai"

const groqClient = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { transcript, context } = await request.json()

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json({ isComplete: false, confidence: 0, reasoning: "Empty transcript" })
    }

    const { text } = await generateText({
      model: groqClient("llama-3.3-70b-versatile"),
      prompt: `You are an expert at detecting when someone has finished speaking in a conversation.

Context: This is an interview. The user is answering a question: "${context?.question || "a question"}"

Current transcript of what the user has said so far:
"${transcript}"

Analyze this transcript and determine:
1. Has the user completed their thought/answer?
2. Are they still in the middle of formulating their response?
3. Are filler words like "um", "uh", "and", "because", "so" at the end indicating they want to continue?

Respond in JSON format:
{
  "isComplete": boolean (true if user is done, false if still speaking),
  "confidence": number (0.0 to 1.0 confidence score),
  "reasoning": "brief explanation of your decision"
}

Consider:
- Complete sentences with proper endings indicate completion
- Trailing filler words ("um", "uh", "and", "because") indicate continuation
- Incomplete thoughts or hanging sentences indicate continuation
- Well-formed, conclusive statements indicate completion`,
      temperature: 0.3,
      maxTokens: 200,
    })

    // Parse the JSON response
    const cleanedText = text.replace(/```json\n?|\n?```/g, "").trim()
    const analysis = JSON.parse(cleanedText)

    console.log("[v0] LLM Turn Detection:", {
      transcript: transcript.substring(0, 50) + "...",
      isComplete: analysis.isComplete,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
    })

    return NextResponse.json(analysis)
  } catch (error) {
    console.error("[v0] Turn detection error:", error)
    return NextResponse.json(
      {
        isComplete: false,
        confidence: 0,
        reasoning: "Error analyzing transcript",
      },
      { status: 500 },
    )
  }
}
