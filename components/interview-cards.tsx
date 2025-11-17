"use client"
import { useState } from "react"
import { useRouter } from 'next/navigation'
import { isUserLoggedIn } from "@/lib/auth"

const interviewTypes = [
  {
    id: "technical",
    title: "Technical Interview",
    description: "Practice coding problems and system design questions with AI feedback.",
    icon: "💻",
  },
  {
    id: "hr",
    title: "HR Interview",
    description: "Master behavioral questions and communication skills with realistic scenarios.",
    icon: "🤝",
  },
  {
    id: "custom",
    title: "Custom Scenario",
    description: "Create your own interview scenario tailored to your specific needs.",
    icon: "⚙️",
  },
]

interface InterviewCardsProps {
  isAuthenticated?: boolean
}

export default function InterviewCards({ isAuthenticated = false }: InterviewCardsProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const router = useRouter()

  const handleStartInterview = (interviewId: string) => {
    if (interviewId === "custom") {
      if (isAuthenticated) {
        router.push("/interview/custom")
      } else {
        if (isUserLoggedIn()) {
          router.push("/interview/custom")
        } else {
          router.push("/auth")
        }
      }
      return
    }

    if (isAuthenticated) {
      router.push(`/interview/${interviewId}`)
    } else {
      if (isUserLoggedIn()) {
        router.push(`/interview/${interviewId}`)
      } else {
        router.push("/auth")
      }
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {interviewTypes.map((interview) => (
        <div
          key={interview.id}
          onMouseEnter={() => setHoveredCard(interview.id)}
          onMouseLeave={() => setHoveredCard(null)}
          className="group relative bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-300 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 animate-fade-in"
        >
          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-300 pointer-events-none" />

          {/* Content */}
          <div className="relative z-10">
            {/* Icon */}
            <div className="text-4xl mb-4">{interview.icon}</div>

            {/* Title */}
            <h3 className="text-xl font-bold text-gray-900 mb-2">{interview.title}</h3>

            {/* Description */}
            <p className="text-gray-600 text-sm mb-6 leading-relaxed">{interview.description}</p>

            {/* Start Button */}
            <button
              onClick={() => handleStartInterview(interview.id)}
              className="inline-block px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium rounded-lg hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 transform group-hover:scale-105"
            >
              Start
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
