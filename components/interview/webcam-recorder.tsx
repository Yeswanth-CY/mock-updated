"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AlertCircle, Video, StopCircle, RefreshCw, Play, Pause, Volume2, VolumeX } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"

interface WebcamRecorderProps {
  onRecordingComplete: (blob: Blob) => void
  onAnalysisUpdate?: (analysis: {
    volume: number
    pace: number
    clarity: number
    confidence: number
    facialExpressions: number
    eyeContact: number
  }) => void
}

export function WebcamRecorder({ onRecordingComplete, onAnalysisUpdate }: WebcamRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.5)
  const [isMuted, setIsMuted] = useState(false)
  const [previousVolume, setPreviousVolume] = useState(0.5)

  // Video analysis metrics
  const [videoAnalysis, setVideoAnalysis] = useState({
    volume: 0,
    pace: 0,
    clarity: 0,
    confidence: 0,
    facialExpressions: 0,
    eyeContact: 0,
  })

  const videoRef = useRef<HTMLVideoElement>(null)
  const playbackVideoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null)
  const analyzerRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

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
      // Clean up video URL
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl)
      }
      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [videoUrl])

  const startCamera = async () => {
    try {
      setError(null)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      streamRef.current = stream

      // Set up audio analysis
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }

      const audioContext = audioContextRef.current
      const analyzer = audioContext.createAnalyser()
      analyzer.fftSize = 2048

      const microphone = audioContext.createMediaStreamSource(stream)
      microphone.connect(analyzer)

      analyzerRef.current = analyzer
    } catch (err: any) {
      console.error("Error accessing camera:", err)
      setError(err.message || "Failed to access camera and microphone")
    }
  }

  const analyzeVideo = () => {
    if (!isRecording) return

    // Simulate video analysis metrics
    // In a real implementation, you would use computer vision and audio analysis
    const newAnalysis = {
      volume: Math.min(30 + Math.random() * 50, 100), // Simulated volume
      pace: Math.min((recordingTime / 15) * 100, 100), // Simulated pace based on recording time
      clarity: Math.min(40 + Math.random() * 40, 100), // Simulated clarity
      confidence: Math.min(50 + (recordingTime / 30) * 30, 100), // Simulated confidence
      facialExpressions: Math.min(40 + Math.random() * 40, 100), // Simulated facial expressions
      eyeContact: Math.min(60 + Math.random() * 30, 100), // Simulated eye contact
    }

    setVideoAnalysis(newAnalysis)

    if (onAnalysisUpdate) {
      onAnalysisUpdate(newAnalysis)
    }

    if (isRecording) {
      setTimeout(analyzeVideo, 1000)
    }
  }

  const stopMediaTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const startRecording = () => {
    if (!streamRef.current) {
      startCamera().then(() => {
        setTimeout(() => {
          startRecording()
        }, 1000)
      })
      return
    }

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: "video/webm",
      })

      const chunks: BlobPart[] = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" })
        setRecordedBlob(blob)
        onRecordingComplete(blob)

        // Clean up previous URL if it exists
        if (videoUrl) {
          URL.revokeObjectURL(videoUrl)
        }

        // Create a URL for the recorded video
        const newVideoUrl = URL.createObjectURL(blob)
        setVideoUrl(newVideoUrl)

        if (playbackVideoRef.current) {
          playbackVideoRef.current.src = newVideoUrl
          playbackVideoRef.current.onloadedmetadata = () => {
            setDuration(playbackVideoRef.current?.duration || 0)
          }
        }
      }

      // Start recording
      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)

      // Start video analysis
      analyzeVideo()
    } catch (err: any) {
      console.error("Error starting recording:", err)
      setError(err.message || "Failed to start recording")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      stopMediaTracks()
    }
  }

  const resetRecording = () => {
    // Pause video if playing
    if (playbackVideoRef.current && !playbackVideoRef.current.paused) {
      playbackVideoRef.current.pause()
    }

    // Clean up previous URL if it exists
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl)
      setVideoUrl(null)
    }

    setRecordedBlob(null)
    setRecordingTime(0)
    setCurrentTime(0)
    setDuration(0)
    setIsPlaying(false)
    setVideoAnalysis({
      volume: 0,
      pace: 0,
      clarity: 0,
      confidence: 0,
      facialExpressions: 0,
      eyeContact: 0,
    })
    startCamera()
  }

  const togglePlayback = async () => {
    if (!playbackVideoRef.current) return

    try {
      if (isPlaying) {
        playbackVideoRef.current.pause()
        setIsPlaying(false)
        if (playbackTimerRef.current) {
          clearInterval(playbackTimerRef.current)
        }
      } else {
        try {
          await playbackVideoRef.current.play()
          setIsPlaying(true)

          if (playbackTimerRef.current) {
            clearInterval(playbackTimerRef.current)
          }

          playbackTimerRef.current = setInterval(() => {
            if (playbackVideoRef.current) {
              setCurrentTime(playbackVideoRef.current.currentTime)
            }
          }, 100)
        } catch (err) {
          console.error("Error playing video:", err)
          setIsPlaying(false)
        }
      }
    } catch (err) {
      console.error("Error toggling playback:", err)
    }
  }

  const handleTimeUpdate = () => {
    if (playbackVideoRef.current) {
      setCurrentTime(playbackVideoRef.current.currentTime)
    }
  }

  const handleSliderChange = (value: number[]) => {
    if (playbackVideoRef.current) {
      playbackVideoRef.current.currentTime = value[0]
      setCurrentTime(value[0])
    }
  }

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    if (playbackVideoRef.current) {
      playbackVideoRef.current.volume = newVolume
    }
    if (newVolume > 0) {
      setIsMuted(false)
    }
  }

  const toggleMute = () => {
    if (playbackVideoRef.current) {
      if (isMuted) {
        playbackVideoRef.current.volume = previousVolume
        setVolume(previousVolume)
        setIsMuted(false)
      } else {
        setPreviousVolume(volume)
        playbackVideoRef.current.volume = 0
        setVolume(0)
        setIsMuted(true)
      }
    }
  }

  const handleVideoEnded = () => {
    setIsPlaying(false)
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current)
    }
  }

  useEffect(() => {
    startCamera()

    // Clean up function
    return () => {
      stopMediaTracks()
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current)
      }
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl)
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

      <Card className="overflow-hidden">
        {isRecording || !recordedBlob ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-auto aspect-video bg-black" />
        ) : (
          <video
            ref={playbackVideoRef}
            playsInline
            controls={false}
            className="w-full h-auto aspect-video bg-black"
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
          />
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
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-full" onClick={togglePlayback}>
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>

            <Button variant="ghost" size="icon" onClick={toggleMute}>
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>

            <Slider value={[volume]} max={1} step={0.01} onValueChange={handleVolumeChange} className="w-24" />
          </div>

          <div className="mt-4 space-y-3">
            <h4 className="text-sm font-medium">Video Analysis</h4>

            <div className="space-y-2">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Volume</span>
                  <span>{Math.round(videoAnalysis.volume)}%</span>
                </div>
                <Progress value={videoAnalysis.volume} className={getAnalysisColor(videoAnalysis.volume)} />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Pace</span>
                  <span>{Math.round(videoAnalysis.pace)}%</span>
                </div>
                <Progress value={videoAnalysis.pace} className={getAnalysisColor(videoAnalysis.pace)} />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Clarity</span>
                  <span>{Math.round(videoAnalysis.clarity)}%</span>
                </div>
                <Progress value={videoAnalysis.clarity} className={getAnalysisColor(videoAnalysis.clarity)} />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Confidence</span>
                  <span>{Math.round(videoAnalysis.confidence)}%</span>
                </div>
                <Progress value={videoAnalysis.confidence} className={getAnalysisColor(videoAnalysis.confidence)} />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Facial Expressions</span>
                  <span>{Math.round(videoAnalysis.facialExpressions)}%</span>
                </div>
                <Progress
                  value={videoAnalysis.facialExpressions}
                  className={getAnalysisColor(videoAnalysis.facialExpressions)}
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Eye Contact</span>
                  <span>{Math.round(videoAnalysis.eyeContact)}%</span>
                </div>
                <Progress value={videoAnalysis.eyeContact} className={getAnalysisColor(videoAnalysis.eyeContact)} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          {isRecording ? (
            <span className="text-red-500 flex items-center">
              <span className="h-2 w-2 rounded-full bg-red-500 mr-2 animate-pulse" />
              Recording: {formatTime(recordingTime)}
            </span>
          ) : recordedBlob ? (
            <span>Recording complete</span>
          ) : (
            <span>Ready to record</span>
          )}
        </div>

        <div className="flex space-x-2">
          {!isRecording && !recordedBlob && (
            <Button onClick={startRecording}>
              <Video className="mr-2 h-4 w-4" />
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
    </div>
  )
}
