export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window
}

export function unlockSpeech() {
  if (!canSpeak()) return
  const utterance = new SpeechSynthesisUtterance(" ")
  utterance.volume = 0
  utterance.rate = 2
  window.speechSynthesis.resume()
  window.speechSynthesis.speak(utterance)
}

export function silence() {
  if (!canSpeak()) return
  window.speechSynthesis.cancel()
}

export function pauseSpeech() {
  if (!canSpeak()) return
  window.speechSynthesis.pause()
}

export function resumeSpeech() {
  if (!canSpeak()) return
  window.speechSynthesis.resume()
}

export function speakBrowser(text: string, onWord?: (charIndex: number) => void): Promise<void> {
  return new Promise((resolve) => {
    if (!canSpeak()) {
      resolve()
      return
    }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.03
    utterance.pitch = 0.96
    const voice = pickVoice(window.speechSynthesis.getVoices())
    if (voice) utterance.voice = voice
    utterance.onboundary = (event) => {
      if (event.name === "word") onWord?.(event.charIndex)
    }
    utterance.onend = () => resolve()
    utterance.onerror = () => resolve()
    window.speechSynthesis.resume()
    window.speechSynthesis.speak(utterance)
  })
}

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const ranked = [
    /google uk english female/i,
    /google us english/i,
    /samantha/i,
    /daniel/i,
    /microsoft .* english/i,
    /english/i,
  ]
  for (const pattern of ranked) {
    const voice = voices.find((item) => item.lang.toLowerCase().startsWith("en") && pattern.test(item.name))
    if (voice) return voice
  }
  return voices.find((item) => item.lang.toLowerCase().startsWith("en"))
}

export async function speakServer(text: string, audioRef: { current: HTMLAudioElement | null }): Promise<void> {
  const response = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  })
  if (!response.ok) throw new Error("tts")
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  audioRef.current = audio
  await new Promise<void>((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(url)
      resolve()
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("audio"))
    }
    void audio.play().catch(reject)
  })
}
