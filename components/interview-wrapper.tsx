'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AudioVideoInterviewer from './audio-video-interviewer'

function InterviewContent({ interviewType }: { interviewType: string }) {
  const searchParams = useSearchParams()
  const scheduledId = searchParams.get('scheduledInterviewId')
  
  return <AudioVideoInterviewer interviewType={interviewType} scheduledInterviewId={scheduledId} />
}

export default function InterviewWrapper({ interviewType }: { interviewType: string }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Preparing interview...</p>
        </div>
      </div>
    }>
      <InterviewContent interviewType={interviewType} />
    </Suspense>
  )
}
