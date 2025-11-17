'use client'

import { use, useEffect, useState } from 'react'
import { InterviewRoom } from '@/components/interview-room'

export default function CourseInterviewPage({
  params,
}: {
  params: Promise<{ stream: string; subcourse: string }>
}) {
  const [mounted, setMounted] = useState(false)
  const { stream, subcourse } = use(params)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">Loading interview...</div>
      </div>
    )
  }

  const interviewType = `${stream}-${subcourse}`
  const title = `${stream.charAt(0).toUpperCase() + stream.slice(1)} - ${subcourse.charAt(0).toUpperCase() + subcourse.slice(1)}`

  return <InterviewRoom interviewType={interviewType} title={title} />
}
