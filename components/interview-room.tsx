"use client"

import { useState } from "react"
import InterviewNavbar from "./interview-navbar"
import InterviewWrapper from "./interview-wrapper"

interface InterviewRoomProps {
  interviewType: string
  courseTitle?: string
}

export function InterviewRoom({ interviewType, courseTitle }: InterviewRoomProps) {
  const [isRecording, setIsRecording] = useState(false)

  const getInterviewTitle = () => {
    if (courseTitle) {
      return courseTitle
    }

    const titles: Record<string, string> = {
      technical: "Technical Interview",
      hr: "HR Interview",
      custom: "Custom Scenario",
    }
    return titles[interviewType] || "Interview"
  }

  return (
    <div className="min-h-screen bg-white">
      <InterviewNavbar />

      <div className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 h-[calc(100vh-80px)] flex flex-col">
        <div className="flex-1 flex flex-col">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900">{getInterviewTitle()}</h2>
            <p className="text-gray-600 text-sm mt-1">Your AI interviewer will appear here</p>
          </div>

          <InterviewWrapper interviewType={interviewType} />
        </div>
      </div>
    </div>
  )
}

export default InterviewRoom
