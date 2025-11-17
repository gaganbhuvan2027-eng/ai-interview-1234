"use client"

interface AnalysisData {
  overall_score: number
  communication_score: number
  technical_score: number
  problem_solving_score: number
  confidence_score: number
  strengths: string[]
  improvements: string[]
  detailed_feedback: string
}

interface AIFeedbackProps {
  analysis: AnalysisData
}

export default function AIFeedback({ analysis }: AIFeedbackProps) {
  return (
    <div className="mb-12 animate-fade-in" style={{ animationDelay: "0.2s" }}>
      {/* Glass-like card with feedback */}
      <div className="bg-white rounded-xl border border-gray-200 p-8 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 backdrop-blur-sm">
        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Comprehensive AI Analysis</h2>

        <div className="prose max-w-none mb-8">
          <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-lg mb-6">
            <p className="text-sm font-semibold text-blue-900 mb-1">Expert Evaluation</p>
            <p className="text-xs text-blue-700">Based on industry standards and best practices</p>
          </div>
          <div className="text-gray-700 leading-relaxed text-base space-y-4">
            {analysis.detailed_feedback.split('\n').map((paragraph, idx) => (
              paragraph.trim() && <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </div>

        {/* Strengths and Improvements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
            <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">✨</span>
              Your Strengths
            </h3>
            <ul className="space-y-3">
              {analysis.strengths.map((strength, idx) => (
                <li key={idx} className="flex gap-3 text-gray-700">
                  <span className="text-green-600 font-bold text-xl mt-0.5">✓</span>
                  <span className="flex-1">{strength}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              Focus Areas
            </h3>
            <ul className="space-y-3">
              {analysis.improvements.map((improvement, idx) => (
                <li key={idx} className="flex gap-3 text-gray-700">
                  <span className="text-blue-600 font-bold text-xl mt-0.5">→</span>
                  <span className="flex-1">{improvement}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium rounded-lg hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 transform hover:scale-105">
            Download Detailed Report
          </button>
          <button className="px-8 py-3 border-2 border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-all duration-300">
            View Learning Resources
          </button>
        </div>
      </div>
    </div>
  )
}
