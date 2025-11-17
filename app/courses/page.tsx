"use client"

import { useRouter } from 'next/navigation'
import DashboardNavbar from "@/components/dashboard-navbar"
import { Card } from "@/components/ui/card"

export default function CoursesPage() {
  const router = useRouter()

  const streams = [
    {
      id: "frontend",
      title: "Frontend Development",
      icon: "🎨",
      description: "Master modern frontend technologies and frameworks",
      color: "from-blue-50 to-cyan-50",
      subcourses: 6,
    },
    {
      id: "backend",
      title: "Backend Development",
      icon: "⚙️",
      description: "Build scalable server-side applications",
      color: "from-purple-50 to-pink-50",
      subcourses: 6,
    },
    {
      id: "fullstack",
      title: "Full Stack Development",
      icon: "🔗",
      description: "Combine frontend and backend expertise",
      color: "from-green-50 to-emerald-50",
      subcourses: 6,
    },
    {
      id: "datascience",
      title: "Data Science & ML",
      icon: "📊",
      description: "Explore machine learning and data analysis",
      color: "from-orange-50 to-red-50",
      subcourses: 6,
    },
    {
      id: "devops",
      title: "DevOps & Cloud",
      icon: "☁️",
      description: "Master deployment and infrastructure",
      color: "from-indigo-50 to-blue-50",
      subcourses: 6,
    },
    {
      id: "mobile",
      title: "Mobile Development",
      icon: "📱",
      description: "Build native and cross-platform apps",
      color: "from-rose-50 to-pink-50",
      subcourses: 6,
    },
    {
      id: "productmgmt",
      title: "Product Management",
      icon: "🎯",
      description: "Lead product strategy and vision",
      color: "from-yellow-50 to-amber-50",
      subcourses: 6,
    },
    {
      id: "qa",
      title: "QA & Testing",
      icon: "✅",
      description: "Ensure quality and reliability",
      color: "from-teal-50 to-cyan-50",
      subcourses: 6,
    },
  ]

  return (
    <main className="min-h-screen bg-white">
      <DashboardNavbar />

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">Interview Courses</h1>
          <p className="text-lg text-gray-600">Choose your career path and specialize in your field</p>
        </div>

        {/* Streams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {streams.map((stream) => (
            <Card
              key={stream.id}
              className="p-6 border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group"
              onClick={() => router.push(`/courses/${stream.id}`)}
            >
              <div
                className={`bg-gradient-to-br ${stream.color} p-4 rounded-lg mb-4 group-hover:scale-105 transition-transform`}
              >
                <span className="text-4xl">{stream.icon}</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{stream.title}</h3>
              <p className="text-sm text-gray-600 mb-4">{stream.description}</p>
              <p className="text-xs text-blue-600 font-medium">{stream.subcourses} courses</p>
            </Card>
          ))}
        </div>
      </div>
    </main>
  )
}
