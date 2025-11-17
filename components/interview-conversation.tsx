"use client"

import { useState } from "react"
import { ChevronDown, MessageCircle, Loader2 } from "lucide-react"

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

interface InterviewConversationProps {
  conversation: ConversationItem[]
  probableAnswers: ProbableAnswer[]
}

export default function InterviewConversation({ conversation, probableAnswers }: InterviewConversationProps) {
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null)

  const getProbableAnswer = (questionNumber: number) => {
    return probableAnswers.find((pa) => pa.questionNumber === questionNumber)?.probableAnswer
  }

  if (conversation.length === 0) {
    return (
      <div className="mb-12 animate-fade-in" style={{ animationDelay: "0.3s" }}>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-8">
          <div className="flex items-center gap-3 mb-4">
            <MessageCircle className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Interview Conversation & Probable Answers</h2>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <p>Loading interview conversation...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-12 animate-fade-in" style={{ animationDelay: "0.3s" }}>
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-8">
        <div className="flex items-center gap-3 mb-2">
          <MessageCircle className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Interview Conversation & Probable Answers</h2>
        </div>
        <p className="text-gray-600 mb-6">
          Review your responses and compare them with suggested answers to improve your interview skills.
        </p>

        <div className="space-y-4">
          {conversation.map((item) => {
            const isExpanded = expandedQuestion === item.questionNumber
            const probableAnswer = getProbableAnswer(item.questionNumber)

            return (
              <div
                key={item.questionNumber}
                className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm"
              >
                {/* Question Section */}
                <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100">
                  <h3 className="text-sm font-semibold text-blue-600 mb-2">Question {item.questionNumber}</h3>
                  <p className="text-gray-900 font-medium text-lg">{item.question}</p>
                </div>

                {/* User Answer Section */}
                <div className="p-4 border-t-2 border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-700">Your Answer:</h4>
                    {item.skipped && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded font-semibold">Skipped</span>
                    )}
                  </div>
                  <p className={`text-gray-700 ${item.skipped ? "italic text-gray-500" : ""}`}>{item.userAnswer}</p>
                </div>

                {probableAnswer ? (
                  <div>
                    <button
                      onClick={() => setExpandedQuestion(isExpanded ? null : item.questionNumber)}
                      className="w-full px-4 py-3 border-t-2 border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-colors flex items-center justify-between group"
                    >
                      <span className="text-sm font-semibold text-green-700">💡 View Suggested Answer</span>
                      <ChevronDown
                        className={`w-4 h-4 text-green-700 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-t-2 border-green-200">
                        <h4 className="text-sm font-semibold text-green-800 mb-2">Suggested Answer:</h4>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{probableAnswer}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="px-4 py-3 border-t-2 border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating suggested answer...</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
