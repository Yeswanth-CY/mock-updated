"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { Search, Filter, BookOpen, Building2 } from "lucide-react"
import type { Database } from "@/types/supabase"

type CompanyQuestion = Database["public"]["Tables"]["company_questions"]["Row"] & {
  companies: {
    name: string
    industry: string | null
  }
}

export function QuestionBank() {
  const [questions, setQuestions] = useState<CompanyQuestion[]>([])
  const [filteredQuestions, setFilteredQuestions] = useState<CompanyQuestion[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCompany, setSelectedCompany] = useState<string>("all")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [selectedLevel, setSelectedLevel] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    fetchQuestions()
    fetchCompanies()
  }, [])

  useEffect(() => {
    filterQuestions()
  }, [questions, searchTerm, selectedCompany, selectedType, selectedLevel])

  const fetchQuestions = async () => {
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("company_questions")
        .select(`
          *,
          companies(name, industry)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      setQuestions(data || [])
    } catch (error) {
      console.error("Error fetching questions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCompanies = async () => {
    try {
      const supabase = createClient()

      const { data, error } = await supabase.from("companies").select("id, name").order("name")

      if (error) throw error

      setCompanies(data || [])
    } catch (error) {
      console.error("Error fetching companies:", error)
    }
  }

  const filterQuestions = () => {
    let filtered = questions

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (q) =>
          q.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.companies?.name.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filter by company
    if (selectedCompany !== "all") {
      filtered = filtered.filter((q) => q.company_id === selectedCompany)
    }

    // Filter by question type
    if (selectedType !== "all") {
      filtered = filtered.filter((q) => q.question_type === selectedType)
    }

    // Filter by experience level
    if (selectedLevel !== "all") {
      filtered = filtered.filter((q) => q.experience_level === selectedLevel)
    }

    setFilteredQuestions(filtered)
  }

  const getQuestionTypeBadge = (type: string | null) => {
    if (!type) return null

    const colors = {
      behavioral: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      technical: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      situational: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      general: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    }

    return (
      <Badge variant="outline" className={colors[type as keyof typeof colors] || colors.general}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    )
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted animate-pulse rounded"></div>
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Question Bank</h2>
          <p className="text-muted-foreground">Browse and practice with real interview questions from top companies</p>
        </div>
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{filteredQuestions.length} questions</span>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger>
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Question Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="behavioral">Behavioral</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="situational">Situational</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger>
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
        </CardContent>
      </Card>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.length > 0 ? (
          filteredQuestions.map((question) => (
            <Card key={question.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{question.companies?.name}</span>
                      {question.companies?.industry && (
                        <Badge variant="outline" className="text-xs">
                          {question.companies.industry}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getQuestionTypeBadge(question.question_type)}
                      {getExperienceLevelBadge(question.experience_level)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-lg mb-4">{question.question_text}</p>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm">
                    Practice This Question
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No questions found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or search terms to find questions.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
