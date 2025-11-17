export async function POST(req: Request) {
  try {
    const { text } = await req.json()

    if (!text) {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
      })
    }

    // Check if ElevenLabs API key is available
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY

    if (elevenLabsKey) {
      // Use ElevenLabs for high-quality voice
      const voiceId = "21m00Tcm4TlvDq8ikWAM" // Rachel voice (neutral, clear)

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": elevenLabsKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true,
          },
        }),
      })

      if (!response.ok) {
        console.error("[TTS] ElevenLabs API error:", await response.text())
        // Fallback to browser TTS
        return new Response(JSON.stringify({ useBrowserTTS: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      }

      const audioBuffer = await response.arrayBuffer()

      return new Response(audioBuffer, {
        headers: {
          "Content-Type": "audio/mpeg",
        },
      })
    } else {
      // No API key available, use browser TTS
      return new Response(JSON.stringify({ useBrowserTTS: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }
  } catch (error) {
    console.error("[TTS] Error:", error)
    return new Response(JSON.stringify({ useBrowserTTS: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }
}
