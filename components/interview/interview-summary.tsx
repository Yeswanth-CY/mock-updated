"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, Clock, FileText, Download, RotateCcw, Building2 } from "lucide-react"
import Link from "next/link"
import type { Database } from "@/types/supabase"
import { formatDistanceToNow } from "date-fns"

type Interview = Database["public"]["Tables"]["interviews"]["Row"] & {
  companies?: {
    name: string
    industry: string | null
  } | null
}

type Question = Database["public"]["Tables"]["questions"]["Row"] & {
  responses: Array<{
    id: string
    response_type: "text" | "video" | "audio"
    created_at: string
  }>
}

interface InterviewSummaryProps {
  interview: Interview
  questions: Question[]
  totalTime?: number
}

export function InterviewSummary({ interview, questions, totalTime }: InterviewSummaryProps) {
  const [timeSpent, setTimeSpent] = useState(totalTime || 0)

  // Calculate statistics
  const totalQuestions = questions.length
  const answeredQuestions = questions.filter((q) => q.responses && q.responses.length > 0).length
  const completionRate = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0

  // Count response types
  const responseTypes = questions.reduce(
    (acc, question) => {
      if (question.responses && question.responses.length > 0) {
        const responseType = question.responses[0].response_type
        acc[responseType] = (acc[responseType] || 0) + 1
      }
      return acc
    },
    {} as Record<string, number>,
  )

  // Calculate estimated time if not provided
  useEffect(() => {
    if (!totalTime && interview.created_at && interview.completed_at) {
      const startTime = new Date(interview.created_at).getTime()
      const endTime = new Date(interview.completed_at).getTime()
      const duration = Math.floor((endTime - startTime) / 1000) // in seconds
      setTimeSpent(duration)
    }
  }, [totalTime, interview.created_at, interview.completed_at])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  const getExperienceLevelBadge = (level: string | null) => {
    if (!level) return null

    const levelConfig = {
      fresher: { label: "Fresher", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
      "1-3-years": { label: "1-3 Years", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
      "3-plus-years": {
        label: "3+ Years",
        color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      },
    }

    const config = levelConfig[level as keyof typeof levelConfig]
    if (!config) return null

    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">Interview Completed!</CardTitle>
          <CardDescription className="text-center">
            Congratulations on completing your mock interview session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold">{interview.title}</h3>
              <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline">{interview.job_role}</Badge>
                {interview.industry && <Badge variant="outline">{interview.industry}</Badge>}
                {getExperienceLevelBadge(interview.experience_level)}
              </div>
              {interview.companies && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{interview.companies.name}</span>
                </div>
              )}
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{answeredQuestions}</div>
                <div className="text-sm text-muted-foreground">Questions Answered</div>
                <div className="text-xs text-muted-foreground">out of {totalQuestions}</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{Math.round(completionRate)}%</div>
                <div className="text-sm text-muted-foreground">Completion Rate</div>
                <Progress value={completionRate} className="mt-2 h-2" />
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{formatTime(timeSpent)}</div>
                <div className="text-sm text-muted-foreground">Time Spent</div>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {interview.completed_at
                      ? formatDistanceToNow(new Date(interview.completed_at), { addSuffix: true })
                      : "Just now"}
                  </span>
                </div>
              </div>
            </div>

            {Object.keys(responseTypes).length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-3">Response Types</h4>
                  <div className="grid gap-2 md:grid-cols-3">
                    {responseTypes.text && (
                      <div className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm">Text</span>
                        </div>
                        <Badge variant="secondary">{responseTypes.text}</Badge>
                      </div>
                    )}
                    {responseTypes.audio && (
                      <div className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 rounded-full bg-red-500" />
                          <span className="text-sm">Audio</span>
                        </div>
                        <Badge variant="secondary">{responseTypes.audio}</Badge>
                      </div>
                    )}
                    {responseTypes.video && (
                      <div className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 rounded bg-blue-500" />
                          <span className="text-sm">Video</span>
                        </div>
                        <Badge variant="secondary">{responseTypes.video}</Badge>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What's Next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full">
              <Link href={`/interviews/${interview.id}/results`}>
                <FileText className="mr-2 h-4 w-4" />
                View Detailed Results
              </Link>
            </Button>

            <Button variant="outline" asChild className="w-full">
              <Link href="/interviews/new">
                <RotateCcw className="mr-2 h-4 w-4" />
                Take Another Interview
              </Link>
            </Button>

            <Button variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Download Summary (PDF)
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <p className="text-sm">Review your detailed feedback to identify improvement areas</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <p className="text-sm">Practice regularly to build confidence and improve responses</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <p className="text-sm">Try different response types (text, audio, video) for variety</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <p className="text-sm">Focus on company-specific questions for targeted preparation</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
