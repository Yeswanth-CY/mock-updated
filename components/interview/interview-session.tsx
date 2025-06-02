"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/types/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Mic,
  Video,
  Type,
  Loader2,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react"
import { MediaRecorder } from "./media-recorder"
import { saveResponseWithFeedback, completeInterview } from "@/app/actions"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { v4 as uuidv4 } from "uuid"
import { InterviewSummary } from "./interview-summary"

type Interview = Database["public"]["Tables"]["interviews"]["Row"]
type Question = Database["public"]["Tables"]["questions"]["Row"]

interface InterviewSessionProps {
  interview: Interview
  questions: Question[]
}

export function InterviewSession({ interview, questions }: InterviewSessionProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [responseType, setResponseType] = useState<"text" | "video" | "audio">("text")
  const [textResponse, setTextResponse] = useState("")
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCompleted, setIsCompleted] = useState(interview.status === "completed")
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [audioAnalysis, setAudioAnalysis] = useState<any>(null)
  const [videoAnalysis, setVideoAnalysis] = useState<any>(null)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [previewFeedback, setPreviewFeedback] = useState<any>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [transcribedText, setTranscribedText] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [sessionStartTime] = useState(Date.now())

  const router = useRouter()
  const { toast } = useToast()

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  // Reset media state when changing questions or response type
  useEffect(() => {
    resetResponseState()
  }, [currentQuestionIndex, responseType])

  const handleNextQuestion = async () => {
    if (!currentQuestion) return

    // Validate response
    if (!validateResponse()) {
      return
    }

    setShowConfirmDialog(true)
  }

  const confirmSubmission = async () => {
    setShowConfirmDialog(false)
    setIsSubmitting(true)

    try {
      // Save the current response
      await saveResponse()

      // Move to the next question or complete the interview
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1)
        resetResponseState()
      } else {
        // Complete the interview
        await completeInterviewSession()
        setIsCompleted(true)
      }
    } catch (error) {
      console.error("Error saving response:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save your response. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
      resetResponseState()
    }
  }

  const resetResponseState = () => {
    setTextResponse("")
    setVideoBlob(null)
    setAudioBlob(null)
    setValidationError(null)
    setAudioAnalysis(null)
    setVideoAnalysis(null)
    setPreviewFeedback(null)
    setUploadProgress(0)
    setTranscribedText(null)
    setUploadError(null)
  }

  const validateResponse = () => {
    setValidationError(null)

    if (responseType === "text") {
      if (!textResponse.trim()) {
        setValidationError("Please provide a text response")
        return false
      }

      if (textResponse.trim().length < 20) {
        setValidationError("Your response is too short. Please provide a more detailed answer.")
        return false
      }
    } else if (responseType === "video" && !videoBlob) {
      setValidationError("Please record a video response")
      return false
    } else if (responseType === "audio" && !audioBlob) {
      setValidationError("Please record an audio response")
      return false
    }

    return true
  }

  const uploadMedia = async (blob: Blob, type: "audio" | "video"): Promise<string | null> => {
    try {
      setUploadError(null)

      if (!blob || blob.size === 0) {
        console.error(`Invalid ${type} blob: empty or null`)
        throw new Error(`Invalid ${type} recording. Please try again.`)
      }

      // Log blob details for debugging
      console.log(`Uploading ${type} blob:`, {
        size: blob.size,
        type: blob.type,
        lastModified: blob.lastModified,
      })

      // Generate a unique filename
      const timestamp = new Date().getTime()
      const fileExt = type === "audio" ? "webm" : "webm"
      const fileName = `interviews/${interview.id}/question_${currentQuestion.id}_${type}_${timestamp}_${uuidv4()}.${fileExt}`

      console.log(`Uploading ${type} file: ${fileName}, size: ${blob.size} bytes, type: ${blob.type}`)

      // Create Supabase client
      const supabase = createClient()

      // Upload to Supabase Storage with progress tracking
      const { data, error } = await supabase.storage.from("responses").upload(fileName, blob, {
        contentType: type === "audio" ? "audio/webm" : "video/webm",
        upsert: true,
        onUploadProgress: (progress) => {
          const percentage = (progress.loaded / progress.total) * 100
          setUploadProgress(percentage)
          console.log(`Upload progress: ${percentage.toFixed(2)}%`)
        },
      })

      if (error) {
        console.error(`Error uploading ${type}:`, error)
        throw error
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage.from("responses").getPublicUrl(fileName)
      console.log(`${type} uploaded successfully. Public URL:`, publicUrlData.publicUrl)

      return publicUrlData.publicUrl
    } catch (error) {
      console.error(`Error in uploadMedia (${type}):`, error)
      const errorMessage = error instanceof Error ? error.message : `Failed to upload ${type}. Please try again.`
      setUploadError(errorMessage)
      toast({
        variant: "destructive",
        title: `Error uploading ${type}`,
        description: errorMessage,
      })
      return null
    }
  }

  const handleMediaRecordingComplete = (blob: Blob, type: "audio" | "video", transcription?: string) => {
    console.log(`${type} recording complete, blob size:`, blob.size, "bytes, type:", blob.type)

    if (type === "audio") {
      setAudioBlob(blob)
      if (transcription) {
        setTranscribedText(transcription)
      }
    } else {
      setVideoBlob(blob)
    }
  }

  // Update the saveResponse function to ensure it only uses client-side transcription
  const saveResponse = async () => {
    if (!currentQuestion) return

    setFeedbackLoading(true)
    let responseText = null
    let mediaUrl = null

    try {
      // Process response based on type
      if (responseType === "text") {
        responseText = textResponse
      } else if (responseType === "video" && videoBlob) {
        // Upload video to Supabase Storage
        mediaUrl = await uploadMedia(videoBlob, "video")
        if (!mediaUrl) {
          throw new Error("Failed to upload video")
        }

        // Use transcribed text if available
        responseText = transcribedText || "Video response (transcription not available)"
      } else if (responseType === "audio" && audioBlob) {
        // Upload audio to Supabase Storage
        mediaUrl = await uploadMedia(audioBlob, "audio")
        if (!mediaUrl) {
          throw new Error("Failed to upload audio")
        }

        // Use transcribed text if available
        responseText = transcribedText || "Audio response (transcription not available)"
      }

      // Save response and generate feedback using Gemini API
      const result = await saveResponseWithFeedback({
        questionId: currentQuestion.id,
        responseType,
        responseText,
        mediaUrl,
        questionText: currentQuestion.question_text,
        jobRole: interview.job_role,
      })

      if (!result.success) {
        throw new Error(result.error || "Failed to save response")
      }

      toast({
        title: "Response saved",
        description: "Your response has been saved and analyzed.",
      })
    } catch (error) {
      console.error("Error saving response with feedback:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to analyze your response. Please try again.",
      })
      throw error
    } finally {
      setFeedbackLoading(false)
    }
  }

  const completeInterviewSession = async () => {
    const result = await completeInterview(interview.id)

    if (!result.success) {
      throw new Error(result.error || "Failed to complete interview")
    }

    // Calculate average score based on feedback
    let totalScore = 0
    let questionCount = 0

    try {
      const supabase = createClient()

      // Get responses for this interview
      const { data: responses } = await supabase
        .from("responses")
        .select("id, question_id")
        .in(
          "question_id",
          questions.map((q) => q.id),
        )

      if (responses && responses.length > 0) {
        // Get feedback for these responses
        const { data: feedbacks } = await supabase
          .from("feedback")
          .select("confidence_score")
          .in(
            "response_id",
            responses.map((r) => r.id),
          )

        if (feedbacks && feedbacks.length > 0) {
          // Calculate average score
          totalScore = feedbacks.reduce((sum, fb) => sum + Number(fb.confidence_score), 0)
          questionCount = feedbacks.length
        }
      }
    } catch (error) {
      console.error("Error calculating score:", error)
    }

    const averageScore = questionCount > 0 ? Math.round((totalScore / questionCount) * 100) : 0

    // Record performance and XP
    await recordPerformance(averageScore)

    toast({
      title: "Interview completed",
      description: "Your mock interview has been completed successfully.",
    })

    // Calculate total time spent
    const totalTimeSpent = Math.floor((Date.now() - sessionStartTime) / 1000)

    // Show summary instead of redirecting immediately
    setIsCompleted(true)
  }

  const recordPerformance = async (score: number) => {
    try {
      const supabase = createClient()

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      // Record performance for each question
      for (const question of questions) {
        // Get the response for this question
        const { data: response } = await supabase.from("responses").select("id").eq("question_id", question.id).single()

        if (!response) continue

        // Get feedback for this response
        const { data: feedback } = await supabase
          .from("feedback")
          .select("confidence_score, feedback_text")
          .eq("response_id", response.id)
          .single()

        if (!feedback) continue

        // Calculate question score based on confidence score (0-100)
        const questionScore = Math.round(Number(feedback.confidence_score) * 100)

        // Record performance
        await supabase.from("student_performance").insert({
          student_id: user.id,
          interview_id: interview.id,
          question_id: question.id,
          score: questionScore,
          feedback: feedback.feedback_text,
          xp_earned: Math.floor(questionScore / 10), // 1 XP for every 10 points
        })

        // Update student XP
        const { data: existingXP } = await supabase.from("student_xp").select("*").eq("student_id", user.id).single()

        const xpEarned = Math.floor(questionScore / 10)

        if (existingXP) {
          // Update existing record
          const newTotalXP = existingXP.total_xp + xpEarned
          const newLevel = Math.floor(newTotalXP / 1000) + 1 // Level up every 1000 XP

          await supabase
            .from("student_xp")
            .update({
              total_xp: newTotalXP,
              level: newLevel,
              updated_at: new Date().toISOString(),
            })
            .eq("student_id", user.id)
        } else {
          // Create new record
          await supabase.from("student_xp").insert({
            student_id: user.id,
            total_xp: xpEarned,
            level: Math.floor(xpEarned / 1000) + 1,
          })
        }
      }
    } catch (error) {
      console.error("Error recording performance:", error)
    }
  }

  const handleAnalysisUpdate = (analysis: any) => {
    if (responseType === "audio") {
      setAudioAnalysis(analysis)
    } else {
      setVideoAnalysis(analysis)
    }
  }

  const handlePreviewResponse = async () => {
    if (!validateResponse()) {
      return
    }

    setShowPreviewDialog(true)

    // Generate a quick preview feedback
    try {
      // This would normally call the API, but we'll simulate it for now
      const strengths = []
      const improvements = []

      if (responseType === "text") {
        // Analyze text response
        const wordCount = textResponse.trim().split(/\s+/).length

        if (wordCount > 50) strengths.push("Detailed response")
        else improvements.push("Consider providing more details")

        if (textResponse.includes("example") || textResponse.includes("instance") || textResponse.includes("case")) {
          strengths.push("Good use of examples")
        } else {
          improvements.push("Include specific examples")
        }

        if (textResponse.length > 200) strengths.push("Comprehensive answer")
        else improvements.push("Elaborate on your points")
      } else if (responseType === "audio") {
        // Analyze audio response
        if (audioAnalysis) {
          if (audioAnalysis.volume > 70) strengths.push("Good volume level")
          else improvements.push("Speak a bit louder")

          if (audioAnalysis.pace > 70) strengths.push("Good speaking pace")
          else improvements.push("Adjust your speaking pace")

          if (audioAnalysis.clarity > 70) strengths.push("Clear articulation")
          else improvements.push("Work on clarity of speech")

          if (audioAnalysis.confidence > 70) strengths.push("Confident delivery")
          else improvements.push("Work on sounding more confident")
        }
      } else if (responseType === "video") {
        // Analyze video response
        if (videoAnalysis) {
          if (videoAnalysis.volume > 70) strengths.push("Good volume level")
          else improvements.push("Speak a bit louder")

          if (videoAnalysis.pace > 70) strengths.push("Good speaking pace")
          else improvements.push("Adjust your speaking pace")

          if (videoAnalysis.clarity > 70) strengths.push("Clear articulation")
          else improvements.push("Work on clarity of speech")

          if (videoAnalysis.confidence > 70) strengths.push("Confident delivery")
          else improvements.push("Work on sounding more confident")

          if (videoAnalysis.facialExpressions > 70) strengths.push("Good facial expressions")
          else improvements.push("Use more expressive facial cues")

          if (videoAnalysis.eyeContact > 70) strengths.push("Good eye contact")
          else improvements.push("Maintain better eye contact")
        }
      }

      // Ensure we have at least some feedback
      if (strengths.length === 0) strengths.push("Completed response")
      if (improvements.length === 0) improvements.push("Practice more to improve delivery")

      setPreviewFeedback({
        strengths: strengths.slice(0, 3),
        improvements: improvements.slice(0, 3),
        confidence_score: Math.min(0.5 + (strengths.length / (strengths.length + improvements.length)) * 0.5, 1),
      })
    } catch (error) {
      console.error("Error generating preview feedback:", error)
    }
  }

  const getQuestionTypeBadge = (type: string | null) => {
    if (!type) return null

    switch (type) {
      case "behavioral":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
            Behavioral
          </Badge>
        )
      case "technical":
        return (
          <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
            Technical
          </Badge>
        )
      case "situational":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
            Situational
          </Badge>
        )
      case "general":
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
            General
          </Badge>
        )
      default:
        return null
    }
  }

  if (isCompleted) {
    const totalTimeSpent = Math.floor((Date.now() - sessionStartTime) / 1000)

    return (
      <div className="space-y-6">
        <InterviewSummary interview={interview} questions={questions} totalTime={totalTimeSpent} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold">{interview.title}</h1>
        <p className="text-muted-foreground">
          {interview.job_role} {interview.industry && `• ${interview.industry}`}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
        </div>
        <Progress value={progress} className="w-1/3" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">Question {currentQuestionIndex + 1}</CardTitle>
              <CardDescription>{getQuestionTypeBadge(currentQuestion?.question_type)}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-lg mb-6">{currentQuestion?.question_text}</p>

          {validationError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          {uploadError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}

          <Tabs value={responseType} onValueChange={(value) => setResponseType(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="text">
                <Type className="h-4 w-4 mr-2" />
                Text
              </TabsTrigger>
              <TabsTrigger value="video">
                <Video className="h-4 w-4 mr-2" />
                Video
              </TabsTrigger>
              <TabsTrigger value="audio">
                <Mic className="h-4 w-4 mr-2" />
                Audio
              </TabsTrigger>
            </TabsList>
            <TabsContent value="text" className="mt-4">
              <Textarea
                placeholder="Type your answer here..."
                className="min-h-[200px]"
                value={textResponse}
                onChange={(e) => setTextResponse(e.target.value)}
              />
            </TabsContent>
            <TabsContent value="video" className="mt-4">
              <MediaRecorder
                onRecordingComplete={handleMediaRecordingComplete}
                onAnalysisUpdate={handleAnalysisUpdate}
                defaultType="video"
              />
            </TabsContent>
            <TabsContent value="audio" className="mt-4">
              <MediaRecorder
                onRecordingComplete={handleMediaRecordingComplete}
                onAnalysisUpdate={handleAnalysisUpdate}
                defaultType="audio"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0 || isSubmitting}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handlePreviewResponse}
              disabled={
                isSubmitting ||
                (responseType === "text" && !textResponse) ||
                (responseType === "video" && !videoBlob) ||
                (responseType === "audio" && !audioBlob)
              }
            >
              Preview
            </Button>

            <Button
              onClick={handleNextQuestion}
              disabled={
                isSubmitting ||
                (responseType === "text" && !textResponse) ||
                (responseType === "video" && !videoBlob) ||
                (responseType === "audio" && !audioBlob)
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {feedbackLoading
                    ? "Analyzing..."
                    : uploadProgress > 0 && uploadProgress < 100
                      ? `Uploading ${Math.round(uploadProgress)}%`
                      : "Saving..."}
                </>
              ) : currentQuestionIndex === questions.length - 1 ? (
                <>
                  Complete
                  <CheckCircle className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Response</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit this response? You won't be able to edit it after submission.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSubmission}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Response Preview</DialogTitle>
            <DialogDescription>Here's a quick analysis of your response before you submit.</DialogDescription>
          </DialogHeader>

          {previewFeedback ? (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-3xl font-bold">{Math.round(previewFeedback.confidence_score * 100)}%</span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="font-medium flex items-center text-green-600">
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Strengths
                  </h4>
                  <ul className="mt-1 space-y-1">
                    {previewFeedback.strengths.map((strength: string, i: number) => (
                      <li key={i} className="text-sm">
                        • {strength}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium flex items-center text-amber-600">
                    <ThumbsDown className="h-4 w-4 mr-2" />
                    Areas to Improve
                  </h4>
                  <ul className="mt-1 space-y-1">
                    {previewFeedback.improvements.map((improvement: string, i: number) => (
                      <li key={i} className="text-sm">
                        • {improvement}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                This is a preliminary analysis. You'll receive more detailed feedback after submission.
              </p>
            </div>
          ) : (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Continue Editing
            </Button>
            <Button
              onClick={() => {
                setShowPreviewDialog(false)
                setShowConfirmDialog(true)
              }}
            >
              Submit Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
