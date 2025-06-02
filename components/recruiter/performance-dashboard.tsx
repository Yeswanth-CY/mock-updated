"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Trophy, Users, Target, TrendingUp } from "lucide-react"
import { fetchStudentPerformance, createSamplePerformanceData } from "@/app/recruiter/actions"
import { Button } from "@/components/ui/button"

interface PerformanceData {
  id: string
  score: number
  xp_earned: number
  created_at: string
  student_name: string
  feedback?: string
  interviews?: {
    title: string
    job_role: string
    companies?: {
      name: string
    }
  }
}

export function PerformanceDashboard() {
  const [performance, setPerformance] = useState<PerformanceData[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalStudents: 0,
    averageScore: 0,
    totalXP: 0,
    completedTests: 0,
  })

  useEffect(() => {
    loadPerformance()
  }, [])

  const loadPerformance = async () => {
    setLoading(true)
    const result = await fetchStudentPerformance()
    if (result.success) {
      setPerformance(result.performance)
      calculateStats(result.performance)
    }
    setLoading(false)
  }

  const createSampleData = async () => {
    const result = await createSamplePerformanceData()
    if (result.success) {
      loadPerformance() // Reload data after creating samples
    }
  }

  const calculateStats = (data: PerformanceData[]) => {
    const uniqueStudents = new Set(data.map((p) => p.student_name)).size
    const totalScore = data.reduce((sum, p) => sum + p.score, 0)
    const averageScore = data.length > 0 ? totalScore / data.length : 0
    const totalXP = data.reduce((sum, p) => sum + p.xp_earned, 0)

    setStats({
      totalStudents: uniqueStudents,
      averageScore: Math.round(averageScore),
      totalXP,
      completedTests: data.length,
    })
  }

  const getScoreDistribution = () => {
    const ranges = [
      { name: "0-20", count: 0, color: "#ef4444" },
      { name: "21-40", count: 0, color: "#f97316" },
      { name: "41-60", count: 0, color: "#eab308" },
      { name: "61-80", count: 0, color: "#22c55e" },
      { name: "81-100", count: 0, color: "#10b981" },
    ]

    performance.forEach((p) => {
      if (p.score <= 20) ranges[0].count++
      else if (p.score <= 40) ranges[1].count++
      else if (p.score <= 60) ranges[2].count++
      else if (p.score <= 80) ranges[3].count++
      else ranges[4].count++
    })

    return ranges
  }

  const getTopPerformers = () => {
    const studentScores = new Map<string, { name: string; totalScore: number; testCount: number }>()

    performance.forEach((p) => {
      const name = p.student_name || "Unknown"
      if (studentScores.has(name)) {
        const existing = studentScores.get(name)!
        existing.totalScore += p.score
        existing.testCount += 1
      } else {
        studentScores.set(name, { name, totalScore: p.score, testCount: 1 })
      }
    })

    return Array.from(studentScores.values())
      .map((student) => ({
        ...student,
        averageScore: Math.round(student.totalScore / student.testCount),
      }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 10)
  }

  if (loading) {
    return <div className="text-center py-8">Loading performance data...</div>
  }

  const scoreDistribution = getScoreDistribution()
  const topPerformers = getTopPerformers()

  return (
    <div className="space-y-6">
      {/* Show sample data button if no data */}
      {performance.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">No student performance data available yet.</p>
            <Button onClick={createSampleData}>Create Sample Data for Demo</Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{stats.totalStudents}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Score</p>
                <p className="text-2xl font-bold">{stats.averageScore}%</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total XP Earned</p>
                <p className="text-2xl font-bold">{stats.totalXP.toLocaleString()}</p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed Tests</p>
                <p className="text-2xl font-bold">{stats.completedTests}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Top Performers</TabsTrigger>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Score Distribution</CardTitle>
                <CardDescription>Distribution of student scores across different ranges</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={scoreDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      label={({ name, count }) => `${name}: ${count}`}
                    >
                      {scoreDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Performance Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Trend</CardTitle>
                <CardDescription>Average scores over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topPerformers.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="averageScore" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Students</CardTitle>
              <CardDescription>Students ranked by average score</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topPerformers.map((student, index) => (
                  <div key={student.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {student.testCount} test{student.testCount !== 1 ? "s" : ""} completed
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{student.averageScore}%</p>
                      <Progress value={student.averageScore} className="w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Test Results</CardTitle>
              <CardDescription>Latest student performance on your questions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performance.slice(0, 10).map((result) => (
                  <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{result.student_name || "Unknown Student"}</p>
                      <p className="text-sm text-muted-foreground">
                        {result.interviews?.title || "Mock Interview"} - {result.interviews?.job_role || "General"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(result.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={result.score >= 70 ? "default" : result.score >= 50 ? "secondary" : "destructive"}
                      >
                        {result.score}%
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1">+{result.xp_earned} XP</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
