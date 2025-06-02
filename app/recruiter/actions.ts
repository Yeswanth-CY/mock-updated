"use server"

import { createClient } from "@/lib/supabase/server"
import { parseFile, type ParsedQuestion } from "@/lib/file-parsers"
import { revalidatePath } from "next/cache"

// Hardcoded recruiter for testing
const RECRUITER_EMAIL = "haridrageetha14@gmail.com"
const RECRUITER_UUID = "550e8400-e29b-41d4-a716-446655440000" // For UUID fields

export async function uploadQuestions(formData: FormData) {
  try {
    const supabase = createClient()
    const file = formData.get("file") as File
    const companyId = formData.get("companyId") as string

    if (!file) {
      throw new Error("No file provided")
    }

    // Parse the file
    const questions = await parseFile(file)

    if (questions.length === 0) {
      throw new Error("No valid questions found in file")
    }

    // Create upload record (using UUID for question_uploads table)
    const { data: upload, error: uploadError } = await supabase
      .from("question_uploads")
      .insert({
        recruiter_id: RECRUITER_UUID, // Use UUID for this table
        filename: file.name,
        file_type: file.type,
        questions_count: questions.length,
        upload_status: "processing",
      })
      .select()
      .single()

    if (uploadError) {
      console.error("Upload error:", uploadError)
      throw uploadError
    }

    // Insert questions (using email for company_questions table)
    const questionsToInsert = questions.map((q) => ({
      ...q,
      recruiter_id: RECRUITER_EMAIL, // Use email for this table
      company_id: companyId || null,
    }))

    const { error: questionsError } = await supabase.from("company_questions").insert(questionsToInsert)

    if (questionsError) {
      console.error("Questions insert error:", questionsError)
      // Update upload status to failed
      await supabase.from("question_uploads").update({ upload_status: "failed" }).eq("id", upload.id)

      throw questionsError
    }

    // Update upload status to completed
    await supabase.from("question_uploads").update({ upload_status: "completed" }).eq("id", upload.id)

    revalidatePath("/recruiter")
    return { success: true, questionsCount: questions.length }
  } catch (error) {
    console.error("Error uploading questions:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

export async function fetchRecruiterQuestions() {
  try {
    const supabase = createClient()

    const { data: questions, error } = await supabase
      .from("company_questions")
      .select(`
        *,
        companies (
          name,
          logo_url
        )
      `)
      .eq("recruiter_id", RECRUITER_EMAIL)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Fetch questions error:", error)
      throw error
    }

    return { success: true, questions: questions || [] }
  } catch (error) {
    console.error("Error fetching questions:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      questions: [],
    }
  }
}

export async function updateQuestion(questionId: string, updates: Partial<ParsedQuestion>) {
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from("company_questions")
      .update(updates)
      .eq("id", questionId)
      .eq("recruiter_id", RECRUITER_EMAIL)

    if (error) throw error

    revalidatePath("/recruiter")
    return { success: true }
  } catch (error) {
    console.error("Error updating question:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

export async function deleteQuestion(questionId: string) {
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from("company_questions")
      .delete()
      .eq("id", questionId)
      .eq("recruiter_id", RECRUITER_EMAIL)

    if (error) throw error

    revalidatePath("/recruiter")
    return { success: true }
  } catch (error) {
    console.error("Error deleting question:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

export async function fetchStudentPerformance() {
  try {
    const supabase = createClient()

    // Simplified query without profiles table dependency
    const { data: performance, error } = await supabase
      .from("student_performance")
      .select(`
        *,
        interviews (
          title,
          job_role,
          company_id,
          companies (
            name
          )
        )
      `)
      .order("created_at", { ascending: false })

    if (error) throw error

    // Add mock student names for demo purposes
    const performanceWithNames = (performance || []).map((p, index) => ({
      ...p,
      student_name: `Student ${index + 1}`, // Mock student names
    }))

    return { success: true, performance: performanceWithNames }
  } catch (error) {
    console.error("Error fetching student performance:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      performance: [],
    }
  }
}

export async function calculateStudentXP(studentId: string, score: number) {
  try {
    const supabase = createClient()

    // Calculate XP based on score (score * 10 for example)
    const xpEarned = Math.floor(score * 10)

    // Update or create student XP record
    const { data: existingXP, error: fetchError } = await supabase
      .from("student_xp")
      .select("*")
      .eq("student_id", studentId)
      .single()

    if (fetchError && fetchError.code !== "PGRST116") {
      throw fetchError
    }

    if (existingXP) {
      // Update existing record
      const newTotalXP = existingXP.total_xp + xpEarned
      const newLevel = Math.floor(newTotalXP / 1000) + 1 // Level up every 1000 XP

      const { error: updateError } = await supabase
        .from("student_xp")
        .update({
          total_xp: newTotalXP,
          level: newLevel,
          updated_at: new Date().toISOString(),
        })
        .eq("student_id", studentId)

      if (updateError) throw updateError
    } else {
      // Create new record
      const newLevel = Math.floor(xpEarned / 1000) + 1

      const { error: insertError } = await supabase.from("student_xp").insert({
        student_id: studentId,
        total_xp: xpEarned,
        level: newLevel,
      })

      if (insertError) throw insertError
    }

    return { success: true, xpEarned }
  } catch (error) {
    console.error("Error calculating student XP:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

// Add some sample performance data for demo
export async function createSamplePerformanceData() {
  try {
    const supabase = createClient()

    // Create sample performance records
    const sampleData = [
      {
        student_id: "student-1",
        interview_id: null,
        question_id: null,
        score: 85,
        xp_earned: 850,
        feedback: "Great performance on technical questions",
      },
      {
        student_id: "student-2",
        interview_id: null,
        question_id: null,
        score: 92,
        xp_earned: 920,
        feedback: "Excellent communication skills",
      },
      {
        student_id: "student-3",
        interview_id: null,
        question_id: null,
        score: 78,
        xp_earned: 780,
        feedback: "Good understanding of concepts",
      },
    ]

    const { error } = await supabase.from("student_performance").insert(sampleData)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error creating sample data:", error)
    return { success: false, error: error.message }
  }
}

export async function fetchUploadHistory() {
  try {
    const supabase = createClient()

    const { data: uploads, error } = await supabase
      .from("question_uploads")
      .select("*")
      .eq("recruiter_id", RECRUITER_UUID)
      .order("created_at", { ascending: false })

    if (error) throw error

    return { success: true, uploads: uploads || [] }
  } catch (error) {
    console.error("Error fetching upload history:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      uploads: [],
    }
  }
}
