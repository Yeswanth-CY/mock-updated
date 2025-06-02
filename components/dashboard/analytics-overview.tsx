"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { BarChart3, TrendingUp, Clock, Target, Award, Users } from "lucide-react"

interface AnalyticsData {
  totalInterviews: number
  completedInterviews: number
  averageScore: number
  totalTimeSpent: number
  topCompanies: Array<{ name: string; count: number }>
  skillsProgress: Array<{ skill: string; score: number; trend: "up" | "down" | "stable" }>
  recentActivity: Array<{ type: string; description: string; date: string }>
}

export function AnalyticsOverview() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const supabase = createClient()

      // Fetch interview statistics
      const { data: interviews } = await supabase.from("interviews").select(`
          *,
          companies(name),
          questions(
            responses(
              feedback(confidence_score)
            )
          )
        `)

      if (interviews) {
        const totalInterviews = interviews.length
        const completedInterviews = interviews.filter((i) => i.status === "completed").length

        // Calculate average score
        let totalScore = 0
        let scoreCount = 0

        interviews.forEach((interview) => {
          interview.questions?.forEach((question: any) => {
            question.responses?.forEach((response: any) => {
              response.feedback?.forEach((feedback: any) => {
                if (feedback.confidence_score) {
                  totalScore += feedback.confidence_score * 100
                  scoreCount++
                }
              })
            })
          })
        })

        const averageScore = scoreCount > 0 ? totalScore / scoreCount : 0

        // Calculate total time spent (estimated)
        const totalTimeSpent = completedInterviews * 25 // Assume 25 minutes per interview

        // Get top companies
        const companyCount: Record<string, number> = {}
        interviews.forEach((interview) => {
          if (interview.companies?.name) {
            companyCount[interview.companies.name] = (companyCount[interview.companies.name] || 0) + 1
          }
        })

        const topCompanies = Object.entries(companyCount)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)

        // Mock skills progress data
        const skillsProgress = [
          { skill: "Communication", score: 85, trend: "up" as const },
          { skill: "Technical Knowledge", score: 78, trend: "up" as const },
          { skill: "Problem Solving", score: 82, trend: "stable" as const },
          { skill: "Leadership", score: 75, trend: "down" as const },
        ]

        // Mock recent activity
        const recentActivity = [
          { type: "interview", description: "Completed Google Software Engineer interview", date: "2 hours ago" },
          { type: "feedback", description: "Received feedback on behavioral questions", date: "1 day ago" },
          { type: "practice", description: "Practiced technical questions", date: "2 days ago" },
        ]

        setAnalytics({
          totalInterviews,
          completedInterviews,
          averageScore,
          totalTimeSpent,
          topCompanies,
          skillsProgress,
          recentActivity,
        })
      }
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted animate-pulse rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">No analytics data available</p>
        </CardContent>
      </Card>
    )
  }

  const completionRate =
    analytics.totalInterviews > 0 ? (analytics.completedInterviews / analytics.totalInterviews) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interviews</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalInterviews}</div>
            <p className="text-xs text-muted-foreground">{analytics.completedInterviews} completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(analytics.averageScore)}%</div>
            <Progress value={analytics.averageScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(completionRate)}%</div>
            <Progress value={completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Practiced</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalTimeSpent}m</div>
            <p className="text-xs text-muted-foreground">~{Math.round(analytics.totalTimeSpent / 60)}h total</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Skills Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Skills Progress
            </CardTitle>
            <CardDescription>Your performance across different skill areas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics.skillsProgress.map((skill) => (
              <div key={skill.skill} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{skill.skill}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{skill.score}%</span>
                    <TrendingUp
                      className={`h-4 w-4 ${
                        skill.trend === "up"
                          ? "text-green-500"
                          : skill.trend === "down"
                            ? "text-red-500"
                            : "text-gray-500"
                      }`}
                    />
                  </div>
                </div>
                <Progress value={skill.score} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Companies */}
        <Card>
          <CardHeader>
            <CardTitle>Top Companies Practiced</CardTitle>
            <CardDescription>Companies you've practiced interviews for</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.topCompanies.length > 0 ? (
              <div className="space-y-3">
                {analytics.topCompanies.map((company, index) => (
                  <div key={company.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">#{index + 1}</span>
                      <span>{company.name}</span>
                    </div>
                    <Badge variant="secondary">{company.count} interviews</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No company interviews yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest interview practice sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">{activity.date}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
