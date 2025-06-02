"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createInterviewWithQuestions, createCompanyInterview } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { TemplateSelector } from "@/components/interview/template-selector"
import { CompanySelector } from "@/components/interview/company-selector"
import { ExperienceLevelSelector } from "@/components/interview/experience-level-selector"
import type { InterviewTemplate } from "@/lib/interview-templates"
import type { Database } from "@/types/supabase"

type Company = Database["public"]["Tables"]["companies"]["Row"]

export default function NewInterviewPage() {
  const [title, setTitle] = useState("")
  const [jobRole, setJobRole] = useState("")
  const [industry, setIndustry] = useState("")
  const [difficulty, setDifficulty] = useState<string>("")
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [experienceLevel, setExperienceLevel] = useState<"fresher" | "1-3-years" | "3-plus-years" | "">("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("company") // Default to company tab

  const router = useRouter()
  const { toast } = useToast()

  const handleSelectTemplate = (template: InterviewTemplate) => {
    setTitle(template.title)
    setJobRole(template.jobRole)
    setIndustry(template.industry)
    setDifficulty(template.difficulty)
    // Automatically switch to the custom tab after selecting a template
    setActiveTab("custom")
  }

  const handleSelectCompany = (company: Company) => {
    setSelectedCompany(company)
    setTitle(`${company.name} Interview`)
    setJobRole("Software Engineer") // Default job role
    setIndustry(company.industry || "Technology")
  }

  const handleSelectExperienceLevel = (level: "fresher" | "1-3-years" | "3-plus-years") => {
    setExperienceLevel(level)
  }

  const handleSubmitCompanyInterview = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedCompany || !experienceLevel) {
      setError("Please select both a company and experience level")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      toast({
        title: "Creating interview...",
        description: "Loading questions for your selected company and experience level.",
      })

      const result = await createCompanyInterview({
        companyId: selectedCompany.id,
        experienceLevel,
        title,
        jobRole,
        industry,
      })

      if (!result.success) {
        throw new Error(result.error || "Failed to create interview")
      }

      toast({
        title: "Interview created",
        description: "Your company-specific mock interview has been created successfully.",
      })

      router.push(`/interviews/${result.interviewId}`)
    } catch (err: any) {
      console.error("Error creating company interview:", err)
      setError(err.message || "Failed to create interview")
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create interview. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitCustomInterview = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("title", title)
      formData.append("jobRole", jobRole)
      formData.append("industry", industry)
      formData.append("difficulty", difficulty)

      toast({
        title: "Creating interview...",
        description: "Generating questions for your mock interview.",
      })

      const result = await createInterviewWithQuestions(formData)

      if (!result.success) {
        throw new Error(result.error || "Failed to create interview")
      }

      toast({
        title: "Interview created",
        description: "Your mock interview has been created successfully.",
      })

      router.push(`/interviews/${result.interviewId}`)
    } catch (err: any) {
      console.error("Error creating interview:", err)
      setError(err.message || "Failed to create interview")
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create interview. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container max-w-4xl py-10">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Create New Interview</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="company">Company Interview</TabsTrigger>
          <TabsTrigger value="template">Use Template</TabsTrigger>
          <TabsTrigger value="custom">Custom Interview</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company-Specific Interview</CardTitle>
                <CardDescription>
                  Practice with real questions from top companies. Select a company and your experience level to get
                  started with authentic interview questions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div>
                  <h3 className="text-lg font-semibold mb-4">Select Company</h3>
                  <CompanySelector onSelectCompany={handleSelectCompany} selectedCompanyId={selectedCompany?.id} />
                </div>

                {selectedCompany && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Select Experience Level</h3>
                    <ExperienceLevelSelector
                      onSelectLevel={handleSelectExperienceLevel}
                      selectedLevel={experienceLevel}
                    />
                  </div>
                )}

                {selectedCompany && experienceLevel && (
                  <form onSubmit={handleSubmitCompanyInterview} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="company-title">Interview Title</Label>
                        <Input id="company-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="company-jobRole">Job Role</Label>
                        <Input
                          id="company-jobRole"
                          value={jobRole}
                          onChange={(e) => setJobRole(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Interview...
                        </>
                      ) : (
                        "Start Company Interview"
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="template">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Select an Interview Template</h2>
            <p className="text-muted-foreground">
              Choose from pre-defined templates for common job roles. You can customize the details after selecting a
              template.
            </p>
            <TemplateSelector onSelectTemplate={handleSelectTemplate} />
          </div>
        </TabsContent>

        <TabsContent value="custom">
          <Card>
            <CardHeader>
              <CardTitle>Interview Details</CardTitle>
              <CardDescription>
                Set up your mock interview by providing the details below. We'll generate relevant questions based on
                your job role and industry.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleSubmitCustomInterview} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Interview Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Frontend Developer Interview Practice"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jobRole">Job Role</Label>
                  <Input
                    id="jobRole"
                    placeholder="e.g., Frontend Developer"
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    placeholder="e.g., Technology"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Interview...
                    </>
                  ) : (
                    "Create Interview"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
