"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AlertCircle, Mic, Video, StopCircle, RefreshCw, Play, Pause, Volume2, VolumeX, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  transcribeAudioClient,
  transcribeAudioFallback,
  initWhisper,
  isWhisperSupported,
} from "@/lib/client-transcription"

interface MediaRecorderProps {
  onRecordingComplete: (blob: Blob, type: "audio" | "video", transcription?: string) => void
  onAnalysisUpdate?: (analysis: {
    volume: number
    pace: number
    clarity: number
    confidence: number
    facialExpressions?: number
    eyeContact?: number
  }) => void
  defaultType?: "audio" | "video"
}

export function MediaRecorder({ onRecordingComplete, onAnalysisUpdate, defaultType = "audio" }: MediaRecorderProps) {
  const [mediaType, setMediaType] = useState<"audio" | "video">(defaultType)
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [volume, setVolume] = useState(0.5)
  const [isMuted, setIsMuted] = useState(false)
  const [previousVolume, setPreviousVolume] = useState(0.5)
  const [isLoading, setIsLoading] = useState(false)
  const [transcribedText, setTranscribedText] = useState<string | null>(null)
  const [isMediaRecorderSupported, setIsMediaRecorderSupported] = useState(true)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionProgress, setTranscriptionProgress] = useState(0)
  const [isWhisperSupportedState, setIsWhisperSupportedState] = useState(true)
  const [isMediaLoaded, setIsMediaLoaded] = useState(false)
  const [isPlaybackInProgress, setIsPlaybackInProgress] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Analysis metrics
  const [analysisMetrics, setAnalysisMetrics] = useState({
    volume: 0,
    pace: 0,
    clarity: 0,
    confidence: 0,
    facialExpressions: 0,
    eyeContact: 0,
  })

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  // Helper functions defined first to avoid reference errors
  const clearTimers = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current)
      playbackTimerRef.current = null
    }
  }

  const revokeMediaUrl = () => {
    if (mediaUrl) {
      URL.revokeObjectURL(mediaUrl)
      setMediaUrl(null)
    }
  }

  const stopMediaTracks = () => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          track.stop()
        })
        streamRef.current = null
      } catch (err) {
        console.error("Error stopping media tracks:", err)
      }
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        console.log("Stopping MediaRecorder", mediaRecorderRef.current.state)
        mediaRecorderRef.current.stop()
        setIsRecording(false)
        clearTimers()
      } catch (err) {
        console.error("Error stopping recording:", err)
        setError("Failed to stop recording. Please refresh the page and try again.")
      }
    }
  }

  // Now define resetRecording after stopRecording is defined
  const resetRecording = () => {
    // Stop any ongoing recording
    if (isRecording && mediaRecorderRef.current) {
      stopRecording()
    }

    // Stop any ongoing playback
    if (mediaRef.current && !mediaRef.current.paused) {
      try {
        mediaRef.current.pause()
      } catch (err) {
        console.error("Error pausing media during reset:", err)
      }
    }

    // Clean up resources
    stopMediaTracks()
    clearTimers()
    revokeMediaUrl()

    // Reset state
    setRecordedBlob(null)
    setRecordingTime(0)
    setCurrentTime(0)
    setDuration(0)
    setIsPlaying(false)
    setTranscribedText(null)
    setTranscriptionProgress(0)
    setIsMediaLoaded(false)
    setIsPlaybackInProgress(false)
    setUploadProgress(0)
    setUploadError(null)
    setAnalysisMetrics({
      volume: 0,
      pace: 0,
      clarity: 0,
      confidence: 0,
      facialExpressions: 0,
      eyeContact: 0,
    })

    // Start fresh media stream
    startMediaStream()
  }

  // Check if MediaRecorder is supported and preload Whisper
  useEffect(() => {
    // Check if MediaRecorder is available in the window object
    if (typeof window !== "undefined") {
      try {
        setIsMediaRecorderSupported(typeof window.MediaRecorder !== "undefined")

        // Check if Whisper is supported
        setIsWhisperSupportedState(isWhisperSupported())

        // Try to initialize Whisper in the background
        if (isWhisperSupported()) {
          initWhisper().catch((err) => {
            console.warn("Whisper initialization failed:", err)
            setIsWhisperSupportedState(false)
          })
        }
      } catch (err) {
        console.error("Error checking browser capabilities:", err)
        // Set safe defaults
        setIsMediaRecorderSupported(false)
        setIsWhisperSupportedState(false)
      }
    }
  }, [])

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      stopMediaTracks()
      clearTimers()
      revokeMediaUrl()
    }
  }, [])

  // Reset when media type changes
  useEffect(() => {
    resetRecording()
  }, [mediaType])

  // Set up media element event listeners when mediaUrl changes
  useEffect(() => {
    if (mediaUrl && mediaRef.current) {
      // Reset media loaded state
      setIsMediaLoaded(false)

      // Set up event listeners
      const mediaElement = mediaRef.current

      const handleLoadedMetadata = () => {
        console.log("Media metadata loaded")
        setDuration(mediaElement.duration || 0)
        setIsMediaLoaded(true)
      }

      const handleLoadedData = () => {
        console.log("Media data loaded")
        setIsMediaLoaded(true)
      }

      const handleError = (e: Event) => {
        console.error("Media error:", e)
        setError("Error loading media. Please try again.")
        setIsMediaLoaded(false)
      }

      const handleEnded = () => {
        console.log("Media playback ended")
        setIsPlaying(false)
        setIsPlaybackInProgress(false)
        if (playbackTimerRef.current) {
          clearInterval(playbackTimerRef.current)
          playbackTimerRef.current = null
        }
      }

      // Add event listeners
      mediaElement.addEventListener("loadedmetadata", handleLoadedMetadata)
      mediaElement.addEventListener("loadeddata", handleLoadedData)
      mediaElement.addEventListener("error", handleError)
      mediaElement.addEventListener("ended", handleEnded)

      // Set initial volume
      mediaElement.volume = volume

      // Preload the media
      mediaElement.load()

      // Clean up event listeners
      return () => {
        mediaElement.removeEventListener("loadedmetadata", handleLoadedMetadata)
        mediaElement.removeEventListener("loadeddata", handleLoadedData)
        mediaElement.removeEventListener("error", handleError)
        mediaElement.removeEventListener("ended", handleEnded)
      }
    }
  }, [mediaUrl, volume])

  const startMediaStream = async () => {
    try {
      setError(null)
      setIsLoading(true)

      // Request media access with specific constraints
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: mediaType === "video" ? { width: 640, height: 480 } : false,
      }

      console.log(`Requesting media access with constraints:`, constraints)
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      // If video, set the stream to the video element
      if (mediaType === "video" && videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.muted = true // Mute to prevent feedback
      }

      // Start simulating analysis
      startAnalysisSimulation()
      setIsLoading(false)
    } catch (err: any) {
      console.error(`Error accessing ${mediaType}:`, err)
      setError(
        `Failed to access ${mediaType}. ${
          err.name === "NotAllowedError"
            ? "Please grant permission to use your microphone/camera."
            : err.message || "Please check your device settings."
        }`,
      )
      setIsLoading(false)
    }
  }

  const startAnalysisSimulation = () => {
    // Simulate analysis metrics based on recording time
    const updateAnalysis = () => {
      if (!isRecording) return

      const randomFactor = Math.random() * 0.1 // Small random fluctuation
      const timeBasedFactor = Math.min(recordingTime / 30, 1) // Increases with time, max at 30 seconds

      const newMetrics = {
        volume: Math.min(60 + recordingTime * 1.5 + randomFactor * 20, 100),
        pace: Math.min(50 + timeBasedFactor * 40 + randomFactor * 10, 100),
        clarity: Math.min(70 + timeBasedFactor * 20 + randomFactor * 10, 100),
        confidence: Math.min(40 + timeBasedFactor * 50 + randomFactor * 10, 100),
        facialExpressions: mediaType === "video" ? Math.min(60 + timeBasedFactor * 30 + randomFactor * 10, 100) : 0,
        eyeContact: mediaType === "video" ? Math.min(70 + timeBasedFactor * 20 + randomFactor * 10, 100) : 0,
      }

      setAnalysisMetrics(newMetrics)

      if (onAnalysisUpdate) {
        onAnalysisUpdate(newMetrics)
      }

      if (isRecording) {
        setTimeout(updateAnalysis, 1000)
      }
    }

    updateAnalysis()
  }

  // Helper function to check if a MIME type is supported
  const isMimeTypeSupported = (mimeType: string): boolean => {
    // Check if MediaRecorder exists and has isTypeSupported method
    if (
      typeof window === "undefined" ||
      !window.MediaRecorder ||
      typeof window.MediaRecorder.isTypeSupported !== "function"
    ) {
      return false
    }

    try {
      return window.MediaRecorder.isTypeSupported(mimeType)
    } catch (e) {
      console.error(`Error checking MIME type support for ${mimeType}:`, e)
      return false
    }
  }

  // Get the best supported MIME type
  const getBestMimeType = (isAudio: boolean): string => {
    if (isAudio) {
      // Audio MIME types in order of preference
      const audioTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
        "audio/ogg",
        "audio/wav",
      ]

      for (const type of audioTypes) {
        if (isMimeTypeSupported(type)) {
          return type
        }
      }
      return "audio/webm" // Default fallback
    } else {
      // Video MIME types in order of preference
      const videoTypes = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4",
        "video/webm;codecs=h264",
      ]

      for (const type of videoTypes) {
        if (isMimeTypeSupported(type)) {
          return type
        }
      }
      return "video/webm" // Default fallback
    }
  }

  const startRecording = () => {
    if (!isMediaRecorderSupported) {
      setError("Your browser doesn't support MediaRecorder. Please try using Chrome, Firefox, or Edge.")
      return
    }

    if (!streamRef.current) {
      startMediaStream().then(() => {
        // Only start recording if we successfully got the stream
        if (streamRef.current) {
          setTimeout(startRecording, 500)
        }
      })
      return
    }

    try {
      // Clear previous chunks
      chunksRef.current = []

      // Get the best supported MIME type
      const mimeType = getBestMimeType(mediaType === "audio")
      console.log(`Using MIME type: ${mimeType} for recording`)

      // Create MediaRecorder with options
      let mediaRecorderOptions: any = {}

      try {
        mediaRecorderOptions = {
          mimeType,
          audioBitsPerSecond: 128000, // 128 kbps for audio
        }

        if (mediaType === "video") {
          mediaRecorderOptions.videoBitsPerSecond = 2500000 // 2.5 Mbps for video
        }
      } catch (e) {
        console.warn("Error setting MediaRecorder options:", e)
        // Continue with default options
      }

      // Create MediaRecorder instance
      const mediaRecorder = new window.MediaRecorder(streamRef.current, mediaRecorderOptions)

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          console.log(`Received ${mediaType} chunk: ${e.data.size} bytes`)
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        console.log(`Recording stopped. Total chunks: ${chunksRef.current.length}`)

        if (chunksRef.current.length === 0) {
          setError(`No ${mediaType} data was recorded. Please try again.`)
          return
        }

        try {
          const blob = new Blob(chunksRef.current, { type: mimeType })
          console.log(`${mediaType} blob created:`, blob.size, "bytes", blob.type)

          if (blob.size === 0) {
            setError(`Recorded ${mediaType} is empty. Please try again.`)
            return
          }

          setRecordedBlob(blob)

          // Create a URL for the recorded media
          revokeMediaUrl()
          const newMediaUrl = URL.createObjectURL(blob)
          setMediaUrl(newMediaUrl)

          // Set up media element for playback
          if (mediaRef.current) {
            mediaRef.current.src = newMediaUrl
            mediaRef.current.onloadedmetadata = () => {
              setDuration(mediaRef.current?.duration || 0)
            }
          }

          // Transcribe audio if it's an audio recording
          if (mediaType === "audio") {
            try {
              const transcription = await performTranscription(blob)
              // Call the callback with the blob and transcription
              onRecordingComplete(blob, mediaType, transcription)
            } catch (transcriptionError) {
              console.error("Error during transcription:", transcriptionError)
              // Still call the callback, but without transcription
              onRecordingComplete(blob, mediaType)
            }
          } else {
            // For video, just call the callback with the blob
            onRecordingComplete(blob, mediaType)
          }
        } catch (err) {
          console.error(`Error creating ${mediaType} blob:`, err)
          setError(`Failed to process recorded ${mediaType}. Please try again.`)
        }
      }

      // Start recording with smaller time slices for more frequent ondataavailable events
      mediaRecorder.start(100)
      console.log("MediaRecorder started", mediaRecorder.state)
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (err: any) {
      console.error(`Error starting ${mediaType} recording:`, err)
      setError(err.message || `Failed to start ${mediaType} recording. Please try again.`)
    }
  }

  const performTranscription = async (blob: Blob): Promise<string> => {
    try {
      setIsTranscribing(true)
      setTranscribedText("Transcribing your audio...")
      setTranscriptionProgress(0)

      let transcription: string

      // Try to use Whisper Web for transcription if supported
      if (isWhisperSupportedState) {
        try {
          transcription = await transcribeAudioClient(blob, (progress) => {
            setTranscriptionProgress(progress)
          })
        } catch (whisperError) {
          console.error("Error with Whisper transcription, falling back:", whisperError)
          // Fall back to Web Speech API
          transcription = await transcribeAudioFallback(blob)
        }
      } else {
        // Fall back to Web Speech API if Whisper is not supported
        transcription = await transcribeAudioFallback(blob)
      }

      setTranscribedText(transcription)
      return transcription
    } catch (error) {
      console.error("Error during transcription:", error)
      const fallbackText = "Transcription failed. Please try again or type your response manually."
      setTranscribedText(fallbackText)
      return fallbackText
    } finally {
      setIsTranscribing(false)
      setTranscriptionProgress(100)
    }
  }

  const togglePlayback = async () => {
    // If playback operation is already in progress, don't allow another one
    if (isPlaybackInProgress) {
      console.log("Playback operation already in progress, ignoring request")
      return
    }

    if (!mediaRef.current || !mediaUrl) {
      console.log("No media element or URL available")
      return
    }

    try {
      setIsPlaybackInProgress(true)

      if (isPlaying) {
        // Pause playback
        console.log("Pausing media playback")
        mediaRef.current.pause()

        // Small delay to ensure browser completes the pause operation
        await new Promise((resolve) => setTimeout(resolve, 50))

        setIsPlaying(false)
        if (playbackTimerRef.current) {
          clearInterval(playbackTimerRef.current)
          playbackTimerRef.current = null
        }
      } else {
        // Start playback
        console.log("Starting media playback")

        // Make sure media is loaded
        if (!isMediaLoaded) {
          console.log("Media not fully loaded, waiting...")
          // Wait a bit for media to load if needed
          await new Promise((resolve) => setTimeout(resolve, 300))

          if (!mediaRef.current) {
            throw new Error("Media element no longer available")
          }
        }

        try {
          // Play with error handling
          const playPromise = mediaRef.current.play()

          if (playPromise !== undefined) {
            await playPromise
            console.log("Playback started successfully")

            setIsPlaying(true)

            // Set up timer to update current time
            if (playbackTimerRef.current) {
              clearInterval(playbackTimerRef.current)
            }

            playbackTimerRef.current = setInterval(() => {
              if (mediaRef.current) {
                setCurrentTime(mediaRef.current.currentTime)
              }
            }, 100)
          }
        } catch (playError) {
          console.error("Error playing media:", playError)
          setError(`Error playing ${mediaType}: ${playError instanceof Error ? playError.message : "Unknown error"}`)
        }
      }
    } catch (err) {
      console.error(`Error toggling ${mediaType} playback:`, err)
      setError(`Error controlling playback: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      // Always reset the playback in progress flag
      setIsPlaybackInProgress(false)
    }
  }

  const handleSliderChange = (value: number[]) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = value[0]
      setCurrentTime(value[0])
    }
  }

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    if (mediaRef.current) {
      mediaRef.current.volume = newVolume
    }
    if (newVolume > 0) {
      setIsMuted(false)
    }
  }

  const toggleMute = () => {
    if (mediaRef.current) {
      if (isMuted) {
        mediaRef.current.volume = previousVolume
        setVolume(previousVolume)
        setIsMuted(false)
      } else {
        setPreviousVolume(volume)
        mediaRef.current.volume = 0
        setVolume(0)
        setIsMuted(true)
      }
    }
  }

  const handleMediaEnded = () => {
    setIsPlaying(false)
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getAnalysisColor = (value: number) => {
    if (value >= 80) return "bg-green-500"
    if (value >= 60) return "bg-yellow-500"
    return "bg-red-500"
  }

  // Initialize media stream on component mount
  useEffect(() => {
    // Wrap in try-catch to prevent uncaught errors
    try {
      startMediaStream()
    } catch (err) {
      console.error("Error initializing media stream:", err)
      setError("Failed to initialize media. Please refresh and try again.")
    }
  }, [])

  // If MediaRecorder is not supported, show a fallback UI
  if (!isMediaRecorderSupported) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your browser doesn't support media recording. Please try using Chrome, Firefox, or Edge.
          </AlertDescription>
        </Alert>
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center">
            <p className="text-center mb-4">As an alternative, you can type your response in the text area below:</p>
            <textarea className="w-full h-32 p-2 border rounded-md" placeholder="Type your response here..."></textarea>
            <Button className="mt-4">Submit Text Response</Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Tabs value={mediaType} onValueChange={(value) => setMediaType(value as "audio" | "video")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="audio" disabled={isRecording}>
            <Mic className="h-4 w-4 mr-2" />
            Audio
          </TabsTrigger>
          <TabsTrigger value="video" disabled={isRecording}>
            <Video className="h-4 w-4 mr-2" />
            Video
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden">
        {mediaType === "video" ? (
          isRecording || !recordedBlob ? (
            <div className="aspect-video bg-black relative">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                  Loading camera...
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-video bg-black">
              <video
                ref={(el) => (mediaRef.current = el)}
                playsInline
                className="w-full h-full object-cover"
                onEnded={handleMediaEnded}
              />
            </div>
          )
        ) : (
          <div className="p-6 flex flex-col items-center justify-center">
            {isRecording ? (
              <div className="flex flex-col items-center w-full">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                  <Mic className="h-8 w-8 text-red-500 animate-pulse" />
                </div>
                <p className="text-lg font-medium">Recording...</p>
                <p className="text-sm text-muted-foreground">{formatTime(recordingTime)}</p>
              </div>
            ) : recordedBlob ? (
              <div className="w-full">
                <audio ref={(el) => (mediaRef.current = el)} className="hidden" onEnded={handleMediaEnded} />
                <div className="flex items-center justify-center mb-4">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-full"
                    onClick={togglePlayback}
                    disabled={isPlaybackInProgress || !isMediaLoaded}
                  >
                    {isPlaybackInProgress ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="h-6 w-6" />
                    ) : (
                      <Play className="h-6 w-6" />
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Mic className="h-8 w-8 text-primary" />
                </div>
                <p className="text-lg font-medium">Ready to record</p>
                <p className="text-sm text-muted-foreground">Click the button below to start</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {recordedBlob && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Slider value={[currentTime]} max={duration} step={0.1} onValueChange={handleSliderChange} />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={togglePlayback}
              disabled={isPlaybackInProgress || !isMediaLoaded}
            >
              {isPlaybackInProgress ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>

            <Button variant="ghost" size="icon" onClick={toggleMute}>
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>

            <Slider value={[volume]} max={1} step={0.01} onValueChange={handleVolumeChange} className="w-24" />
          </div>

          <div className="mt-4 space-y-3">
            <h4 className="text-sm font-medium">{mediaType === "video" ? "Video" : "Audio"} Analysis</h4>

            <div className="space-y-2">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Volume</span>
                  <span>{Math.round(analysisMetrics.volume)}%</span>
                </div>
                <Progress value={analysisMetrics.volume} className={getAnalysisColor(analysisMetrics.volume)} />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Pace</span>
                  <span>{Math.round(analysisMetrics.pace)}%</span>
                </div>
                <Progress value={analysisMetrics.pace} className={getAnalysisColor(analysisMetrics.pace)} />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Clarity</span>
                  <span>{Math.round(analysisMetrics.clarity)}%</span>
                </div>
                <Progress value={analysisMetrics.clarity} className={getAnalysisColor(analysisMetrics.clarity)} />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Confidence</span>
                  <span>{Math.round(analysisMetrics.confidence)}%</span>
                </div>
                <Progress value={analysisMetrics.confidence} className={getAnalysisColor(analysisMetrics.confidence)} />
              </div>

              {mediaType === "video" && (
                <>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Facial Expressions</span>
                      <span>{Math.round(analysisMetrics.facialExpressions)}%</span>
                    </div>
                    <Progress
                      value={analysisMetrics.facialExpressions}
                      className={getAnalysisColor(analysisMetrics.facialExpressions)}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Eye Contact</span>
                      <span>{Math.round(analysisMetrics.eyeContact)}%</span>
                    </div>
                    <Progress
                      value={analysisMetrics.eyeContact}
                      className={getAnalysisColor(analysisMetrics.eyeContact)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {isTranscribing ? (
        <div className="mt-4">
          <div className="flex items-center space-x-2 mb-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-sm">Transcribing your audio...</p>
          </div>
          <Progress value={transcriptionProgress} className="h-2" />
        </div>
      ) : transcribedText ? (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Transcribed Text:</h4>
          <div className="bg-muted p-3 rounded text-sm">{transcribedText}</div>
        </div>
      ) : null}

      <div className="flex justify-center space-x-2">
        {!isRecording && !recordedBlob && (
          <Button onClick={startRecording} disabled={isLoading}>
            {mediaType === "audio" ? <Mic className="mr-2 h-4 w-4" /> : <Video className="mr-2 h-4 w-4" />}
            Start Recording
          </Button>
        )}

        {isRecording && (
          <Button variant="destructive" onClick={stopRecording}>
            <StopCircle className="mr-2 h-4 w-4" />
            Stop Recording
          </Button>
        )}

        {recordedBlob && (
          <Button variant="outline" onClick={resetRecording}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Record Again
          </Button>
        )}
      </div>
    </div>
  )
}
