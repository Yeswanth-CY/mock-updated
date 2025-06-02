"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { uploadQuestions } from "@/app/recruiter/actions"
import { Upload, FileText, CheckCircle, XCircle } from "lucide-react"

interface FileUploadProps {
  companies?: Array<{ id: string; name: string }>
  onUploadComplete?: () => void
}

export function FileUpload({ companies = [], onUploadComplete }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [companyId, setCompanyId] = useState<string>("")
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setResult(null)

    const formData = new FormData()
    formData.append("file", file)
    if (companyId) {
      formData.append("companyId", companyId)
    }

    try {
      const response = await uploadQuestions(formData)

      if (response.success) {
        setResult({
          success: true,
          message: `Successfully uploaded ${response.questionsCount} questions!`,
        })
        setFile(null)
        setCompanyId("")
        // Reset file input
        const fileInput = document.getElementById("file-upload") as HTMLInputElement
        if (fileInput) fileInput.value = ""

        onUploadComplete?.()
      } else {
        setResult({
          success: false,
          message: response.error || "Upload failed",
        })
      }
    } catch (error) {
      setResult({
        success: false,
        message: "An unexpected error occurred",
      })
    } finally {
      setUploading(false)
    }
  }

  const acceptedFormats = ".csv,.txt,.xlsx,.xls,.pdf,.doc,.docx"

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Questions
          </CardTitle>
          <CardDescription>
            Upload questions in CSV, Excel, PDF, Word, or text format. For best results, use CSV format with columns:
            Question Text, Question Type, Experience Level
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-select">Company (Optional)</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a company or leave blank for general questions" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file-upload">Question File</Label>
            <Input
              id="file-upload"
              type="file"
              accept={acceptedFormats}
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            <p className="text-sm text-muted-foreground">
              Supported formats: CSV, Excel (.xlsx, .xls), PDF, Word (.docx, .doc), Text (.txt)
            </p>
          </div>

          {file && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <FileText className="h-4 w-4" />
              <span className="text-sm">{file.name}</span>
              <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}

          <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
            {uploading ? "Uploading..." : "Upload Questions"}
          </Button>

          {result && (
            <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={result.success ? "text-green-800" : "text-red-800"}>
                  {result.message}
                </AlertDescription>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sample CSV Format</CardTitle>
          <CardDescription>Use this format for best results when uploading CSV files</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto">
            {`Question Text,Question Type,Experience Level
"Tell me about yourself",behavioral,fresher
"What is React?",technical,fresher
"How do you handle conflicts?",situational,1-3-years
"Explain microservices architecture",technical,3-plus-years`}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
