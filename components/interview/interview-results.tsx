"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Database } from "@/types/supabase"
import {
  ArrowLeft,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  Printer,
  Share2,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"

type Interview = Database["public"]["Tables"]["interviews"]["Row"]
type Question = Database["public"]["Tables"]["questions"]["Row"] & {
  responses: Array<{
    id: string
    question_id: string
    response_type: "text" | "video" | "audio"
    response_text: string | null
    media_url: string | null
    created_at: string
    feedback: Array<{
      id: string
      response_id: string
      feedback_text: string
      improvement_areas: string[] | null
      strengths: string[] | null
      confidence_score: number | null
      created_at: string
    }>
  }>
}

interface InterviewResultsProps {
  interview: Interview
  questions: Question[]
}

export function InterviewResults({ interview, questions }: InterviewResultsProps) {
  const [activeTab, setActiveTab] = useState("summary")
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([])
  const [expandedFeedback, setExpandedFeedback] = useState<string[]>([])
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({})
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({})
  const [volume, setVolume] = useState(0.5)
  const [isMuted, setIsMuted] = useState(false)
  const [previousVolume, setPreviousVolume] = useState(0.5)
  const [currentTimes, setCurrentTimes] = useState<Record<string, number>>({})
  const [durations, setDurations] = useState<Record<string, number>>({})
  const [isPlaying, setIsPlaying] = useState<Record<string, boolean>>({})
  const playbackTimerRefs = useRef<Record<string, NodeJS.Timeout | null>>({})
  const [mediaLoaded, setMediaLoaded] = useState<Record<string, boolean>>({})
  const [mediaError, setMediaError] = useState<Record<string, string | null>>({})
  const [mediaLoading, setMediaLoading] = useState<Record<string, boolean>>({})

  // Clean up media elements when component unmounts or when accordion items change
  useEffect(() => {
    return () => {
      // Pause all videos and audios when component unmounts
      Object.values(videoRefs.current).forEach((videoEl) => {
        if (videoEl && !videoEl.paused) {
          videoEl.pause()
        }
      })

      Object.values(audioRefs.current).forEach((audioEl) => {
        if (audioEl && !audioEl.paused) {
          audioEl.pause()
        }
      })

      // Clear all timers
      Object.values(playbackTimerRefs.current).forEach((timer) => {
        if (timer) {
          clearInterval(timer)
        }
      })
    }
  }, [])

  // Handle accordion state changes
  useEffect(() => {
    // Pause media in closed accordion items
    Object.entries(videoRefs.current).forEach(([id, videoEl]) => {
      if (videoEl && !openAccordionItems.includes(id) && !videoEl.paused) {
        videoEl.pause()
        setIsPlaying((prev) => ({ ...prev, [id]: false }))
        if (playbackTimerRefs.current[id]) {
          clearInterval(playbackTimerRefs.current[id]!)
          playbackTimerRefs.current[id] = null
        }
      }
    })

    Object.entries(audioRefs.current).forEach(([id, audioEl]) => {
      if (audioEl && !openAccordionItems.includes(id) && !audioEl.paused) {
        audioEl.pause()
        setIsPlaying((prev) => ({ ...prev, [id]: false }))
        if (playbackTimerRefs.current[id]) {
          clearInterval(playbackTimerRefs.current[id]!)
          playbackTimerRefs.current[id] = null
        }
      }
    })
  }, [openAccordionItems])

  const handleAccordionChange = (value: string) => {
    if (openAccordionItems.includes(value)) {
      setOpenAccordionItems(openAccordionItems.filter((item) => item !== value))
    } else {
      setOpenAccordionItems([...openAccordionItems, value])
    }
  }

  const toggleFeedbackExpand = (id: string) => {
    if (expandedFeedback.includes(id)) {
      setExpandedFeedback(expandedFeedback.filter((item) => item !== id))
    } else {
      setExpandedFeedback([...expandedFeedback, id])
    }
  }

  const loadMedia = (id: string, type: "video" | "audio") => {
    setMediaLoading((prev) => ({ ...prev, [id]: true }))

    const mediaEl = type === "video" ? videoRefs.current[id] : audioRefs.current[id]
    if (!mediaEl) {
      setMediaError((prev) => ({ ...prev, [id]: `${type} element not found` }))
      setMediaLoading((prev) => ({ ...prev, [id]: false }))
      return
    }

    // Set event listeners
    mediaEl.onloadedmetadata = () => {
      handleMediaLoaded(id, type, mediaEl.duration)
    }

    mediaEl.onerror = (e) => {
      handleMediaError(id, type, e)
    }

    // Force reload
    mediaEl.load()
  }

  const handleMediaLoaded = (id: string, type: "video" | "audio", duration: number) => {
    console.log(`${type} loaded for ${id}, duration: ${duration}`)
    setMediaLoaded((prev) => ({ ...prev, [id]: true }))
    setDurations((prev) => ({ ...prev, [id]: duration }))
    setMediaError((prev) => ({ ...prev, [id]: null }))
    setMediaLoading((prev) => ({ ...prev, [id]: false }))
  }

  const handleMediaError = (id: string, type: "video" | "audio", error: any) => {
    console.error(`Error loading ${type} for ${id}:`, error)
    setMediaLoaded((prev) => ({ ...prev, [id]: false }))
    setMediaLoading((prev) => ({ ...prev, [id]: false }))
    setMediaError((prev) => ({
      ...prev,
      [id]: `Failed to load ${type}. ${error?.message || "Media may be unavailable."}`,
    }))
  }

  const togglePlayback = (id: string, type: "video" | "audio") => {
    const mediaEl = type === "video" ? videoRefs.current[id] : audioRefs.current[id]

    if (!mediaEl) {
      console.error(`No ${type} element found for ${id}`)
      return
    }

    try {
      if (isPlaying[id]) {
        mediaEl.pause()
        setIsPlaying((prev) => ({ ...prev, [id]: false }))
        if (playbackTimerRefs.current[id]) {
          clearInterval(playbackTimerRefs.current[id]!)
          playbackTimerRefs.current[id] = null
        }
      } else {
        // Pause all other media first
        Object.entries(videoRefs.current).forEach(([mediaId, videoEl]) => {
          if (mediaId !== id && videoEl && !videoEl.paused) {
            try {
              videoEl.pause()
              setIsPlaying((prev) => ({ ...prev, [mediaId]: false }))
              if (playbackTimerRefs.current[mediaId]) {
                clearInterval(playbackTimerRefs.current[mediaId]!)
                playbackTimerRefs.current[mediaId] = null
              }
            } catch (err) {
              console.error(`Error pausing video ${mediaId}:`, err)
            }
          }
        })

        Object.entries(audioRefs.current).forEach(([mediaId, audioEl]) => {
          if (mediaId !== id && audioEl && !audioEl.paused) {
            try {
              audioEl.pause()
              setIsPlaying((prev) => ({ ...prev, [mediaId]: false }))
              if (playbackTimerRefs.current[mediaId]) {
                clearInterval(playbackTimerRefs.current[mediaId]!)
                playbackTimerRefs.current[mediaId] = null
              }
            } catch (err) {
              console.error(`Error pausing audio ${mediaId}:`, err)
            }
          }
        })

        // If media isn't loaded yet, load it first
        if (!mediaLoaded[id]) {
          loadMedia(id, type)
          return
        }

        // Play the selected media
        mediaEl
          .play()
          .then(() => {
            setIsPlaying((prev) => ({ ...prev, [id]: true }))

            // Start timer to update current time
            if (playbackTimerRefs.current[id]) {
              clearInterval(playbackTimerRefs.current[id]!)
            }

            playbackTimerRefs.current[id] = setInterval(() => {
              if (mediaEl && !mediaEl.paused) {
                setCurrentTimes((prev) => ({ ...prev, [id]: mediaEl.currentTime }))
              }
            }, 100)
          })
          .catch((err) => {
            console.error(`Error playing ${type}:`, err)
            setMediaError((prev) => ({ ...prev, [id]: `Failed to play ${type}. ${err?.message || ""}` }))
          })
      }
    } catch (err) {
      console.error(`Error in togglePlayback for ${type} ${id}:`, err)
      setMediaError((prev) => ({ ...prev, [id]: `Error controlling ${type}. ${err?.message || ""}` }))
    }
  }

  const handleTimeUpdate = (id: string, time: number) => {
    setCurrentTimes((prev) => ({ ...prev, [id]: time }))
  }

  const handleSliderChange = (id: string, value: number[], type: "video" | "audio") => {
    const mediaEl = type === "video" ? videoRefs.current[id] : audioRefs.current[id]

    if (mediaEl) {
      mediaEl.currentTime = value[0]
      setCurrentTimes((prev) => ({ ...prev, [id]: value[0] }))
    }
  }

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)

    // Apply to all media elements
    Object.values(videoRefs.current).forEach((videoEl) => {
      if (videoEl) {
        videoEl.volume = newVolume
      }
    })

    Object.values(audioRefs.current).forEach((audioEl) => {
      if (audioEl) {
        audioEl.volume = newVolume
      }
    })

    if (newVolume > 0) {
      setIsMuted(false)
    }
  }

  const toggleMute = () => {
    if (isMuted) {
      // Unmute all media
      Object.values(videoRefs.current).forEach((videoEl) => {
        if (videoEl) {
          videoEl.volume = previousVolume
        }
      })

      Object.values(audioRefs.current).forEach((audioEl) => {
        if (audioEl) {
          audioEl.volume = previousVolume
        }
      })

      setVolume(previousVolume)
      setIsMuted(false)
    } else {
      // Mute all media
      setPreviousVolume(volume)

      Object.values(videoRefs.current).forEach((videoEl) => {
        if (videoEl) {
          videoEl.volume = 0
        }
      })

      Object.values(audioRefs.current).forEach((audioEl) => {
        if (audioEl) {
          audioEl.volume = 0
        }
      })

      setVolume(0)
      setIsMuted(true)
    }
  }

  const handleMediaEnded = (id: string) => {
    setIsPlaying((prev) => ({ ...prev, [id]: false }))
    if (playbackTimerRefs.current[id]) {
      clearInterval(playbackTimerRefs.current[id]!)
      playbackTimerRefs.current[id] = null
    }
  }

  const getOverallScore = () => {
    let totalScore = 0
    let totalResponses = 0

    questions.forEach((question) => {
      question.responses.forEach((response) => {
        response.feedback.forEach((feedback) => {
          if (feedback.confidence_score) {
            totalScore += feedback.confidence_score
            totalResponses++
          }
        })
      })
    })

    return totalResponses > 0 ? (totalScore / totalResponses) * 100 : 0
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500"
    if (score >= 60) return "text-yellow-500"
    return "text-red-500"
  }

  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-green-500"
    if (score >= 60) return "bg-yellow-500"
    return "bg-red-500"
  }

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-6 w-6 text-green-500" />
    if (score >= 60) return <AlertCircle className="h-6 w-6 text-yellow-500" />
    return <XCircle className="h-6 w-6 text-red-500" />
  }

  const getAllStrengths = () => {
    const strengths = new Set<string>()

    questions.forEach((question) => {
      question.responses.forEach((response) => {
        response.feedback.forEach((feedback) => {
          if (feedback.strengths) {
            feedback.strengths.forEach((strength) => strengths.add(strength))
          }
        })
      })
    })

    return Array.from(strengths)
  }

  const getAllImprovementAreas = () => {
    const areas = new Set<string>()

    questions.forEach((question) => {
      question.responses.forEach((response) => {
        response.feedback.forEach((feedback) => {
          if (feedback.improvement_areas) {
            feedback.improvement_areas.forEach((area) => areas.add(area))
          }
        })
      })
    })

    return Array.from(areas)
  }

  const getCategoryScores = () => {
    const categories = {
      behavioral: { score: 0, count: 0 },
      technical: { score: 0, count: 0 },
      situational: { score: 0, count: 0 },
      general: { score: 0, count: 0 },
    }

    questions.forEach((question) => {
      const type = (question.question_type as keyof typeof categories) || "general"

      question.responses.forEach((response) => {
        response.feedback.forEach((feedback) => {
          if (feedback.confidence_score) {
            categories[type].score += feedback.confidence_score * 100
            categories[type].count += 1
          }
        })
      })
    })

    // Calculate averages
    const result: Record<string, number> = {}

    Object.entries(categories).forEach(([category, data]) => {
      result[category] = data.count > 0 ? data.score / data.count : 0
    })

    return result
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const exportResults = () => {
    // In a real implementation, this would generate a PDF or other export format
    alert("This would export your interview results as a PDF or other format.")
  }

  const printResults = () => {
    window.print()
  }

  const shareResults = () => {
    // In a real implementation, this would share the results via email or link
    alert("This would share your interview results via email or a shareable link.")
  }

  const overallScore = getOverallScore()
  const strengths = getAllStrengths()
  const improvementAreas = getAllImprovementAreas()
  const categoryScores = getCategoryScores()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" asChild className="mb-2">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">{interview.title} Results</h1>
          <p className="text-muted-foreground">
            {interview.job_role} {interview.industry && `• ${interview.industry}`}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportResults}>
              <Download className="mr-2 h-4 w-4" />
              Export as PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={printResults}>
              <Printer className="mr-2 h-4 w-4" />
              Print Results
            </DropdownMenuItem>
            <DropdownMenuItem onClick={shareResults}>
              <Share2 className="mr-2 h-4 w-4" />
              Share Results
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Overall Performance</CardTitle>
              <CardDescription>Your overall interview performance score and key insights</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-6">
                <div className="flex items-center mb-4">
                  {getScoreIcon(overallScore)}
                  <span className={`text-4xl font-bold ml-2 ${getScoreColor(overallScore)}`}>
                    {Math.round(overallScore)}%
                  </span>
                </div>
                <p className="text-center text-muted-foreground max-w-md">
                  {overallScore >= 80
                    ? "Excellent performance! You demonstrated strong interview skills across most questions."
                    : overallScore >= 60
                      ? "Good performance with some areas for improvement. Review the detailed feedback for specific suggestions."
                      : "There are several areas where you can improve. Review the detailed feedback and practice more."}
                </p>
              </div>

              <div className="space-y-4 mt-6">
                <h3 className="font-semibold text-lg">Performance by Question Type</h3>

                <div className="space-y-3">
                  {Object.entries(categoryScores).map(([category, score]) => (
                    <div key={category} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">{category}</span>
                        <span>{Math.round(score)}%</span>
                      </div>
                      <Progress value={score} className={getProgressColor(score)} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-6 mt-8 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Key Strengths</h3>
                  <ul className="space-y-2">
                    {strengths.map((strength, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Areas for Improvement</h3>
                  <ul className="space-y-2">
                    {improvementAreas.map((area, index) => (
                      <li key={index} className="flex items-start">
                        <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 shrink-0 mt-0.5" />
                        <span>{area}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
              <CardDescription>Recommendations to improve your interview skills</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="bg-primary/10 p-2 rounded-full mr-3">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Practice Regularly</h4>
                    <p className="text-sm text-muted-foreground">
                      Schedule regular mock interviews to build confidence and improve your responses.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-primary/10 p-2 rounded-full mr-3">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Focus on Weak Areas</h4>
                    <p className="text-sm text-muted-foreground">
                      Concentrate on improving your responses to{" "}
                      {Object.entries(categoryScores)
                        .sort((a, b) => a[1] - b[1])
                        .slice(0, 2)
                        .map(([category]) => category)
                        .join(" and ")}{" "}
                      questions.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-primary/10 p-2 rounded-full mr-3">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Review Detailed Feedback</h4>
                    <p className="text-sm text-muted-foreground">
                      Study the specific feedback for each question to understand your strengths and areas for
                      improvement.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-primary/10 p-2 rounded-full mr-3">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Try Different Response Types</h4>
                    <p className="text-sm text-muted-foreground">
                      Practice with text, audio, and video responses to become comfortable with different interview
                      formats.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-6 pt-4">
          <div className="flex items-center space-x-2 mb-4">
            <Button variant="ghost" size="icon" onClick={toggleMute}>
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Slider value={[volume]} max={1} step={0.01} onValueChange={handleVolumeChange} className="w-24" />
          </div>

          <Accordion
            type="multiple"
            value={openAccordionItems}
            onValueChange={setOpenAccordionItems}
            className="w-full"
          >
            {questions.map((question, index) => {
              const response = question.responses[0]
              const feedback = response?.feedback[0]
              const questionId = question.id
              const isFeedbackExpanded = expandedFeedback.includes(questionId)

              return (
                <AccordionItem key={questionId} value={questionId}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center text-left">
                      <span className="font-medium">
                        Question {index + 1}: {question.question_text.substring(0, 60)}
                        {question.question_text.length > 60 ? "..." : ""}
                      </span>

                      {feedback && feedback.confidence_score && (
                        <Badge
                          variant="outline"
                          className={`ml-2 ${
                            feedback.confidence_score * 100 >= 80
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                              : feedback.confidence_score * 100 >= 60
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                          }`}
                        >
                          {Math.round(feedback.confidence_score * 100)}%
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div>
                        <h4 className="font-medium mb-2">Question:</h4>
                        <p>{question.question_text}</p>
                        <div className="mt-2">
                          <Badge variant="outline">
                            {question.question_type?.charAt(0).toUpperCase() + question.question_type?.slice(1) ||
                              "General"}
                          </Badge>
                        </div>
                      </div>

                      {response && (
                        <div>
                          <h4 className="font-medium mb-2">Your Response:</h4>
                          {response.response_type === "text" && response.response_text && (
                            <p className="bg-muted p-3 rounded">{response.response_text}</p>
                          )}

                          {response.response_type === "video" && response.media_url && (
                            <div className="space-y-2">
                              <video
                                src={response.media_url}
                                className="w-full rounded"
                                ref={(el) => {
                                  videoRefs.current[questionId] = el
                                }}
                                onLoadedMetadata={(e) => {
                                  const target = e.target as HTMLVideoElement
                                  handleMediaLoaded(questionId, "video", target.duration)
                                }}
                                onError={(e) => handleMediaError(questionId, "video", e)}
                                onEnded={() => handleMediaEnded(questionId)}
                                preload="none"
                                crossOrigin="anonymous"
                              />

                              {mediaError[questionId] ? (
                                <Alert variant="destructive" className="mt-2">
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertDescription>{mediaError[questionId]}</AlertDescription>
                                </Alert>
                              ) : mediaLoading[questionId] ? (
                                <div className="flex justify-center p-4">
                                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                              ) : mediaLoaded[questionId] ? (
                                <div className="space-y-2">
                                  <Slider
                                    value={[currentTimes[questionId] || 0]}
                                    max={durations[questionId] || 0}
                                    step={0.1}
                                    onValueChange={(value) => handleSliderChange(questionId, value, "video")}
                                  />

                                  <div className="flex items-center justify-between">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 rounded-full"
                                      onClick={() => togglePlayback(questionId, "video")}
                                    >
                                      {isPlaying[questionId] ? (
                                        <Pause className="h-4 w-4" />
                                      ) : (
                                        <Play className="h-4 w-4" />
                                      )}
                                    </Button>

                                    <div className="text-xs text-muted-foreground">
                                      {formatTime(currentTimes[questionId] || 0)} /
                                      {formatTime(durations[questionId] || 0)}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex justify-center p-4">
                                  <Button variant="outline" onClick={() => loadMedia(questionId, "video")}>
                                    Load Video
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}

                          {response.response_type === "audio" && response.media_url && (
                            <div className="space-y-2">
                              <audio
                                src={response.media_url}
                                ref={(el) => {
                                  audioRefs.current[questionId] = el
                                }}
                                onLoadedMetadata={(e) => {
                                  try {
                                    const target = e.target as HTMLAudioElement
                                    handleMediaLoaded(questionId, "audio", target.duration)
                                  } catch (err) {
                                    console.error("Error in audio onLoadedMetadata:", err)
                                    handleMediaError(questionId, "audio", err)
                                  }
                                }}
                                onError={(e) => handleMediaError(questionId, "audio", e)}
                                onEnded={() => handleMediaEnded(questionId)}
                                preload="none"
                                crossOrigin="anonymous"
                              />

                              {mediaError[questionId] ? (
                                <Alert variant="destructive" className="mt-2">
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertDescription>{mediaError[questionId]}</AlertDescription>
                                </Alert>
                              ) : mediaLoading[questionId] ? (
                                <div className="flex justify-center p-4">
                                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                              ) : mediaLoaded[questionId] ? (
                                <div>
                                  <div className="bg-muted p-4 rounded flex items-center justify-center">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-10 w-10 rounded-full"
                                      onClick={() => togglePlayback(questionId, "audio")}
                                    >
                                      {isPlaying[questionId] ? (
                                        <Pause className="h-5 w-5" />
                                      ) : (
                                        <Play className="h-5 w-5" />
                                      )}
                                    </Button>
                                  </div>

                                  <div className="space-y-2 mt-2">
                                    <Slider
                                      value={[currentTimes[questionId] || 0]}
                                      max={durations[questionId] || 0}
                                      step={0.1}
                                      onValueChange={(value) => handleSliderChange(questionId, value, "audio")}
                                    />

                                    <div className="flex justify-between text-xs text-muted-foreground">
                                      <span>{formatTime(currentTimes[questionId] || 0)}</span>
                                      <span>{formatTime(durations[questionId] || 0)}</span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex justify-center p-4">
                                  <Button variant="outline" onClick={() => loadMedia(questionId, "audio")}>
                                    Load Audio
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="mt-2">
                            <Badge>
                              {response.response_type.charAt(0).toUpperCase() + response.response_type.slice(1)}{" "}
                              Response
                            </Badge>
                          </div>
                        </div>
                      )}

                      {feedback && (
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium mb-2">Feedback:</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => toggleFeedbackExpand(questionId)}
                            >
                              {isFeedbackExpanded ? (
                                <>
                                  <ChevronUp className="h-4 w-4 mr-1" />
                                  <span className="text-xs">Less</span>
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-4 w-4 mr-1" />
                                  <span className="text-xs">More</span>
                                </>
                              )}
                            </Button>
                          </div>

                          <div className={`bg-primary/5 p-3 rounded ${isFeedbackExpanded ? "" : "line-clamp-3"}`}>
                            {feedback.feedback_text}
                          </div>

                          <div className="grid gap-4 mt-4 md:grid-cols-2">
                            {feedback.strengths && feedback.strengths.length > 0 && (
                              <div>
                                <h5 className="font-medium mb-2 text-sm">Strengths:</h5>
                                <ul className="space-y-1">
                                  {feedback.strengths.map((strength, i) => (
                                    <li key={i} className="flex items-start text-sm">
                                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 shrink-0 mt-0.5" />
                                      <span>{strength}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {feedback.improvement_areas && feedback.improvement_areas.length > 0 && (
                              <div>
                                <h5 className="font-medium mb-2 text-sm">Areas for Improvement:</h5>
                                <ul className="space-y-1">
                                  {feedback.improvement_areas.map((area, i) => (
                                    <li key={i} className="flex items-start text-sm">
                                      <AlertCircle className="h-4 w-4 text-yellow-500 mr-2 shrink-0 mt-0.5" />
                                      <span>{area}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {feedback.confidence_score && (
                            <div className="mt-4">
                              <h5 className="font-medium mb-2 text-sm">Response Score:</h5>
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span>Overall Quality</span>
                                  <span>{Math.round(feedback.confidence_score * 100)}%</span>
                                </div>
                                <Progress
                                  value={feedback.confidence_score * 100}
                                  className={getProgressColor(feedback.confidence_score * 100)}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </TabsContent>
      </Tabs>
    </div>
  )
}
