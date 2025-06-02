"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { Search, Clock, Users, Building2, Play } from "lucide-react"
import Link from "next/link"

type TestData = {
  company_id: string
  company_name: string
  company_logo: string | null
  company_industry: string | null
  experience_level: string
  question_count: number
  question_types: string[]
}

export function AvailableTests() {
  const [tests, setTests] = useState<TestData[]>([])
  const [filteredTests, setFilteredTests] = useState<TestData[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedLevel, setSelectedLevel] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchTests()
  }, [])

  useEffect(() => {
    filterTests()
  }, [tests, searchTerm, selectedLevel])

  const fetchTests = async () => {
    try {
      const supabase = createClient()

      // Get questions from company_questions table grouped by company and experience level
      const { data: questions, error } = await supabase
        .from("company_questions")
        .select(`
          company_id,
          experience_level,
          question_type,
          companies(name, logo_url, industry)
        `)
        .not("recruiter_id", "is", null) // Only show recruiter-uploaded questions

      if (error) throw error

      // Group questions by company and experience level
      const groupedTests = questions?.reduce((acc: Record<string, TestData>, question: any) => {
        const key = `${question.company_id}-${question.experience_level}`

        if (!acc[key]) {
          acc[key] = {
            company_id: question.company_id,
            company_name: question.companies?.name || "Unknown Company",
            company_logo: question.companies?.logo_url,
            company_industry: question.companies?.industry,
            experience_level: question.experience_level,
            question_count: 0,
            question_types: [],
          }
        }

        acc[key].question_count++
        if (!acc[key].question_types.includes(question.question_type)) {
          acc[key].question_types.push(question.question_type)
        }

        return acc
      }, {})

      setTests(Object.values(groupedTests || {}))
    } catch (error) {
      console.error("Error fetching tests:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterTests = () => {
    let filtered = tests

    if (searchTerm) {
      filtered = filtered.filter(
        (test) =>
          test.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          test.company_industry?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (selectedLevel !== "all") {
      filtered = filtered.filter((test) => test.experience_level === selectedLevel)
    }

    setFilteredTests(filtered)
  }

  const getExperienceLevelBadge = (level: string) => {
    const colors = {
      fresher: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      "1-3-years": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      "3-plus-years": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    }

    const labels = {
      fresher: "Fresher",
      "1-3-years": "1-3 Years",
      "3-plus-years": "3+ Years",
    }

    return (
      <Badge variant="outline" className={colors[level as keyof typeof colors]}>
        {labels[level as keyof typeof labels]}
      </Badge>
    )
  }

  const estimateTime = (questionCount: number) => {
    return Math.ceil(questionCount * 3) // 3 minutes per question
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted animate-pulse rounded"></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Available Tests</h2>
          <p className="text-muted-foreground">Practice with real interview questions from top companies</p>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{filteredTests.length} tests available</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search companies or industries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedLevel} onValueChange={setSelectedLevel}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Experience Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="fresher">Fresher</SelectItem>
            <SelectItem value="1-3-years">1-3 Years</SelectItem>
            <SelectItem value="3-plus-years">3+ Years</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tests Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTests.length > 0 ? (
          filteredTests.map((test) => (
            <Card key={`${test.company_id}-${test.experience_level}`} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold">{test.company_name}</h3>
                    </div>
                    {test.company_industry && (
                      <Badge variant="outline" className="text-xs">
                        {test.company_industry}
                      </Badge>
                    )}
                  </div>
                  {getExperienceLevelBadge(test.experience_level)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{test.question_count} questions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>~{estimateTime(test.question_count)} min</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Question Types:</p>
                  <div className="flex flex-wrap gap-1">
                    {test.question_types.map((type) => (
                      <Badge key={type} variant="secondary" className="text-xs">
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button asChild className="w-full">
                  <Link href={`/interviews/new?company=${test.company_id}&level=${test.experience_level}`}>
                    <Play className="mr-2 h-4 w-4" />
                    Start Test
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full">
            <Card>
              <CardContent className="p-8 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No tests available</h3>
                <p className="text-muted-foreground">
                  {searchTerm || selectedLevel !== "all"
                    ? "Try adjusting your filters to find tests."
                    : "Recruiters haven't uploaded any tests yet. Upload some questions first!"}
                </p>
                <Button asChild className="mt-4">
                  <Link href="/recruiter">Go to Recruiter Dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
