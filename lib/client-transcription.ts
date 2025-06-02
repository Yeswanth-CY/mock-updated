// This file contains the client-side transcription functionality using Whisper Web

// Types for the Whisper Web API
interface WhisperTranscription {
  text: string
  segments: Array<{
    id: number
    seek: number
    start: number
    end: number
    text: string
    tokens: number[]
    temperature: number
    avg_logprob: number
    compression_ratio: number
    no_speech_prob: number
  }>
  language: string
}

// Track the loading state
let isWhisperLoaded = false
let loadPromise: Promise<void> | null = null
let transformersLib: any = null

// Initialize the Whisper Web worker
export function initWhisper(): Promise<void> {
  if (isWhisperLoaded && transformersLib) {
    return Promise.resolve()
  }

  if (loadPromise) {
    return loadPromise
  }

  loadPromise = new Promise((resolve, reject) => {
    try {
      // Check if we're in a browser environment
      if (typeof window === "undefined") {
        console.warn("Whisper Web can only be used in a browser environment")
        reject(new Error("Whisper Web can only be used in a browser environment"))
        return
      }

      // Check if the library is already loaded
      if (typeof (window as any).Transformers !== "undefined") {
        console.log("Whisper Web library already loaded")
        transformersLib = (window as any).Transformers
        isWhisperLoaded = true
        resolve()
        return
      }

      // Create a script element to load the Whisper Web library
      const script = document.createElement("script")
      script.src = "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0"
      script.async = true

      script.onload = () => {
        console.log("Whisper Web library loaded")
        transformersLib = (window as any).Transformers
        isWhisperLoaded = true
        resolve()
      }

      script.onerror = (e) => {
        console.error("Failed to load Whisper Web library:", e)
        reject(new Error("Failed to load Whisper Web library"))
      }

      document.head.appendChild(script)
    } catch (error) {
      console.error("Error initializing Whisper:", error)
      reject(error)
    }
  })

  return loadPromise
}

// Transcribe audio using Whisper Web
export async function transcribeAudioClient(
  audioBlob: Blob,
  progressCallback?: (progress: number) => void,
): Promise<string> {
  try {
    // Make sure Whisper is initialized
    await initWhisper()

    if (!transformersLib) {
      throw new Error("Transformers library not loaded")
    }

    // Set up the pipeline with error handling
    try {
      // Create a status element for progress updates
      const statusElement = document.createElement("div")
      statusElement.style.display = "none"
      document.body.appendChild(statusElement)

      // Set up the pipeline
      const pipeline = await transformersLib.pipeline("automatic-speech-recognition", "Xenova/whisper-tiny.en", {
        progress_callback: (progress: any) => {
          // Update progress
          if (progressCallback && typeof progress.progress === "number") {
            progressCallback(progress.progress * 100)
          }

          // Log progress to console
          if (progress.status) {
            console.log(`Whisper: ${progress.status} (${Math.round(progress.progress * 100)}%)`)
          }
        },
      })

      // Convert the blob to an array buffer
      const arrayBuffer = await audioBlob.arrayBuffer()

      // Run the transcription
      const result = await pipeline(arrayBuffer, {
        chunk_length_s: 30,
        stride_length_s: 5,
        language: "english",
        task: "transcribe",
      })

      // Clean up
      document.body.removeChild(statusElement)

      return result.text || "No transcription available."
    } catch (pipelineError) {
      console.error("Error in Whisper pipeline:", pipelineError)
      throw pipelineError
    }
  } catch (error) {
    console.error("Error transcribing audio with Whisper:", error)
    // Return a fallback message instead of throwing
    return "Transcription failed. Please try again or type your response manually."
  }
}

// Simpler fallback transcription for browsers that don't support the full Whisper Web
export function transcribeAudioFallback(audioBlob: Blob): Promise<string> {
  return new Promise((resolve) => {
    try {
      // Check if the Web Speech API is available
      if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
        console.warn("Web Speech API not supported in this browser")
        setTimeout(() => {
          resolve("Your browser does not support speech recognition. Please type your response manually.")
        }, 1000)
        return
      }

      // Use the Web Speech API as a fallback
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const recognition = new SpeechRecognition()

      recognition.lang = "en-US"
      recognition.continuous = true
      recognition.interimResults = false

      let transcript = ""

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + " "
          }
        }
      }

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error)
        resolve("Transcription failed. Please try again or type your response manually.")
      }

      recognition.onend = () => {
        resolve(transcript || "Transcription failed. Please try again or type your response manually.")
      }

      // Create an audio element to play the recording
      const audio = new Audio(URL.createObjectURL(audioBlob))
      audio.onended = () => {
        recognition.stop()
      }

      // Start recognition and play the audio
      recognition.start()
      audio.play().catch((error) => {
        console.error("Error playing audio for transcription:", error)
        recognition.stop()
        resolve("Transcription failed. Please try again or type your response manually.")
      })
    } catch (error) {
      console.error("Error in transcribeAudioFallback:", error)
      resolve("Transcription failed. Please try again or type your response manually.")
    }
  })
}

// Simple function to check if Whisper is supported in this browser
export function isWhisperSupported(): boolean {
  // Check if we're in a browser environment
  if (typeof window === "undefined") {
    return false
  }

  // Check if the browser supports the required features
  const hasRequiredFeatures =
    // Check for WebAssembly support (required for Whisper Web)
    typeof WebAssembly === "object" &&
    typeof WebAssembly.instantiate === "function" &&
    // Check for other required APIs
    typeof ArrayBuffer === "function" &&
    typeof Uint8Array === "function" &&
    typeof Blob === "function" &&
    typeof URL === "object" &&
    typeof URL.createObjectURL === "function"

  return hasRequiredFeatures
}
