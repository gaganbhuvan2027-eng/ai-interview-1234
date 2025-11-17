"use client"

import InterviewRoom from "@/components/interview-room"
import { useParams } from "next/navigation"

export default function InterviewPage() {
  const params = useParams()
  const interviewType = params.type as string

  return <InterviewRoom interviewType={interviewType} />
}
