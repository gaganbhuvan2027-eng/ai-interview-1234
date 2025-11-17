"use client"

import { useState, useCallback, useRef } from "react"

export interface LipSyncData {
  mouthOpenness: number // 0-1, how open the mouth is
  mouthShape: "closed" | "narrow" | "medium" | "wide" | "round" // mouth shape for different phonemes
}

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [lipSyncData, setLipSyncData] = useState<LipSyncData>({
    mouthOpenness: 0,
    mouthShape: "closed",
  })
  const animationRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const analyzeMouthShape = (char: string): LipSyncData["mouthShape"] => {
    const lower = char.toLowerCase()

    // Vowels and their mouth shapes
    if (["a", "á", "à"].includes(lower)) return "wide"
    if (["e", "é", "è"].includes(lower)) return "medium"
    if (["i", "í", "ì"].includes(lower)) return "narrow"
    if (["o", "ó", "ò", "u", "ú", "ù"].includes(lower)) return "round"

    // Consonants that require mouth opening
    if (["m", "b", "p"].includes(lower)) return "closed"
    if (["f", "v"].includes(lower)) return "narrow"

    return "medium"
  }

  const animateLipSync = (text: string, duration: number) => {
    let charIndex = 0
    const chars = text.split("")
    const charDuration = duration / chars.length

    const animate = () => {
      if (charIndex >= chars.length) {
        setLipSyncData({ mouthOpenness: 0, mouthShape: "closed" })
        return
      }

      const char = chars[charIndex]
      const mouthShape = analyzeMouthShape(char)

      // Calculate openness based on character type
      let mouthOpenness = 0
      if (char === " ") {
        mouthOpenness = 0.1
      } else if (/[aeiouáéíóú]/i.test(char)) {
        mouthOpenness = 0.6 + Math.random() * 0.3 // 0.6-0.9 for vowels
      } else if (/[bcdfghjklmnpqrstvwxyz]/i.test(char)) {
        mouthOpenness = 0.3 + Math.random() * 0.2 // 0.3-0.5 for consonants
      }

      setLipSyncData({ mouthOpenness, mouthShape })

      charIndex++
      animationRef.current = setTimeout(animate, charDuration)
    }

    animate()
  }

  const speakWithBrowserTTS = async (text: string): Promise<void> => {
    return new Promise((resolve) => {
      try {
        if (!window.speechSynthesis) {
          console.warn("[v0] Speech synthesis not supported")
          resolve()
          return
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel()

        const utterance = new SpeechSynthesisUtterance(text)

        utterance.rate = 1.1 // Slightly faster for more natural conversation
        utterance.pitch = 1.05 // Slightly higher pitch for clarity
        utterance.volume = 1.0

        // Estimate duration for lip sync
        const estimatedDuration = text.length * 80

        utterance.onstart = () => {
          setIsSpeaking(true)
          animateLipSync(text, estimatedDuration)
        }

        utterance.onend = () => {
          setIsSpeaking(false)
          setLipSyncData({ mouthOpenness: 0, mouthShape: "closed" })
          resolve()
        }

        utterance.onerror = (event) => {
          if (event.error === "interrupted" || event.error === "canceled") {
            console.log("[v0] Speech interrupted/canceled (expected)")
          } else {
            console.warn("[v0] Browser TTS error (non-critical):", event.error)
          }
          setIsSpeaking(false)
          setLipSyncData({ mouthOpenness: 0, mouthShape: "closed" })
          resolve()
        }

        setTimeout(() => {
          const voices = window.speechSynthesis.getVoices()
          const preferredVoice =
            // Priority 1: Google voices (most natural)
            voices.find((v) => v.lang.startsWith("en") && v.name.includes("Google") && v.name.includes("US")) ||
            voices.find((v) => v.lang.startsWith("en") && v.name.includes("Google")) ||
            // Priority 2: Microsoft voices
            voices.find((v) => v.lang.startsWith("en") && v.name.includes("Microsoft") && v.name.includes("Natural")) ||
            voices.find((v) => v.lang.startsWith("en") && v.name.includes("Microsoft")) ||
            // Priority 3: Cloud voices (non-local)
            voices.find((v) => v.lang.startsWith("en") && !v.localService) ||
            // Priority 4: Any English voice
            voices.find((v) => v.lang.startsWith("en"))

          if (preferredVoice) {
            utterance.voice = preferredVoice
          }

          window.speechSynthesis.speak(utterance)
        }, 50)
      } catch (error) {
        console.warn("[v0] Browser TTS exception (non-critical):", error)
        setIsSpeaking(false)
        setLipSyncData({ mouthOpenness: 0, mouthShape: "closed" })
        resolve()
      }
    })
  }

  const speak = useCallback(async (text: string): Promise<void> => {
    return new Promise(async (resolve) => {
      try {
        // Cancel any ongoing speech
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current = null
        }
        if (animationRef.current) {
          clearTimeout(animationRef.current)
          animationRef.current = null
        }

        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        })

        const contentType = response.headers.get("Content-Type")

        // Check if we should fall back to browser TTS
        if (contentType?.includes("application/json")) {
          const data = await response.json()
          if (data.useBrowserTTS) {
            await speakWithBrowserTTS(text)
            resolve()
            return
          }
        }

        // Use audio from API (ElevenLabs)
        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)

        const audio = new Audio(audioUrl)
        audioRef.current = audio

        // Estimate duration for lip sync (more accurate with actual audio)
        const estimatedDuration = text.length * 70 // Slightly faster for realistic TTS

        audio.onloadedmetadata = () => {
          const actualDuration = audio.duration * 1000
          animateLipSync(text, actualDuration || estimatedDuration)
        }

        audio.onplay = () => {
          setIsSpeaking(true)
          if (!audio.duration) {
            animateLipSync(text, estimatedDuration)
          }
        }

        audio.onended = () => {
          setIsSpeaking(false)
          setLipSyncData({ mouthOpenness: 0, mouthShape: "closed" })
          URL.revokeObjectURL(audioUrl)
          audioRef.current = null
          resolve()
        }

        audio.onerror = async () => {
          console.warn("[v0] Audio playback error, falling back to browser TTS")
          URL.revokeObjectURL(audioUrl)
          audioRef.current = null
          await speakWithBrowserTTS(text)
          resolve()
        }

        await audio.play()
      } catch (error) {
        console.warn("[v0] TTS error, falling back to browser TTS:", error)
        await speakWithBrowserTTS(text)
        resolve()
      }
    })
  }, [])

  return { speak, isSpeaking, lipSyncData }
}
