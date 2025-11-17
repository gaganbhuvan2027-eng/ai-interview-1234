"use client"

import { useEffect, useRef, useState } from "react"

const features = [
  {
    title: "Real-Time AI Insights",
    description:
      "Get instant feedback on your tone, confidence, and communication style as you practice your interview responses.",
    details: "Our advanced AI analyzes your speech patterns, body language, and facial expressions to provide actionable feedback in real-time.",
    icon: "⚡",
  },
  {
    title: "Custom Interview Scenarios",
    description:
      "Practice with tailored interview questions based on your target role, industry, and experience level.",
    details: "Choose from behavioral, technical, or situational questions customized to match your specific career path and interview type.",
    icon: "🎯",
  },
  {
    title: "Performance Reports & Feedback",
    description: "Receive detailed analytics and actionable insights to improve your interview performance over time.",
    details: "Track your progress with comprehensive reports covering communication skills, technical accuracy, and confidence metrics.",
    icon: "📊",
  },
  {
    title: "Voice-Powered Conversation",
    description: "Experience natural, hands-free interview practice with our advanced voice recognition technology.",
    details: "Intelligent turn-taking and real-time speech processing create a seamless, conversational interview experience.",
    icon: "🎤",
  },
  {
    title: "Video Analysis & Feedback",
    description: "Get insights on your body language, facial expressions, and overall presentation during interviews.",
    details: "Our AI analyzes your visual presence to help you project confidence and professionalism.",
    icon: "📹",
  },
  {
    title: "Personalized Learning Path",
    description: "Follow a customized training program designed to address your specific strengths and areas for improvement.",
    details: "Adaptive learning algorithms adjust difficulty and focus areas based on your performance and goals.",
    icon: "🎓",
  },
]
// </CHANGE>

export default function Features() {
  const [visibleCards, setVisibleCards] = useState<boolean[]>(new Array(features.length).fill(false))
  // </CHANGE>
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleCards(new Array(features.length).fill(true))
            // </CHANGE>
          }
        })
      },
      { threshold: 0.1 },
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section id="features" ref={sectionRef} className="py-24 px-6 bg-white relative overflow-hidden">
      {/* Decorative gradient divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />

      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4 text-balance">
            Powerful Features for Interview Success
          </h2>
          <p className="text-xl text-gray-600 text-balance">
            Everything you need to prepare and ace your next interview
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`group p-8 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-500 transform ${
                visibleCards[index] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{
                transitionDelay: `${index * 100}ms`,
              }}
            >
              {/* Icon */}
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>

              {/* Description */}
              <p className="text-gray-600 leading-relaxed mb-3">{feature.description}</p>

              <p className="text-sm text-gray-500 leading-relaxed">{feature.details}</p>
              {/* </CHANGE> */}

              {/* Hover accent */}
              <div className="mt-4 h-1 w-0 bg-gradient-to-r from-blue-600 to-blue-400 group-hover:w-12 transition-all duration-300" />
            </div>
          ))}
        </div>
        {/* </CHANGE> */}
      </div>
    </section>
  )
}
