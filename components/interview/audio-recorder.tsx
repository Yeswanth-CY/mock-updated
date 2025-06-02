"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AlertCircle, Mic, StopCircle, RefreshCw, Play, Pause, Volume2, VolumeX } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void
  onAnalysisUpdate?: (analysis: {
    volume: number
    pace: number
    clarity: number
    confidence: number
  }) => void
}

export function AudioRecorder({ onRecordingComplete, onAnalysisUpdate }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [volume, setVolume] = useState(0.5)
  const [isMuted, setIsMuted] = useState(false)
  const [previousVolume, setPreviousVolume] = useState(0.5)
  const [isAudioContextInitialized, setIsAudioContextInitialized] = useState(false)

  // Voice analysis metrics
  const [voiceAnalysis, setVoiceAnalysis] = useState({
    volume: 0,
    pace: 0,
    clarity: 0,
    confidence: 0,
  })

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null)
  const analyzerRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      // Clean up when component unmounts
      stopMediaTracks()
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current)
      }
      // Clean up audio URL
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
      // Pause audio if playing
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause()
      }
      // Close audio context only if it's not already closed
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        try {
          audioContextRef.current.close()
        } catch (err) {
          console.error("Error closing AudioContext:", err)
        }
      }
    }
  }, [audioUrl])

  const startMicrophone = async () => {
    try {
      setError(null)

      // Request microphone access with specific constraints for better audio quality
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
      })

      streamRef.current = stream

      // Set up audio analysis
      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        try {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
          setIsAudioContextInitialized(true)
        } catch (err) {
          console.error("Error creating AudioContext:", err)
          // Continue without audio analysis if we can't create an AudioContext
        }
      }

      if (audioContextRef.current) {
        const analyzer = audioContextRef.current.createAnalyser()
        analyzer.fftSize = 2048

        const microphone = audioContextRef.current.createMediaStreamSource(stream)
        microphone.connect(analyzer)

        analyzerRef.current = analyzer

        // Start analyzing audio
        analyzeAudio()
      }

      console.log("Microphone access granted successfully")
    } catch (err: any) {
      console.error("Error accessing microphone:", err)
      setError(err.message || "Failed to access microphone. Please check your microphone permissions.")
    }
  }

  const analyzeAudio = () => {
    if (!analyzerRef.current || !audioContextRef.current || audioContextRef.current.state === "closed") return

    const analyzer = analyzerRef.current
    const bufferLength = analyzer.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const updateAnalysis = () => {
      if (
        !isRecording ||
        !analyzerRef.current ||
        !audioContextRef.current ||
        audioContextRef.current.state === "closed"
      )
        return

      try {
        analyzer.getByteFrequencyData(dataArray)

        // Calculate volume (average amplitude)
        let sum = 0
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i]
        }
        const avgVolume = sum / bufferLength
        const normalizedVolume = Math.min(avgVolume / 128, 1)
        setVolume(normalizedVolume)

        // Simulate other metrics based on recording time and volume
        const newAnalysis = {
          volume: normalizedVolume * 100,
          pace: Math.min((recordingTime / 10) * 100, 100),
          clarity: Math.min(normalizedVolume * 110, 100),
          confidence: Math.min(normalizedVolume * 80 + (recordingTime / 30) * 20, 100),
        }

        setVoiceAnalysis(newAnalysis)

        if (onAnalysisUpdate) {
          onAnalysisUpdate(newAnalysis)
        }

        // Only continue the animation frame if we're still recording
        if (isRecording) {
          requestAnimationFrame(updateAnalysis)
        }
      } catch (err) {
        console.error("Error analyzing audio:", err)
      }
    }

    updateAnalysis()
  }

  const stopMediaTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop()
        console.log(`Stopped track: ${track.kind}`)
      })
      streamRef.current = null
    }
  }

  const startRecording = () => {
    if (!streamRef.current) {
      startMicrophone().then(() => {
        setTimeout(() => {
          startRecording()
        }, 1000)
      })
      return
    }

    try {
      // Clear previous chunks
      chunksRef.current = []

      // Try different MIME types for better compatibility
      let mimeType = "audio/webm"
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus"
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4"
      }

      console.log(`Using MIME type: ${mimeType} for recording`)

      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType,
        audioBitsPerSecond: 128000, // Higher bitrate for better quality
      })

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          console.log(`Received audio chunk: ${e.data.size} bytes`)
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        console.log(`Recording stopped. Total chunks: ${chunksRef.current.length}`)

        if (chunksRef.current.length === 0) {
          setError("No audio data was recorded. Please try again.")
          return
        }

        try {
          const blob = new Blob(chunksRef.current, { type: mimeType })
          console.log("Audio blob created:", blob.size, "bytes", blob.type)

          if (blob.size === 0) {
            setError("Recorded audio is empty. Please try again.")
            return
          }

          setRecordedBlob(blob)

          // Call the callback with the blob
          onRecordingComplete(blob)

          // Clean up previous URL if it exists
          if (audioUrl) {
            URL.revokeObjectURL(audioUrl)
          }

          // Create a URL for the recorded audio
          const newAudioUrl = URL.createObjectURL(blob)
          setAudioUrl(newAudioUrl)

          if (audioRef.current) {
            audioRef.current.src = newAudioUrl
            audioRef.current.onloadedmetadata = () => {
              setDuration(audioRef.current?.duration || 0)
            }
          }
        } catch (err) {
          console.error("Error creating audio blob:", err)
          setError("Failed to process recorded audio. Please try again.")
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
      console.error("Error starting recording:", err)
      setError(err.message || "Failed to start recording. Please try again.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        console.log("Stopping MediaRecorder", mediaRecorderRef.current.state)
        mediaRecorderRef.current.stop()
        setIsRecording(false)

        if (timerRef.current) {
          clearInterval(timerRef.current)
        }

        stopMediaTracks()
      } catch (err) {
        console.error("Error stopping recording:", err)
        setError("Failed to stop recording. Please refresh the page and try again.")
      }
    }
  }

  const resetRecording = () => {
    // Pause audio if playing
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause()
    }

    // Clean up previous URL if it exists
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }

    setRecordedBlob(null)
    setRecordingTime(0)
    setCurrentTime(0)
    setDuration(0)
    setIsPlaying(false)
    setVoiceAnalysis({
      volume: 0,
      pace: 0,
      clarity: 0,
      confidence: 0,
    })
    startMicrophone()
  }

  const togglePlayback = async () => {
    if (!audioRef.current) return

    try {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
        if (playbackTimerRef.current) {
          clearInterval(playbackTimerRef.current)
        }
      } else {
        // Use try-catch with await to handle play() promise rejection
        try {
          await audioRef.current.play()
          setIsPlaying(true)

          // Use a timer to update current time instead of relying on timeupdate event
          if (playbackTimerRef.current) {
            clearInterval(playbackTimerRef.current)
          }

          playbackTimerRef.current = setInterval(() => {
            if (audioRef.current) {
              setCurrentTime(audioRef.current.currentTime)
            }
          }, 100)
        } catch (err) {
          console.error("Error playing audio:", err)
          setIsPlaying(false)
        }
      }
    } catch (err) {
      console.error("Error toggling playback:", err)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleSliderChange = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0]
      setCurrentTime(value[0])
    }
  }

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
    if (newVolume > 0) {
      setIsMuted(false)
    }
  }

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = previousVolume
        setVolume(previousVolume)
        setIsMuted(false)
      } else {
        setPreviousVolume(volume)
        audioRef.current.volume = 0
        setVolume(0)
        setIsMuted(true)
      }
    }
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current)
    }
  }

  useEffect(() => {
    startMicrophone()

    // Clean up function
    return () => {
      stopMediaTracks()
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current)
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
      // Close audio context only if it's not already closed
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        try {
          audioContextRef.current.close()
        } catch (err) {
          console.error("Error closing AudioContext:", err)
        }
      }
    }
  }, [])

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

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="p-6 flex flex-col items-center justify-center">
        {isRecording ? (
          <div className="flex flex-col items-center w-full">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <Mic className="h-8 w-8 text-red-500 animate-pulse" />
            </div>
            <p className="text-lg font-medium">Recording...</p>
            <p className="text-sm text-muted-foreground">{formatTime(recordingTime)}</p>

            <div className="w-full mt-6 space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Volume</span>
                  <span>{Math.round(voiceAnalysis.volume)}%</span>
                </div>
                <Progress value={voiceAnalysis.volume} className={getAnalysisColor(voiceAnalysis.volume)} />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Pace</span>
                  <span>{Math.round(voiceAnalysis.pace)}%</span>
                </div>
                <Progress value={voiceAnalysis.pace} className={getAnalysisColor(voiceAnalysis.pace)} />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Clarity</span>
                  <span>{Math.round(voiceAnalysis.clarity)}%</span>
                </div>
                <Progress value={voiceAnalysis.clarity} className={getAnalysisColor(voiceAnalysis.clarity)} />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Confidence</span>
                  <span>{Math.round(voiceAnalysis.confidence)}%</span>
                </div>
                <Progress value={voiceAnalysis.confidence} className={getAnalysisColor(voiceAnalysis.confidence)} />
              </div>
            </div>
          </div>
        ) : recordedBlob ? (
          <div className="w-full">
            <audio
              ref={audioRef}
              className="hidden"
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleAudioEnded}
              controls
            />
            <div className="flex items-center justify-center mb-4">
              <Button variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={togglePlayback}>
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </Button>
            </div>
            <div className="space-y-4 w-full">
              <div className="space-y-2 w-full">
                <Slider value={[currentTime]} max={duration} step={0.1} onValueChange={handleSliderChange} />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="icon" onClick={toggleMute}>
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <Slider value={[volume]} max={1} step={0.01} onValueChange={handleVolumeChange} className="w-24" />
              </div>

              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium">Voice Analysis</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={voiceAnalysis.volume >= 80 ? "default" : "outline"} className="text-xs">
                    Volume: {Math.round(voiceAnalysis.volume)}%
                  </Badge>
                  <Badge variant={voiceAnalysis.pace >= 80 ? "default" : "outline"} className="text-xs">
                    Pace: {Math.round(voiceAnalysis.pace)}%
                  </Badge>
                  <Badge variant={voiceAnalysis.clarity >= 80 ? "default" : "outline"} className="text-xs">
                    Clarity: {Math.round(voiceAnalysis.clarity)}%
                  </Badge>
                  <Badge variant={voiceAnalysis.confidence >= 80 ? "default" : "outline"} className="text-xs">
                    Confidence: {Math.round(voiceAnalysis.confidence)}%
                  </Badge>
                </div>
              </div>
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
      </Card>

      <div className="flex justify-center space-x-2">
        {!isRecording && !recordedBlob && (
          <Button onClick={startRecording}>
            <Mic className="mr-2 h-4 w-4" />
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
