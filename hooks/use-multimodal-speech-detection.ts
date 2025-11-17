"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface MultimodalSpeechDetectionOptions {
  onSpeechStart?: () => void
  onSpeechEnd?: () => void
  audioThreshold?: number
  silenceDuration?: number
  motionThreshold?: number
}

export function useMultimodalSpeechDetection({
  onSpeechStart,
  onSpeechEnd,
  audioThreshold = 25,
  silenceDuration = 2500,
  motionThreshold = 5,
}: MultimodalSpeechDetectionOptions = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const previousFrameRef = useRef<ImageData | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const shouldDetectRef = useRef(false)
  const lastSpeechEndRef = useRef<number>(0)

  const detectMotion = useCallback((currentFrame: ImageData, previousFrame: ImageData): number => {
    // Focus on mouth region (bottom third of face)
    const width = currentFrame.width
    const height = currentFrame.height
    const mouthRegionStart = Math.floor(height * 0.6) // Bottom 40% of frame

    let totalDiff = 0
    let pixelCount = 0

    for (let y = mouthRegionStart; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4
        const rDiff = Math.abs(currentFrame.data[i] - previousFrame.data[i])
        const gDiff = Math.abs(currentFrame.data[i + 1] - previousFrame.data[i + 1])
        const bDiff = Math.abs(currentFrame.data[i + 2] - previousFrame.data[i + 2])
        totalDiff += (rDiff + gDiff + bDiff) / 3
        pixelCount++
      }
    }

    return totalDiff / pixelCount
  }, [])

  const detectSpeech = useCallback(() => {
    if (!shouldDetectRef.current || !analyserRef.current || !canvasRef.current || !videoRef.current) {
      return
    }

    // Audio analysis
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length
    const audioActive = average > audioThreshold

    // Video analysis (lip movement detection)
    const canvas = canvasRef.current
    const video = videoRef.current
    const ctx = canvas.getContext("2d", { willReadFrequently: true })

    let visualActive = false
    if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height)

      if (previousFrameRef.current) {
        const motion = detectMotion(currentFrame, previousFrameRef.current)
        visualActive = motion > motionThreshold
      }

      previousFrameRef.current = currentFrame
    }

    // Combined detection: both audio AND visual cues
    const isSpeakingNow = audioActive && visualActive

    if (isSpeakingNow) {
      // Clear silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }

      // Trigger speech start if not already speaking
      if (!isSpeaking) {
        const now = Date.now()
        // Debounce: only trigger if it's been at least 1 second since last speech end
        if (now - lastSpeechEndRef.current > 1000) {
          console.log("[v0] Multimodal: User started speaking (audio + visual)")
          setIsSpeaking(true)
          onSpeechStart?.()
        }
      }
    } else if (isSpeaking) {
      // Start silence timer if not already started
      if (!silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          console.log("[v0] Multimodal: User stopped speaking (silence detected)")
          setIsSpeaking(false)
          lastSpeechEndRef.current = Date.now()
          onSpeechEnd?.()
          silenceTimerRef.current = null
        }, silenceDuration)
      }
    }

    animationFrameRef.current = requestAnimationFrame(detectSpeech)
  }, [isSpeaking, audioThreshold, silenceDuration, motionThreshold, onSpeechStart, onSpeechEnd, detectMotion])

  const startDetection = useCallback(
    async (stream: MediaStream, videoElement: HTMLVideoElement) => {
      try {
        console.log("[v0] Starting multimodal speech detection...")

        // Setup audio analysis
        audioContextRef.current = new AudioContext()
        const source = audioContextRef.current.createMediaStreamSource(stream)
        analyserRef.current = audioContextRef.current.createAnalyser()
        analyserRef.current.fftSize = 2048
        analyserRef.current.smoothingTimeConstant = 0.8
        source.connect(analyserRef.current)

        // Setup video analysis
        videoRef.current = videoElement
        canvasRef.current = document.createElement("canvas")
        canvasRef.current.width = 320
        canvasRef.current.height = 240

        shouldDetectRef.current = true
        setIsDetecting(true)
        detectSpeech()

        console.log("[v0] Multimodal detection started successfully")
      } catch (error) {
        console.error("[v0] Error starting multimodal detection:", error)
      }
    },
    [detectSpeech],
  )

  const stopDetection = useCallback(() => {
    console.log("[v0] Stopping multimodal detection...")
    shouldDetectRef.current = false
    setIsDetecting(false)
    setIsSpeaking(false)

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    analyserRef.current = null
    videoRef.current = null
    canvasRef.current = null
    previousFrameRef.current = null
  }, [])

  useEffect(() => {
    return () => {
      stopDetection()
    }
  }, [stopDetection])

  return {
    isSpeaking,
    isDetecting,
    startDetection,
    stopDetection,
  }
}
