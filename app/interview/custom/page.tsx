"use client"

import { useState } from "react"
import { useRouter } from 'next/navigation'
import InterviewNavbar from "@/components/interview-navbar"
import CustomScenarioBuilder, { CustomScenario } from "@/components/custom-scenario-builder"
import AudioVideoInterviewer from "@/components/audio-video-interviewer"

export default function CustomInterviewPage() {
  const router = useRouter()
  const [scenario, setScenario] = useState<CustomScenario | null>(null)
  const [showBuilder, setShowBuilder] = useState(true)

  const handleScenarioComplete = (completedScenario: CustomScenario) => {
    setScenario(completedScenario)
    setShowBuilder(false)
  }

  const handleBack = () => {
    if (showBuilder) {
      router.push("/dashboard")
    } else {
      setShowBuilder(true)
      setScenario(null)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <InterviewNavbar />

      <div className="pt-20 pb-8 px-4 sm:px-6 lg:px-8">
        {showBuilder ? (
          <CustomScenarioBuilder onComplete={handleScenarioComplete} onBack={handleBack} />
        ) : (
          <div className="h-[calc(100vh-80px)] flex flex-col">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900">{scenario?.description}</h2>
              <p className="text-gray-600 text-sm mt-1">Your AI interviewer will assess: {scenario?.focusAreas.join(", ")}</p>
            </div>
            <AudioVideoInterviewer interviewType="custom" customScenario={scenario || undefined} />
          </div>
        )}
      </div>
    </div>
  )
}
