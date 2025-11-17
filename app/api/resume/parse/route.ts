import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateText } from "ai"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { resumeUrl } = await request.json()

    if (!resumeUrl) {
      return NextResponse.json({ error: "No resume URL provided" }, { status: 400 })
    }

    console.log("[v0] Fetching resume from:", resumeUrl)

    // Fetch the resume file
    const response = await fetch(resumeUrl)
    if (!response.ok) {
      throw new Error("Failed to fetch resume")
    }

    const blob = await response.blob()
    const text = await blob.text()

    console.log("[v0] Resume text length:", text.length)

    // Use AI to parse the resume and extract structured data
    const { text: parsedData } = await generateText({
      model: "xai/grok-beta",
      prompt: `You are a resume parser. Extract structured information from the following resume text and return it as JSON.

Extract:
- skills: array of technical skills
- experience: array of work experiences with {company, role, duration, description}
- education: array of education with {institution, degree, field, year}
- projects: array of projects with {name, description, technologies}
- summary: brief professional summary (2-3 sentences)

Resume text:
${text}

Return ONLY valid JSON, no markdown formatting.`,
    })

    console.log("[v0] AI parsed resume data")

    // Clean and parse the JSON response
    let cleanedData = parsedData.trim()
    if (cleanedData.startsWith("```json")) {
      cleanedData = cleanedData.replace(/```json\n?/g, "").replace(/```\n?/g, "")
    } else if (cleanedData.startsWith("```")) {
      cleanedData = cleanedData.replace(/```\n?/g, "")
    }

    const resumeData = JSON.parse(cleanedData)

    console.log("[v0] Parsed resume data:", resumeData)

    // Update user profile with parsed resume data
    const { error: updateError } = await supabase
      .from("users")
      .update({
        resume_data: resumeData,
        skills: resumeData.skills || [],
        experience: resumeData.experience || [],
        education: resumeData.education || [],
        bio: resumeData.summary || null,
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("[v0] Error updating user profile:", updateError)
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: resumeData,
    })
  } catch (error) {
    console.error("[v0] Resume parsing error:", error)
    return NextResponse.json({ error: "Failed to parse resume" }, { status: 500 })
  }
}
