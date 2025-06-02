"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, Save, X } from "lucide-react"
import { fetchRecruiterQuestions, updateQuestion, deleteQuestion } from "@/app/recruiter/actions"

interface Question {
  id: string
  question_text: string
  question_type: "behavioral" | "technical" | "situational" | "general"
  experience_level: "fresher" | "1-3-years" | "3-plus-years"
  order_number: number
  companies?: { name: string; logo_url: string | null }
}

export function QuestionManager() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Question>>({})
  const [filter, setFilter] = useState({
    type: "all",
    level: "all",
    search: "",
  })

  useEffect(() => {
    loadQuestions()
  }, [])

  const loadQuestions = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await fetchRecruiterQuestions()
      if (result.success) {
        setQuestions(result.questions)
      } else {
        setError(result.error || "Failed to load questions")
      }
    } catch (err) {
      setError("An unexpected error occurred")
      console.error("Error loading questions:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (question: Question) => {
    setEditingId(question.id)
    setEditForm(question)
  }

  const handleSave = async () => {
    if (!editingId || !editForm) return

    const result = await updateQuestion(editingId, editForm)
    if (result.success) {
      await loadQuestions()
      setEditingId(null)
      setEditForm({})
    }
  }

  const handleDelete = async (questionId: string) => {
    if (confirm("Are you sure you want to delete this question?")) {
      const result = await deleteQuestion(questionId)
      if (result.success) {
        await loadQuestions()
      }
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditForm({})
  }

  const filteredQuestions = questions.filter((question) => {
    const matchesType = filter.type === "all" || question.question_type === filter.type
    const matchesLevel = filter.level === "all" || question.experience_level === filter.level
    const matchesSearch = !filter.search || question.question_text.toLowerCase().includes(filter.search.toLowerCase())

    return matchesType && matchesLevel && matchesSearch
  })

  const getTypeColor = (type: string) => {
    switch (type) {
      case "technical":
        return "bg-blue-100 text-blue-800"
      case "behavioral":
        return "bg-green-100 text-green-800"
      case "situational":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case "fresher":
        return "bg-emerald-100 text-emerald-800"
      case "1-3-years":
        return "bg-orange-100 text-orange-800"
      case "3-plus-years":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading questions...</div>
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">Error: {error}</p>
        <Button onClick={loadQuestions}>Try Again</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search questions..."
                value={filter.search}
                onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="type">Question Type</Label>
              <Select value={filter.type} onValueChange={(value) => setFilter((prev) => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="behavioral">Behavioral</SelectItem>
                  <SelectItem value="situational">Situational</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="level">Experience Level</Label>
              <Select value={filter.level} onValueChange={(value) => setFilter((prev) => ({ ...prev, level: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  <SelectItem value="fresher">Fresher</SelectItem>
                  <SelectItem value="1-3-years">1-3 Years</SelectItem>
                  <SelectItem value="3-plus-years">3+ Years</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Questions ({filteredQuestions.length})</h3>
        </div>

        {filteredQuestions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No questions found matching your filters.</p>
            </CardContent>
          </Card>
        ) : (
          filteredQuestions.map((question) => (
            <Card key={question.id}>
              <CardContent className="pt-6">
                {editingId === question.id ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="question_text">Question Text</Label>
                      <Textarea
                        id="question_text"
                        value={editForm.question_text || ""}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, question_text: e.target.value }))}
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="question_type">Type</Label>
                        <Select
                          value={editForm.question_type || "all"}
                          onValueChange={(value) => setEditForm((prev) => ({ ...prev, question_type: value as any }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All types</SelectItem>
                            <SelectItem value="technical">Technical</SelectItem>
                            <SelectItem value="behavioral">Behavioral</SelectItem>
                            <SelectItem value="situational">Situational</SelectItem>
                            <SelectItem value="general">General</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="experience_level">Experience Level</Label>
                        <Select
                          value={editForm.experience_level || "all"}
                          onValueChange={(value) =>
                            setEditForm((prev) => ({ ...prev, experience_level: value as any }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All levels</SelectItem>
                            <SelectItem value="fresher">Fresher</SelectItem>
                            <SelectItem value="1-3-years">1-3 Years</SelectItem>
                            <SelectItem value="3-plus-years">3+ Years</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSave} size="sm">
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      <Button onClick={handleCancel} variant="outline" size="sm">
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-2">{question.question_text}</p>
                        <div className="flex gap-2 mb-2">
                          <Badge className={getTypeColor(question.question_type)}>{question.question_type}</Badge>
                          <Badge className={getLevelColor(question.experience_level)}>
                            {question.experience_level}
                          </Badge>
                          {question.companies && <Badge variant="outline">{question.companies.name}</Badge>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleEdit(question)} variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button onClick={() => handleDelete(question.id)} variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
