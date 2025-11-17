"use client"

interface PerformanceMetricsProps {
  overall_score: number
  communication_score: number
  technical_score: number
  problem_solving_score: number
  confidence_score: number
  eye_contact_score?: number
  smile_score?: number
  stillness_score?: number
  face_confidence_score?: number
}

export default function PerformanceMetrics({
  overall_score,
  communication_score,
  technical_score,
  problem_solving_score,
  confidence_score,
  eye_contact_score = 0,
  smile_score = 0,
  stillness_score = 0,
  face_confidence_score = 0,
}: PerformanceMetricsProps) {
  const facialConfidenceScore = Math.round(
    (eye_contact_score + smile_score + stillness_score + face_confidence_score) / 4,
  )
  const softSkillsScore = Math.round((communication_score + confidence_score) / 2)

  const scoreMetrics = [
    { label: "Technical Knowledge", score: technical_score, icon: "💻" },
    { label: "Problem Solving", score: problem_solving_score, icon: "🧠" },
    { label: "Soft Skills", score: softSkillsScore, icon: "🤝" },
    { label: "Facial & Speech Confidence", score: facialConfidenceScore, icon: "😊" },
  ]

  const ScoreCard = ({ label, score, icon }: { label: string; score: number; icon: string }) => {
    const getColorClass = (score: number) => {
      if (score >= 80) return "text-green-600"
      if (score >= 60) return "text-blue-600"
      if (score >= 40) return "text-amber-600"
      return "text-red-600"
    }

    const getBarColorClass = (score: number) => {
      if (score >= 80) return "bg-green-600"
      if (score >= 60) return "bg-blue-600"
      if (score >= 40) return "bg-amber-600"
      return "bg-red-600"
    }

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 hover:shadow-lg transition-all duration-300">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">{label}</p>
            <p className={`text-3xl font-bold ${getColorClass(score)}`}>{score}</p>
          </div>
          <span className="text-3xl">{icon}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`${getBarColorClass(score)} h-full transition-all duration-1000 ease-out`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
      <h2 className="text-2xl font-bold text-gray-900 mb-8">Performance Breakdown</h2>

      {/* Main Performance Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {scoreMetrics.map((metric) => (
          <ScoreCard key={metric.label} {...metric} />
        ))}
      </div>

      {/* Detailed Facial & Speech Metrics */}
      <div className="bg-white rounded-xl border border-gray-200 p-8 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Facial & Speech Expression Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Eye Contact */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700 font-medium">Eye Contact</span>
              <span className="text-lg font-bold text-blue-600">{Math.round(eye_contact_score)}/100</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-1000"
                style={{ width: `${eye_contact_score}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">Maintains steady eye contact with camera</p>
          </div>

          {/* Smile & Expression */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700 font-medium">Smile & Expression</span>
              <span className="text-lg font-bold text-green-600">{Math.round(smile_score)}/100</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-green-600 h-full rounded-full transition-all duration-1000"
                style={{ width: `${smile_score}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">Positive facial expressions throughout</p>
          </div>

          {/* Stillness & Posture */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700 font-medium">Posture & Stillness</span>
              <span className="text-lg font-bold text-purple-600">{Math.round(stillness_score)}/100</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-purple-600 h-full rounded-full transition-all duration-1000"
                style={{ width: `${stillness_score}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">Composed body language and positioning</p>
          </div>

          {/* Speech Confidence */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700 font-medium">Speech Confidence</span>
              <span className="text-lg font-bold text-amber-600">{Math.round(face_confidence_score)}/100</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-amber-600 h-full rounded-full transition-all duration-1000"
                style={{ width: `${face_confidence_score}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">Clear and confident speech delivery</p>
          </div>
        </div>
      </div>

      {/* Soft Skills Summary */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-8 mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Soft Skills Assessment</h3>
        <p className="text-gray-700 mb-4">
          Your soft skills score is based on your communication style and confidence level demonstrated throughout the
          interview.
        </p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Overall Soft Skills</p>
            <p className="text-4xl font-bold text-blue-600">{softSkillsScore}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 mb-1">Recommendation</p>
            <p className="text-lg font-semibold text-gray-900">
              {softSkillsScore >= 80 ? "Excellent" : softSkillsScore >= 60 ? "Good" : "Needs Improvement"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
