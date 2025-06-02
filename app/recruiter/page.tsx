"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileUpload } from "@/components/recruiter/file-upload"
import { QuestionManager } from "@/components/recruiter/question-manager"
import { PerformanceDashboard } from "@/components/recruiter/performance-dashboard"
import { fetchCompanies } from "@/app/actions"

export default function RecruiterDashboard() {
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    loadCompanies()
  }, [])

  const loadCompanies = async () => {
    const result = await fetchCompanies()
    if (result.success) {
      setCompanies(result.companies)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Recruiter Dashboard</h1>
        <p className="text-muted-foreground">
          Managing questions for: <span className="font-semibold">haridrageetha14@gmail.com</span>
        </p>
      </div>

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Upload Questions</TabsTrigger>
          <TabsTrigger value="manage">Manage Questions</TabsTrigger>
          <TabsTrigger value="performance">Student Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload Questions</CardTitle>
              <CardDescription>
                Upload questions in CSV, Excel, PDF, Word, or text format. Questions will be automatically parsed and
                added to your question bank.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload companies={companies} onUploadComplete={() => window.location.reload()} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage">
          <QuestionManager />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceDashboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}
