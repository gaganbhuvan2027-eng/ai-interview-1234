"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from 'next/navigation'
import FaceAnalysis, { type FaceAnalysisRef } from "./face-analysis"
import AudioVisualizer from "./audio-visualizer"
import AudioReactiveOrb from "./audio-reactive-orb"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"
import { useTextToSpeech } from "@/hooks/use-text-to-speech"
import { useVoiceAgent } from "@/hooks/use-voice-agent"
import { createClient } from "@/lib/supabase/client"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"

interface AudioVideoInterviewerProps {
  interviewType: string
  customScenario?: {
    description: string
    goals: string[]
    focusAreas: string[]
    context: string
  }
  scheduledInterviewId?: string | null
}

interface TranscriptMessage {
  type: "ai" | "user"
  content: string
  timestamp: Date
  questionNumber?: number
}

export default function AudioVideoInterviewer({ interviewType, customScenario, scheduledInterviewId }: AudioVideoInterviewerProps) {
  const router = useRouter()
  const [scheduledInterviewIdState, setScheduledInterviewIdState] = useState<string | null>(null)
  
  useEffect(() => {
    // Only access search params on client side after mount
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const schedId = params.get('scheduledInterviewId')
      if (schedId) {
        setScheduledInterviewIdState(schedId)
      }
    }
  }, [])
  
  useEffect(() => {
    // Use scheduledInterviewId prop directly if available, otherwise use state from URL params
    const currentScheduledId = scheduledInterviewId || scheduledInterviewIdState
    
    if (!currentScheduledId) return

    console.log('[v0] Starting scheduled interview with ID:', currentScheduledId)
    
    // Bypass setup dialog and start directly
    setShowWelcome(false)
    
    // Start the interview automatically
    startInterviewWithSettings(selectedDuration!, selectedDifficulty!)
  }, [scheduledInterviewId, scheduledInterviewIdState]) // Depend on both prop and state

  const [isListening, setIsListening] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState("")
  const [userResponse, setUserResponse] = useState("")
  const [showWelcome, setShowWelcome] = useState(true)
  const [interviewId, setInterviewId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [responses, setResponses] = useState<Array<{ question: string; answer: string }>>([])
  const [error, setError] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([])
  const [showSetupDialog, setShowSetupDialog] = useState(false)
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null)
  const [customDuration, setCustomDuration] = useState("")
  const [totalQuestions, setTotalQuestions] = useState(5)
  const [showSkipConfirm, setShowSkipConfirm] = useState(false)
  const [isProcessingResponse, setIsProcessingResponse] = useState(false)
  const [isAIThinking, setIsAIThinking] = useState(false)
  const [conversationState, setConversationState] = useState<"idle" | "ai-speaking" | "listening" | "processing">(
    "idle",
  )
  const [showResults, setShowResults] = useState(false)
  const [analysisData, setAnalysisData] = useState<any>(null)
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false)
  
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const faceAnalysisRef = useRef<FaceAnalysisRef>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  const [micChecked, setMicChecked] = useState(false)
  const [cameraChecked, setCameraChecked] = useState(false)
  const [micTestStream, setMicTestStream] = useState<MediaStream | null>(null)
  const [cameraTestStream, setCameraTestStream] = useState<MediaStream | null>(null)
  const [micLevel, setMicLevel] = useState(0)
  const micCheckVideoRef = useRef<HTMLVideoElement>(null)
  const micCheckAudioContextRef = useRef<AudioContext | null>(null)

  const responseTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastTranscriptRef = useRef<string>("")
  const lastProcessedResponseRef = useRef<string>("")
  const isProcessingRef = useRef<boolean>(false)

  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt' | 'checking'>('checking')
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt' | 'checking'>('checking')

  const {
    startListening,
    stopListening,
    transcript: speechTranscript,
    isDetectingSpeech,
    resetTranscript,
  } = useSpeechRecognition()
  const { speak, isSpeaking } = useTextToSpeech()
  const supabase = createClient()

  const voiceAgent = useVoiceAgent({
    onUserSpeechStart: () => {
      console.log("[v0] Voice Agent: User started speaking")
      setConversationState("listening")
    },
    onUserSpeechEnd: (transcript: string, analysis) => {
      console.log(
        "[v0] Voice Agent: User stopped speaking",
        "| LLM says complete:",
        analysis.llmIsComplete,
        "| Confidence:",
        analysis.llmConfidence,
        "| Reason:",
        analysis.llmReasoning,
      )
      setUserResponse(transcript)
      handleProcessUserResponse(transcript)
    },
    onTranscriptUpdate: (transcript: string, analysis) => {
      // Show live transcript in UI for feedback
      console.log(
        "[v0] Live transcript update:",
        transcript.substring(0, 30),
        "| LLM complete:",
        analysis.llmIsComplete,
        "| Confidence:",
        analysis.llmConfidence?.toFixed(2),
        "| Reason:",
        analysis.llmReasoning,
      )
    },
    onInterrupt: () => {
      console.log("[v0] Voice Agent: User interrupted AI")
      window.speechSynthesis?.cancel()
      setConversationState("listening")
    },
    enableBargeIn: true,
    audioThreshold: 45,
    currentQuestion: currentQuestion,
  })

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [transcript])

  useEffect(() => {
    voiceAgent.setAISpeaking(conversationState === "ai-speaking")
  }, [conversationState, voiceAgent])

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        // Check microphone permission
        const micResult = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        setMicPermission(micResult.state as 'granted' | 'denied' | 'prompt')
        
        // Check camera permission
        const cameraResult = await navigator.permissions.query({ name: 'camera' as PermissionName })
        setCameraPermission(cameraResult.state as 'granted' | 'denied' | 'prompt')

        // Listen for permission changes
        micResult.onchange = () => setMicPermission(micResult.state as 'granted' | 'denied' | 'prompt')
        cameraResult.onchange = () => setCameraPermission(cameraResult.state as 'granted' | 'denied' | 'prompt')
      } catch (error) {
        console.error('[v0] Permission check failed:', error)
        setMicPermission('prompt')
        setCameraPermission('prompt')
      }
    }

    checkPermissions()
  }, [])

  const testMicrophone = async () => {
    try {
      console.log('[v0] Testing microphone...')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setMicTestStream(stream)
      setMicPermission('granted')
      console.log('[v0] Microphone access granted')
      
      // Analyze audio levels
      const audioContext = new AudioContext()
      micCheckAudioContextRef.current = audioContext
      const analyser = audioContext.createAnalyser()
      const microphone = audioContext.createMediaStreamSource(stream)
      microphone.connect(analyser)
      analyser.fftSize = 256
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      
      const checkLevel = () => {
        if (!micTestStream) return
        
        analyser.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length
        setMicLevel(average)
        
        if (micTestStream) {
          requestAnimationFrame(checkLevel)
        }
      }
      
      checkLevel()
      setMicChecked(true)
      console.log('[v0] Microphone test successful')
    } catch (error: any) {
      console.error('[v0] Microphone test failed:', error)
      console.error('[v0] Error name:', error.name)
      console.error('[v0] Error message:', error.message)
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setMicPermission('denied')
        alert('Microphone access denied. Please allow microphone access in your browser settings and reload the page.')
      } else if (error.name === 'NotFoundError') {
        alert('No microphone found on this device.')
      } else {
        alert('Unable to access microphone: ' + error.message)
      }
    }
  }

  const testCamera = async () => {
    try {
      console.log('[v0] Testing camera...')
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      setCameraTestStream(stream)
      setCameraPermission('granted')
      console.log('[v0] Camera access granted')
      
      if (micCheckVideoRef.current) {
        micCheckVideoRef.current.srcObject = stream
        await micCheckVideoRef.current.play()
        console.log('[v0] Camera video playing')
      }
      
      setCameraChecked(true)
      console.log('[v0] Camera test successful')
    } catch (error: any) {
      console.error('[v0] Camera test failed:', error)
      console.error('[v0] Error name:', error.name)
      console.error('[v0] Error message:', error.message)
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraPermission('denied')
        alert('Camera access denied. Please allow camera access in your browser settings and reload the page.')
      } else if (error.name === 'NotFoundError') {
        alert('No camera found on this device.')
      } else {
        alert('Unable to access camera: ' + error.message)
      }
    }
  }

  const stopDeviceTests = () => {
    if (micTestStream) {
      micTestStream.getTracks().forEach(track => track.stop())
      setMicTestStream(null)
    }
    
    if (cameraTestStream) {
      cameraTestStream.getTracks().forEach(track => track.stop())
      setCameraTestStream(null)
    }
    
    if (micCheckAudioContextRef.current) {
      micCheckAudioContextRef.current.close()
      micCheckAudioContextRef.current = null
    }
    
    setMicLevel(0)
  }

  useEffect(() => {
    return () => {
      stopDeviceTests()
    }
  }, [])

  const handleStartInterviewClick = () => {
    setShowSetupDialog(true)
  }

  const handleStartInterview = async () => {
    if (!selectedDuration || !selectedDifficulty) {
      return
    }

    setShowSetupDialog(false)
    await startInterviewWithSettings(selectedDuration, selectedDifficulty)
  }

  const startInterviewWithSettings = async (duration: number, difficulty: string) => {
    console.log(
      "[v0] Starting interview, type:",
      interviewType,
      "duration:",
      duration,
      "minutes",
      "difficulty:",
      difficulty,
    )
    setIsLoading(true)
    setError(null)

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        console.log("[v0] Auth failed:", authError?.message || "No user found")
        console.log("[v0] Redirecting to auth page...")
        router.push("/auth")
        return
      }

      console.log("[v0] User authenticated, ID:", user.id)

      console.log("[v0] Creating interview session...")
      const response = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewType,
          userId: user.id,
          userEmail: user.email,
          userName: user.user_metadata?.name || user.email?.split("@")[0],
          duration,
          difficulty,
          customScenario: customScenario || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to start interview: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("[v0] Interview session created:", data.interview?.id)

      if (data.interview) {
        setInterviewId(data.interview.id)
        setTotalQuestions(data.interview.question_count || 5)
        setShowWelcome(false)

        if (faceAnalysisRef.current) {
          const mediaStream = await faceAnalysisRef.current.startCamera()
          setStream(mediaStream)
        }

        console.log("[v0] Generating first question...")
        await generateNextQuestion(data.interview.id, 1, [], user.id)
      } else {
        throw new Error("No interview data received")
      }
    } catch (error) {
      console.error("[v0] Error starting interview:", error)
      setError(error instanceof Error ? error.message : "Failed to start interview. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Removed useEffect that used scheduledInterviewId state, now handled by the new useEffect above.

  const generateNextQuestion = async (
    interviewSessionId: string,
    questionNum: number,
    previousAnswers: Array<{ question: string; answer: string }>,
    userId: string,
  ) => {
    setIsLoading(true)
    setIsAIThinking(true)
    setError(null)

    try {
      console.log("[v0] Generating question", questionNum)
      console.log("[v0] Previous answers count:", previousAnswers.length)
      if (previousAnswers.length > 0) {
        console.log("[v0] Last answer:", previousAnswers[previousAnswers.length - 1].answer.substring(0, 50))
      }
      const response = await fetch("/api/interview/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewId: interviewSessionId,
          interviewType,
          questionNumber: questionNum,
          previousAnswers, // This is correctly passed
          userId: userId,
          customScenario: customScenario || null,
        }),
      })

      if (!response.ok) {
        let errorMessage = "Failed to generate question"
        try {
          const errorData = await response.json()
          console.log("[v0] API error response:", errorData)
          errorMessage = errorData.error || errorData.message || response.statusText || "Unknown error"
          if (errorData.details) {
            console.log("[v0] Error details:", errorData.details)
          }
        } catch (parseError) {
          console.log("[v0] Could not parse error response:", parseError)
          errorMessage = `Server error: ${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log("[v0] Question generated:", data.question)

      if (data.question) {
        setCurrentQuestion(data.question)
        setConversationState("ai-speaking")
        setIsAIThinking(false)

        const speakResult = speak(data.question)
        if (speakResult && typeof speakResult.then === "function") {
          speakResult
            .then(() => {
              console.log("[v0] AI finished speaking, auto-starting listening...")
              setTimeout(() => {
                setConversationState("listening")
                voiceAgent.startListening()
              }, 300)
            })
            .catch((err) => {
              console.error("[v0] Error during speech:", err)
              setTimeout(() => {
                setConversationState("listening")
                voiceAgent.startListening()
              }, 300)
            })
        } else {
          console.log("[v0] Speak didn't return promise, starting listening after delay...")
          setTimeout(() => {
            setConversationState("listening")
            voiceAgent.startListening()
          }, 1500)
        }

        setTranscript((prev) => [
          ...prev,
          {
            type: "ai",
            content: data.question,
            timestamp: new Date(),
            questionNumber: questionNum,
          },
        ])
      } else {
        throw new Error("No question received from server")
      }
    } catch (error) {
      console.error("[v0] Error generating question:", error)
      if (error instanceof Error) {
        console.error("[v0] Error message:", error.message)
        console.error("[v0] Error stack:", error.stack)
      }
      const errorMsg = error instanceof Error ? error.message : "Failed to generate question. Please try again."
      setError(errorMsg)
      setIsAIThinking(false)
      setConversationState("idle")
    } finally {
      setIsLoading(false)
    }
  }

  const handleProcessUserResponse = async (transcript: string) => {
    if (isProcessingRef.current || !transcript.trim()) {
      return
    }

    const finalResponse = transcript.trim()

    if (finalResponse === lastProcessedResponseRef.current) {
      return
    }

    isProcessingRef.current = true
    setIsProcessingResponse(true)
    setConversationState("processing")

    voiceAgent.stopListening()

    if (!finalResponse || !interviewId) {
      isProcessingRef.current = false
      setIsProcessingResponse(false)
      setTimeout(() => {
        setConversationState("listening")
        voiceAgent.startListening()
      }, 1000)
      return
    }

    lastProcessedResponseRef.current = finalResponse

    setTranscript((prev) => [
      ...prev,
      {
        type: "user",
        content: finalResponse,
        timestamp: new Date(),
      },
    ])

    setIsLoading(true)
    try {
      const saveResponse = await fetch("/api/interview/response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewId,
          question: currentQuestion,
          answer: finalResponse,
          questionNumber: currentQuestionIndex + 1,
          skipped: false,
        }),
      })

      const responseData = await saveResponse.json()

      if (!saveResponse.ok) {
        throw new Error(responseData.error || "Failed to save response")
      }

      const newResponses = [...responses, { question: currentQuestion, answer: finalResponse }]
      setResponses(newResponses)

      setUserResponse("")
      lastProcessedResponseRef.current = ""
      isProcessingRef.current = false
      setIsProcessingResponse(false)

      if (currentQuestionIndex < totalQuestions - 1) {
        const nextQuestionIndex = currentQuestionIndex + 1
        setCurrentQuestionIndex(nextQuestionIndex)
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          setConversationState("ai-speaking")
          await generateNextQuestion(interviewId, nextQuestionIndex + 1, newResponses, user.id)
        }
      } else {
        await handleInterviewCompletion(newResponses)
      }
    } catch (error) {
      console.error("[v0] Error processing response:", error)
      setError(error instanceof Error ? error.message : "Error saving your response. Please try again.")
      isProcessingRef.current = false
      setIsProcessingResponse(false)
      setIsLoading(false)
      setConversationState("idle")
    }
  }

  const handleEndInterview = () => {
    voiceAgent.stopListening()
    if (faceAnalysisRef.current) {
      faceAnalysisRef.current.stopCamera()
    }
    router.push("/dashboard")
  }

  const handleSkipQuestion = async () => {
    voiceAgent.stopListening()
    setShowSkipConfirm(false)

    if (!interviewId) return

    try {
      setIsLoading(true)

      console.log("[v0] Saving skipped question...")
      const saveResponse = await fetch("/api/interview/response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewId,
          question: currentQuestion,
          answer: "[SKIPPED]",
          questionNumber: currentQuestionIndex + 1,
          skipped: true,
        }),
      })

      if (!saveResponse.ok) {
        console.error("[v0] Failed to save skipped question")
      }

      const newResponses = [...responses, { question: currentQuestion, answer: "[SKIPPED]" }]
      setResponses(newResponses)

      setUserResponse("")
      resetTranscript()
      lastTranscriptRef.current = ""

      if (currentQuestionIndex < totalQuestions - 1) {
        const nextQuestionIndex = currentQuestionIndex + 1
        setCurrentQuestionIndex(nextQuestionIndex)
        await generateNextQuestion(interviewId, nextQuestionIndex + 1, newResponses, interviewId)
      } else {
        await handleInterviewCompletion(newResponses)
      }
    } catch (error) {
      console.error("[v0] Error skipping question:", error)
      setError("Error processing skip. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleInterviewCompletion = async (finalResponses: Array<{ question: string; answer: string }>) => {
    console.log("[v0] Interview completed, starting analysis...")

    const completionMessage =
      "Thank you for your responses! Your interview is now complete. Analyzing your performance..."

    setTranscript((prev) => [
      ...prev,
      {
        type: "ai",
        content: completionMessage,
        timestamp: new Date(),
      },
    ])

    const speakResult = speak(completionMessage)
    if (speakResult && typeof speakResult.then === "function") {
      speakResult.catch((err) => {
        console.error("[v0] Error speaking completion message:", err)
      })
    }

    // Get face metrics before stopping camera
    const faceMetrics = faceAnalysisRef.current?.getAverageMetrics()

    // Stop the camera
    if (faceAnalysisRef.current) {
      faceAnalysisRef.current.stopCamera()
    }

    // Calculate questions skipped
    const questionsSkipped = finalResponses.filter((r) => r.answer.includes("[SKIPPED]")).length

    setIsGeneratingAnalysis(true)
    

    try {
      console.log("[v0] Calling analyze API...")
      const analysisResponse = await fetch("/api/interview/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewId,
          interviewType,
          faceMetrics: faceMetrics || undefined,
          questionsSkipped,
          customScenario: customScenario || null,
        }),
      })

      if (analysisResponse.ok) {
        const analysisData = await analysisResponse.json()
        console.log("[v0] Analysis completed successfully:", analysisData)

        setAnalysisData(analysisData.analysis)
        setIsGeneratingAnalysis(false)
        setShowResults(true)
        
        // Announce results are ready
        speak("Your performance report is now ready. Great job completing the interview!")
        
      } else {
        const errorData = await analysisResponse.json()
        const errorMsg = errorData.error || analysisResponse.statusText
        console.error("[v0] Analysis API error:", errorMsg)
        throw new Error(`Analysis failed: ${errorMsg}`)
      }
    } catch (error) {
      console.error("[v0] Error during interview completion:", error)
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error("[v0] Full error details:", errorMsg)
      setError(`Error analyzing interview: ${errorMsg}`)
      setIsGeneratingAnalysis(false)
    }
  }

  if (showResults && analysisData) {
    return (
      <div className="flex-1 flex flex-col gap-6 p-8 max-w-6xl mx-auto">
        {/* Success Header */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center text-white text-3xl animate-bounce">
              ✓
            </div>
            <div>
              <h2 className="text-2xl font-bold text-green-900">Interview Complete!</h2>
              <p className="text-green-700">Your performance has been analyzed. Review your results below.</p>
            </div>
          </div>
        </div>

        {/* Overall Score Card */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white text-center">
          <h3 className="text-lg font-medium mb-2 opacity-90">Overall Score</h3>
          <div className="text-6xl font-bold mb-2">{analysisData.overall_score}</div>
          <div className="text-xl opacity-90">out of 100</div>
        </div>

        {/* Score Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">{analysisData.communication_score}</div>
            <div className="text-sm text-gray-600 font-medium">Communication</div>
          </div>
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-1">{analysisData.technical_score}</div>
            <div className="text-sm text-gray-600 font-medium">Technical</div>
          </div>
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-1">{analysisData.problem_solving_score}</div>
            <div className="text-sm text-gray-600 font-medium">Problem Solving</div>
          </div>
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6 text-center">
            <div className="text-3xl font-bold text-orange-600 mb-1">{analysisData.confidence_score}</div>
            <div className="text-sm text-gray-600 font-medium">Confidence</div>
          </div>
        </div>

        {/* Strengths & Improvements */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Strengths */}
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
            <h3 className="text-xl font-bold text-green-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">💪</span>
              Key Strengths
            </h3>
            <ul className="space-y-3">
              {analysisData.strengths.map((strength: string, index: number) => (
                <li key={index} className="flex gap-3 text-gray-700">
                  <span className="text-green-600 font-bold flex-shrink-0">✓</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Improvements */}
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6">
            <h3 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              Areas to Improve
            </h3>
            <ul className="space-y-3">
              {analysisData.improvements.map((improvement: string, index: number) => (
                <li key={index} className="flex gap-3 text-gray-700">
                  <span className="text-amber-600 font-bold flex-shrink-0">→</span>
                  <span>{improvement}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Detailed Feedback */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">📝</span>
            Detailed Feedback
          </h3>
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">{analysisData.detailed_feedback}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center pt-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => router.push(`/results?interviewId=${interviewId}`)}
            className="px-8 py-3 border-2 border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
          >
            View Full Report
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Start New Interview
          </button>
        </div>
      </div>
    )
  }
  

  if (isGeneratingAnalysis) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Analyzing Your Performance</h2>
          <p className="text-lg text-gray-600 mb-4">
            Our AI is reviewing your responses and generating detailed feedback...
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">This usually takes 10-15 seconds</p>
          </div>
        </div>
      </div>
    )
  }
  

  if (showWelcome) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
        <div className="text-center max-w-2xl">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to Your AI Interview</h1>
          <p className="text-lg text-gray-600 mb-8">
            This is a real {interviewType} interview powered by AI. You'll answer questions and receive detailed
            performance feedback.
          </p>

          {customScenario && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Custom Scenario</h2>
              <div className="text-left space-y-3 text-gray-700">
                <p className="text-base">
                  <span className="font-semibold">Description:</span> {customScenario.description}
                </p>
                <div>
                  <span className="font-semibold">Goals:</span>
                  <ul className="ml-4 list-disc">
                    {customScenario.goals.map((goal, i) => (
                      <li key={i}>{goal}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="font-semibold">Focus Areas:</span>
                  <ul className="ml-4 list-disc">
                    {customScenario.focusAreas.map((area, i) => (
                      <li key={i}>{area}</li>
                    ))}
                  </ul>
                </div>
                {customScenario.context && (
                  <p className="text-base">
                    <span className="font-semibold">Context:</span> {customScenario.context}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Interview Tips:</h2>
            <ul className="text-left space-y-3 text-gray-700">
              <li className="flex gap-3">
                <span className="text-blue-600 font-bold">•</span>
                <span>Speak clearly and naturally</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-600 font-bold">•</span>
                <span>Take your time to think before answering</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-600 font-bold">•</span>
                <span>Use examples from your experience</span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-8 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Device Check</h2>
            <p className="text-sm text-gray-500 mb-4">Verify your devices are working properly</p>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Microphone Check */}
              <div>
                {micPermission === 'denied' ? (
                  <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 text-left">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-red-600 font-semibold">🎤 Microphone Blocked</span>
                    </div>
                    <p className="text-xs text-gray-700 mb-3">
                      Please enable microphone access:
                    </p>
                    <ol className="text-xs text-gray-600 space-y-1 mb-3">
                      <li>1. Click the lock/info icon in the address bar</li>
                      <li>2. Find "Microphone" permissions</li>
                      <li>3. Change to "Allow"</li>
                      <li>4. Reload this page</li>
                    </ol>
                    <button
                      onClick={() => window.location.reload()}
                      className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      Reload Page
                    </button>
                  </div>
                ) : !micTestStream ? (
                  <button
                    onClick={testMicrophone}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
                  >
                    <span className="font-medium">Test Mic</span>
                  </button>
                ) : (
                  <div className="bg-white border-2 border-green-500 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Microphone</span>
                      <span className="text-green-600 text-sm font-semibold">✓</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-green-500 transition-all duration-100"
                        style={{ width: `${Math.min(100, (micLevel / 128) * 100)}%` }}
                      />
                    </div>
                    <button
                      onClick={() => {
                        stopDeviceTests()
                        setMicChecked(false)
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Stop
                    </button>
                  </div>
                )}
              </div>

              {/* Camera Check */}
              <div>
                {cameraPermission === 'denied' ? (
                  <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 text-left">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-red-600 font-semibold">📷 Camera Blocked</span>
                    </div>
                    <p className="text-xs text-gray-700 mb-3">
                      Please enable camera access:
                    </p>
                    <ol className="text-xs text-gray-600 space-y-1 mb-3">
                      <li>1. Click the lock/info icon in the address bar</li>
                      <li>2. Find "Camera" permissions</li>
                      <li>3. Change to "Allow"</li>
                      <li>4. Reload this page</li>
                    </ol>
                    <button
                      onClick={() => window.location.reload()}
                      className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      Reload Page
                    </button>
                  </div>
                ) : !cameraTestStream ? (
                  <button
                    onClick={testCamera}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
                  >
                    <span className="font-medium">Test Camera</span>
                  </button>
                ) : (
                  <div className="bg-white border-2 border-green-500 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Camera</span>
                      <span className="text-green-600 text-sm font-semibold">✓</span>
                    </div>
                    <div className="relative rounded overflow-hidden bg-gray-900 h-20 mb-2">
                      <video
                        ref={micCheckVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      onClick={() => {
                        stopDeviceTests()
                        setCameraChecked(false)
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Stop
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleStartInterviewClick}
            disabled={isLoading}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Starting Interview..." : "Start Interview"}
          </button>
        </div>

        <AlertDialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
          <AlertDialogContent className="max-w-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl">Setup Your Interview</AlertDialogTitle>
              <AlertDialogDescription>
                Choose your session length and difficulty level to get started
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="grid grid-cols-2 gap-6 py-4">
              {/* Duration Selection */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Session Length</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedDuration(10)}
                    className={`w-full p-3 text-left border-2 rounded-lg transition-all ${
                      selectedDuration === 10
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    <div className="font-semibold text-gray-900">10 min</div>
                    <div className="text-sm text-gray-500">Quick Warmup</div>
                  </button>

                  <button
                    onClick={() => setSelectedDuration(30)}
                    className={`w-full p-3 text-left border-2 rounded-lg transition-all ${
                      selectedDuration === 30
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    <div className="font-semibold text-gray-900">30 min</div>
                    <div className="text-sm text-gray-500">Standard Mock</div>
                  </button>

                  <button
                    onClick={() => setSelectedDuration(60)}
                    className={`w-full p-3 text-left border-2 rounded-lg transition-all ${
                      selectedDuration === 60
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    <div className="font-semibold text-gray-900">60 min</div>
                    <div className="text-sm text-gray-500">Full Interview</div>
                  </button>

                  <div
                    className={`border-2 rounded-lg p-3 transition-all ${
                      selectedDuration && ![10, 30, 60].includes(selectedDuration)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="font-semibold text-gray-900 mb-2">Custom</div>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Minutes"
                        value={customDuration}
                        onChange={(e) => {
                          setCustomDuration(e.target.value)
                          const duration = Number.parseInt(e.target.value)
                          if (duration > 0 && duration <= 120) {
                            setSelectedDuration(duration)
                          }
                        }}
                        className="flex-1"
                        min="1"
                        max="120"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Difficulty Selection */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Difficulty Level</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedDifficulty("beginner")}
                    className={`w-full p-3 text-left border-2 rounded-lg transition-all ${
                      selectedDifficulty === "beginner"
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-green-300 hover:bg-green-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🌱</span>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">Beginner</div>
                        <div className="text-sm text-gray-500">Basic fundamentals</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedDifficulty("intermediate")}
                    className={`w-full p-3 text-left border-2 rounded-lg transition-all ${
                      selectedDifficulty === "intermediate"
                        ? "border-yellow-500 bg-yellow-50"
                        : "border-gray-200 hover:border-yellow-300 hover:bg-yellow-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📚</span>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">Intermediate</div>
                        <div className="text-sm text-gray-500">Practical applications</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedDifficulty("pro")}
                    className={`w-full p-3 text-left border-2 rounded-lg transition-all ${
                      selectedDifficulty === "pro"
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200 hover:border-orange-300 hover:bg-orange-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🚀</span>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">Pro</div>
                        <div className="text-sm text-gray-500">Advanced techniques</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedDifficulty("advanced")}
                    className={`w-full p-3 text-left border-2 rounded-lg transition-all ${
                      selectedDifficulty === "advanced"
                        ? "border-red-500 bg-red-50"
                        : "border-gray-200 hover:border-red-300 hover:bg-red-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🔥</span>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">Advanced</div>
                        <div className="text-sm text-gray-500">Expert-level</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <button
                onClick={handleStartInterview}
                disabled={!selectedDuration || !selectedDifficulty}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Interview
              </button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  return (
    <div className="flex-1 flex gap-4">
      <div className="flex-1 flex flex-col gap-4">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl overflow-hidden">
            <FaceAnalysis ref={faceAnalysisRef} />
          </div>

          <div className="rounded-xl bg-white p-6 flex flex-col items-center justify-center gap-6 relative">
            {voiceAgent.liveTranscript && voiceAgent.currentAnalysis && (
              <div className="absolute bottom-4 left-4 right-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-xs font-medium text-blue-600">Live Transcript:</p>
                  <div className="flex gap-2 text-xs">
                    <span className="text-gray-500">{voiceAgent.currentAnalysis.wordCount} words</span>
                    {voiceAgent.currentAnalysis.llmConfidence !== undefined && (
                      <span
                        className={`font-semibold ${voiceAgent.currentAnalysis.llmIsComplete ? "text-green-600" : "text-amber-600"}`}
                      >
                        {voiceAgent.currentAnalysis.llmIsComplete ? "✓" : "..."}{" "}
                        {(voiceAgent.currentAnalysis.llmConfidence * 100).toFixed(0)}%
                      </span>
                    )}
                    {voiceAgent.currentAnalysis.llmReasoning && (
                      <span className="text-xs text-gray-500 italic max-w-xs truncate">
                        {voiceAgent.currentAnalysis.llmReasoning}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-700 line-clamp-2">{voiceAgent.liveTranscript}</p>
              </div>
            )}

            <div className="text-center">
              {conversationState === "ai-speaking" && (
                <div className="flex flex-col items-center gap-3">
                  <AudioReactiveOrb audioLevel={voiceAgent.audioLevel} isActive={true} isSpeaking={false} />
                  <p className="text-sm font-medium text-blue-600">AI is speaking...</p>
                </div>
              )}

              {conversationState === "listening" && (
                <div className="flex flex-col items-center gap-3">
                  <AudioReactiveOrb
                    audioLevel={voiceAgent.audioLevel}
                    isActive={true}
                    isSpeaking={voiceAgent.isSpeechDetected}
                  />
                  <p className="text-sm font-medium text-green-600">Listening...</p>
                </div>
              )}

              {conversationState === "processing" && (
                <div className="flex flex-col items-center gap-3">
                  <AudioReactiveOrb audioLevel={voiceAgent.audioLevel * 0.5} isActive={true} isSpeaking={false} />
                  <p className="text-sm font-medium text-amber-600">Processing your answer...</p>
                </div>
              )}

              {conversationState === "idle" && (
                <div className="flex flex-col items-center gap-3">
                  <AudioReactiveOrb audioLevel={0} isActive={false} isSpeaking={false} />
                  <p className="text-sm font-medium text-gray-500">Ready</p>
                </div>
              )}

              {isAIThinking && <p className="text-sm font-medium text-purple-600 mt-2">Thinking...</p>}
            </div>

            <AudioVisualizer isActive={voiceAgent.isListening} isDetectingSpeech={voiceAgent.isSpeechDetected} />

            {userResponse && (
              <div className="max-w-md">
                <p className="text-xs text-gray-500 mb-1">Your response:</p>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200">{userResponse}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={handleEndInterview}
            className="px-8 py-3 border-2 border-red-300 text-red-700 font-medium rounded-lg hover:bg-red-50 transition-all"
          >
            End Interview
          </button>
        </div>

        <AlertDialog open={showSkipConfirm} onOpenChange={setShowSkipConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Skip This Question?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <div>It might affect your impression score.</div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="text-sm text-amber-900 font-medium">
                      ⚠ Skipping questions may negatively impact your performance evaluation.
                    </div>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <button
                onClick={handleSkipQuestion}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all"
              >
                Skip Question
              </button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="w-96 flex flex-col bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-4">
          <h3 className="font-semibold text-lg">Interview Transcript</h3>
          <p className="text-blue-100 text-sm">Live conversation history</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 max-h-[600px] scroll-smooth">
          {transcript.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              <p>Transcript will appear here once the interview starts</p>
            </div>
          ) : (
            transcript.map((message, index) => (
              <div key={index} className={`flex gap-3 ${message.type === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                    message.type === "ai" ? "bg-blue-600" : "bg-gray-600"
                  }`}
                >
                  {message.type === "ai" ? "AI" : "You"}
                </div>

                <div className={`flex-1 ${message.type === "user" ? "text-right" : ""}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-600">
                      {message.type === "ai" ? "AI Interviewer" : "Your Response"}
                    </span>
                    {message.questionNumber && <span className="text-xs text-gray-400">Q{message.questionNumber}</span>}
                  </div>
                  <div
                    className={`inline-block p-3 rounded-lg ${
                      message.type === "ai"
                        ? "bg-blue-50 border border-blue-200 text-gray-900"
                        : "bg-gray-100 border border-gray-200 text-gray-900"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={transcriptEndRef} />
        </div>
      </div>
    </div>
  )
}
