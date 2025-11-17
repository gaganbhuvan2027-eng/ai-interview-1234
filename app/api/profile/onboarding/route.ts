import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const profileData = await request.json()

    // Update user profile with onboarding data
    const { error: updateError } = await supabase
      .from("users")
      .update({
        name: profileData.name,
        bio: profileData.bio,
        location: profileData.location,
        skills: profileData.skills,
        education: profileData.education,
        experience: profileData.experience,
        preferences: {
          career_stage: profileData.careerStage,
          years_of_experience: profileData.yearsOfExperience,
          current_role: profileData.currentRole,
          target_role: profileData.targetRole,
          onboarding_completed: true,
        },
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("[v0] Error updating profile:", updateError)
      return NextResponse.json({ error: "Failed to save profile" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in onboarding:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
