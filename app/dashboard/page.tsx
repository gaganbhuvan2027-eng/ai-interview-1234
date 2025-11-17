import { redirect } from 'next/navigation'
import { createClient } from "@/lib/supabase/server"
import DashboardNavbar from "@/components/dashboard-navbar"
import InterviewCards from "@/components/interview-cards"
import FeaturedCourses from "@/components/featured-courses"
import { DashboardStats } from "@/components/dashboard-stats"
import { ScheduledInterviewsSection } from "@/components/scheduled-interviews-section"
import { Card } from "@/components/ui/card"
import Link from "next/link"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  let { data: userProfile, error } = await supabase
    .from("users")
    .select("preferences")
    .eq("id", user.id)
    .maybeSingle()

  // If user doesn't exist in the database, create their profile
  if (!userProfile) {
    const { error: insertError } = await supabase
      .from("users")
      .insert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split("@")[0],
        created_at: new Date().toISOString(),
        preferences: { onboarding_completed: false }
      })

    if (!insertError) {
      // Redirect to onboarding for new users
      redirect("/onboarding")
    }
  }

  // Check if onboarding is completed
  const preferences = userProfile?.preferences as any
  if (!preferences?.onboarding_completed) {
    redirect("/onboarding")
  }

  const userName = user.user_metadata?.name || user.email?.split("@")[0] || "User"

  return (
    <main className="min-h-screen bg-white">
      <DashboardNavbar />

      {/* Main Content */}
      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Greeting Section */}
        <div className="mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">Welcome back, {userName}</h1>
          <p className="text-lg text-gray-600">Choose your interview type to begin or review your progress.</p>
        </div>

        <DashboardStats />

        {/* Scheduled Interviews Section */}
        <ScheduledInterviewsSection />

        {/* Featured Courses */}
        <FeaturedCourses />

        {/* Quick Actions */}
        <div className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/history">
            <Card className="p-6 border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <p className="text-lg font-semibold text-gray-900 mb-2">📋 View History</p>
              <p className="text-sm text-gray-600">Review all your past interviews</p>
            </Card>
          </Link>
          <Link href="/performance">
            <Card className="p-6 border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <p className="text-lg font-semibold text-gray-900 mb-2">📊 Performance</p>
              <p className="text-sm text-gray-600">Track your progress and metrics</p>
            </Card>
          </Link>
          <Link href="/leaderboard">
            <Card className="p-6 border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <p className="text-lg font-semibold text-gray-900 mb-2">🏆 Leaderboard</p>
              <p className="text-sm text-gray-600">Compare your performance</p>
            </Card>
          </Link>
        </div>

        {/* Interview Cards */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Start New Interview</h2>
          <InterviewCards isAuthenticated={true} />
        </div>
      </div>
    </main>
  )
}
