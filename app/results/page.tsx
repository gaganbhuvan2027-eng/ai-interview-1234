"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import DashboardNavbar from "@/components/dashboard-navbar"
import ResultsOverview from "@/components/results-overview"
import AIFeedback from "@/components/ai-feedback"
import DetailedInsights from "@/components/detailed-insights"
import PerformanceMetrics from "@/components/performance-metrics"
import InterviewConversation from "@/components/interview-conversation"
import { generateAnalysis } from "@/app/actions/generate-analysis"

interface AnalysisData {
  overall_score: number
  communication_score: number
  technical_score: number
  problem_solving_score: number
  confidence_score: number
  eye_contact_score?: number
  smile_score?: number
  stillness_score?: number
  face_confidence_score?: number
  strengths: string[]
  improvements: string[]
  detailed_feedback: string
}

interface ConversationItem {
  questionNumber: number
  question: string
  userAnswer: string
  skipped: boolean
}

interface ProbableAnswer {
  questionNumber: number
  probableAnswer: string
}

export default function ResultsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const interviewId = searchParams.get("interviewId")
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [conversation, setConversation] = useState<ConversationItem[]>([])
  const [probableAnswers, setProbableAnswers] = useState<ProbableAnswer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log("[v0] Results page mounted with interviewId:", interviewId)

    const fetchAnalysis = async () => {
      if (!interviewId) {
        console.log("[v0] No interview ID in search params")
        setError("No interview ID provided")
        setIsLoading(false)
        return
      }

      let analysisTriggered = false
      
      for (let attempt = 0; attempt < 10; attempt++) {
        try {
          console.log(`[v0] Fetching analysis for interview (attempt ${attempt + 1}):`, interviewId)
          const response = await fetch(`/api/interview/results?interviewId=${interviewId}`)
          console.log("[v0] Results API response status:", response.status)

          if (response.ok) {
            const data = await response.json()
            console.log("[v0] Analysis data received successfully")
            setAnalysis(data.analysis)

            const formattedConversation = (data.responses || []).map((r: any) => ({
              questionNumber: r.question_number,
              question: r.question,
              userAnswer: r.answer || "[No response provided]",
              skipped: r.skipped || false,
            }))
            setConversation(formattedConversation)

            try {
              console.log("[v0] Fetching probable answers for interview:", interviewId)
              const conversationResponse = await fetch(`/api/interview/conversation?interviewId=${interviewId}`)
              if (conversationResponse.ok) {
                const conversationData = await conversationResponse.json()
                setProbableAnswers(conversationData.probableAnswers || [])
              }
            } catch (err) {
              console.error("[v0] Error fetching probable answers:", err)
            }

            setIsLoading(false)
            console.log("[v0] Results page ready to display")
            return
          } else if (response.status === 404) {
            // Trigger analysis generation only once
            if (!analysisTriggered) {
              analysisTriggered = true
              console.log("[v0] Analysis not found, generating via server action...")
              try {
                const result = await generateAnalysis(interviewId, "technical", 0)
                
                if (result.success) {
                  console.log("[v0] Analysis generation completed successfully")
                  // Continue to next iteration to fetch the generated analysis
                } else {
                  console.error("[v0] Analysis generation failed:", result.error)
                }
              } catch (actionError) {
                console.error("[v0] Server action error:", actionError)
              }
            }
            
            console.log("[v0] Waiting for analysis to be ready...")
            await new Promise((resolve) => setTimeout(resolve, attempt < 3 ? 2000 : 3000))
          } else {
            throw new Error("Failed to fetch analysis")
          }
        } catch (err) {
          console.error("[v0] Error in fetch attempt", attempt + 1 + ":", err)
          await new Promise((resolve) => setTimeout(resolve, 2000))
        }
      }

      console.error("[v0] Failed to fetch analysis after all attempts")
      setError("Unable to load your interview results. The analysis may still be processing. Please try refreshing the page in a moment.")
      setIsLoading(false)
    }

    fetchAnalysis()
  }, [interviewId])

  return (
    <main className="min-h-screen bg-white">
      <DashboardNavbar />

      {/* Main Content */}
      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>

        {/* Page Title Section */}
        <div className="mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">Your Interview Performance</h1>
          <p className="text-lg text-gray-600">Here's how you performed in your last mock interview.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-xl font-semibold text-gray-900 mb-2">Preparing your performance report...</p>
              <p className="text-gray-600">This may take a few moments</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 border-2 border-red-200 rounded-lg">
            <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Results</h3>
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        ) : analysis ? (
          <>
            <div className="mb-8 p-6 bg-green-50 border-2 border-green-200 rounded-lg animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white text-2xl">
                  ✓
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-900">Interview Complete!</h3>
                  <p className="text-green-700">Your performance has been analyzed. Review your results below.</p>
                </div>
              </div>
            </div>

            {/* Results Overview Cards */}
            <ResultsOverview analysis={analysis} />

            <PerformanceMetrics
              overall_score={analysis.overall_score}
              communication_score={analysis.communication_score}
              technical_score={analysis.technical_score}
              problem_solving_score={analysis.problem_solving_score}
              confidence_score={analysis.confidence_score}
              eye_contact_score={analysis.eye_contact_score}
              smile_score={analysis.smile_score}
              stillness_score={analysis.stillness_score}
              face_confidence_score={analysis.face_confidence_score}
            />

            {/* Interview Conversation Component */}
            <InterviewConversation conversation={conversation} probableAnswers={probableAnswers} />

            {/* AI Feedback Section */}
            <AIFeedback analysis={analysis} />

            {/* Detailed Insights Section */}
            <DetailedInsights analysis={analysis} />

            <div className="mt-12 flex gap-4 justify-center">
              <button
                onClick={() => router.push("/dashboard")}
                className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => router.push("/interview/technical")}
                className="px-8 py-3 border-2 border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
              >
                Start New Interview
              </button>
            </div>
          </>
        ) : null}
      </div>
    </main>
  )
}
