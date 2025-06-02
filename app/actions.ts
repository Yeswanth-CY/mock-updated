"use server"

import { createClient } from "@/lib/supabase/server"
import { generateInterviewQuestions, analyzeResponse, transcribeMedia } from "@/lib/gemini"
import { revalidatePath } from "next/cache"

// Generate interview questions and save them to the database
export async function generateAndSaveQuestions({
  interviewId,
  jobRole,
  industry,
  difficulty,
  count = 5,
}: {
  interviewId: string
  jobRole: string
  industry: string | null
  difficulty: string | null
  count?: number
}) {
  try {
    const supabase = createClient()

    // Generate questions using our utility function
    const questions = await generateInterviewQuestions({
      jobRole,
      industry,
      difficulty,
      count,
    })

    // Insert questions into the database
    const questionsToInsert = questions.map((question: any, index: number) => ({
      interview_id: interviewId,
      question_text: question.question_text,
      question_type: question.question_type,
      order_number: index + 1,
    }))

    const { error } = await supabase.from("questions").insert(questionsToInsert)

    if (error) {
      throw error
    }

    return { success: true, questions }
  } catch (error) {
    console.error("Error generating and saving questions:", error)
    return { success: false, error: (error as Error).message }
  }
}

// Analyze a response and save feedback to the database
export async function analyzeAndSaveFeedback({
  responseId,
  questionText,
  responseText,
  responseType,
  jobRole,
  mediaUrl,
}: {
  responseId: string
  questionText: string
  responseText: string | null
  responseType: "text" | "video" | "audio"
  jobRole: string
  mediaUrl: string | null
}) {
  try {
    const supabase = createClient()

    let textToAnalyze = responseText

    // If it's a video or audio response, transcribe it first
    if ((responseType === "video" || responseType === "audio") && mediaUrl && !responseText) {
      console.log(`Transcribing ${responseType} from ${mediaUrl}`)

      try {
        textToAnalyze = await transcribeMedia({
          mediaUrl,
          mediaType: responseType === "video" ? "video" : "audio",
        })

        console.log(`Transcription result: ${textToAnalyze?.substring(0, 100)}...`)

        // Update the response with the transcribed text
        if (textToAnalyze) {
          const { error: updateError } = await supabase
            .from("responses")
            .update({ response_text: textToAnalyze })
            .eq("id", responseId)

          if (updateError) {
            console.error("Error updating response with transcribed text:", updateError)
          }
        }
      } catch (transcriptionError) {
        console.error("Error transcribing media:", transcriptionError)
        textToAnalyze =
          "The audio content could not be transcribed. The analysis will be based on general speaking patterns and delivery."
      }
    }

    if (!textToAnalyze) {
      textToAnalyze = "No text content was provided for analysis. The feedback will be limited to general observations."
    }

    // Analyze the response using our utility function
    const analysis = await analyzeResponse({
      question: questionText,
      response: textToAnalyze,
      responseType,
      jobRole,
    })

    // Check if feedback already exists for this response
    const { data: existingFeedback } = await supabase
      .from("feedback")
      .select("id")
      .eq("response_id", responseId)
      .single()

    if (existingFeedback) {
      // Update existing feedback
      const { error } = await supabase
        .from("feedback")
        .update({
          feedback_text: analysis.feedback_text,
          improvement_areas: analysis.improvement_areas,
          strengths: analysis.strengths,
          confidence_score: analysis.confidence_score,
        })
        .eq("id", existingFeedback.id)

      if (error) throw error
    } else {
      // Insert new feedback
      const { error } = await supabase.from("feedback").insert({
        response_id: responseId,
        feedback_text: analysis.feedback_text,
        improvement_areas: analysis.improvement_areas,
        strengths: analysis.strengths,
        confidence_score: analysis.confidence_score,
      })

      if (error) throw error
    }

    return { success: true, analysis }
  } catch (error) {
    console.error("Error analyzing and saving feedback:", error)
    return { success: false, error: (error as Error).message }
  }
}

// Create a new interview with generated questions
export async function createInterviewWithQuestions(formData: FormData) {
  try {
    const supabase = createClient()

    const title = formData.get("title") as string
    const jobRole = formData.get("jobRole") as string
    const industry = formData.get("industry") as string
    const difficulty = formData.get("difficulty") as string

    // Insert the interview
    const { data: interview, error: insertError } = await supabase
      .from("interviews")
      .insert({
        title,
        job_role: jobRole,
        industry: industry || null,
        difficulty: difficulty || null,
        status: "in_progress",
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Generate and save questions
    const result = await generateAndSaveQuestions({
      interviewId: interview.id,
      jobRole,
      industry: industry || null,
      difficulty: difficulty || null,
    })

    if (!result.success) {
      throw new Error(result.error || "Failed to generate questions")
    }

    revalidatePath("/dashboard")
    return { success: true, interviewId: interview.id }
  } catch (error) {
    console.error("Error creating interview:", error)
    return { success: false, error: (error as Error).message }
  }
}

// Save a response and generate feedback
export async function saveResponseWithFeedback({
  questionId,
  responseType,
  responseText,
  mediaUrl,
  questionText,
  jobRole,
}: {
  questionId: string
  responseType: "text" | "video" | "audio"
  responseText: string | null
  mediaUrl: string | null
  questionText: string
  jobRole: string
}) {
  try {
    const supabase = createClient()

    console.log(`Saving ${responseType} response for question ${questionId}`)

    // Check if a response already exists for this question
    const { data: existingResponse } = await supabase
      .from("responses")
      .select("id")
      .eq("question_id", questionId)
      .single()

    let responseId: string

    if (existingResponse) {
      // Update existing response
      const { error } = await supabase
        .from("responses")
        .update({
          response_type: responseType,
          response_text: responseText,
          media_url: mediaUrl,
        })
        .eq("id", existingResponse.id)

      if (error) throw error
      responseId = existingResponse.id
    } else {
      // Insert new response
      const { data: newResponse, error } = await supabase
        .from("responses")
        .insert({
          question_id: questionId,
          response_type: responseType,
          response_text: responseText,
          media_url: mediaUrl,
        })
        .select()
        .single()

      if (error) throw error
      responseId = newResponse.id
    }

    // Generate and save feedback
    const result = await analyzeAndSaveFeedback({
      responseId,
      questionText,
      responseText,
      responseType,
      jobRole,
      mediaUrl,
    })

    if (!result.success) {
      throw new Error(result.error || "Failed to analyze response")
    }

    return { success: true, responseId, feedback: result.analysis }
  } catch (error) {
    console.error("Error saving response with feedback:", error)
    return { success: false, error: (error as Error).message }
  }
}

// Complete an interview
export async function completeInterview(interviewId: string) {
  try {
    const supabase = createClient()

    await supabase
      .from("interviews")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", interviewId)

    revalidatePath(`/interviews/${interviewId}`)
    revalidatePath(`/interviews/${interviewId}/results`)
    revalidatePath("/dashboard")

    return { success: true }
  } catch (error) {
    console.error("Error completing interview:", error)
    return { success: false, error: (error as Error).message }
  }
}

// Create a company-specific interview with pre-uploaded questions
export async function createCompanyInterview({
  companyId,
  experienceLevel,
  title,
  jobRole,
  industry,
}: {
  companyId: string
  experienceLevel: "fresher" | "1-3-years" | "3-plus-years"
  title: string
  jobRole: string
  industry: string
}) {
  try {
    console.log("Creating company interview with params:", {
      companyId,
      experienceLevel,
      title,
      jobRole,
      industry,
    })

    const supabase = createClient()

    // First, verify the company exists
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", companyId)
      .single()

    if (companyError) {
      console.error("Error fetching company:", companyError)
      throw new Error(`Company not found: ${companyError.message}`)
    }

    if (!company) {
      throw new Error("Company not found")
    }

    console.log("Found company:", company)

    // Insert the interview
    const { data: interview, error: insertError } = await supabase
      .from("interviews")
      .insert({
        title,
        job_role: jobRole,
        industry: industry || null,
        company_id: companyId,
        experience_level: experienceLevel,
        status: "in_progress",
      })
      .select()
      .single()

    if (insertError) {
      console.error("Error inserting interview:", insertError)
      throw new Error(`Failed to create interview: ${insertError.message}`)
    }

    console.log("Created interview:", interview)

    // Fetch company-specific questions for the experience level
    const { data: companyQuestions, error: questionsError } = await supabase
      .from("company_questions")
      .select("*")
      .eq("company_id", companyId)
      .eq("experience_level", experienceLevel)
      .order("order_number", { ascending: true })

    if (questionsError) {
      console.error("Error fetching company questions:", questionsError)
      throw new Error(`Failed to fetch company questions: ${questionsError.message}`)
    }

    console.log(`Found ${companyQuestions?.length || 0} company questions`)

    if (!companyQuestions || companyQuestions.length === 0) {
      // If no company-specific questions found, generate default questions
      console.log("No company questions found, generating default questions")
      const result = await generateAndSaveQuestions({
        interviewId: interview.id,
        jobRole,
        industry: industry || null,
        difficulty: "intermediate",
      })

      if (!result.success) {
        throw new Error(result.error || "Failed to generate questions")
      }

      console.log("Generated default questions successfully")
    } else {
      // Insert company questions as interview questions
      const questionsToInsert = companyQuestions.map((question) => ({
        interview_id: interview.id,
        question_text: question.question_text,
        question_type: question.question_type,
        order_number: question.order_number,
      }))

      console.log("Inserting company questions:", questionsToInsert)

      const { error: insertQuestionsError } = await supabase.from("questions").insert(questionsToInsert)

      if (insertQuestionsError) {
        console.error("Error inserting questions:", insertQuestionsError)
        throw new Error(`Failed to insert questions: ${insertQuestionsError.message}`)
      }

      console.log("Inserted company questions successfully")
    }

    revalidatePath("/dashboard")
    return { success: true, interviewId: interview.id }
  } catch (error) {
    console.error("Error creating company interview:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

// Fetch companies for the company selector
export async function fetchCompanies() {
  try {
    const supabase = createClient()

    const { data: companies, error } = await supabase.from("companies").select("*").order("name", { ascending: true })

    if (error) {
      throw error
    }

    return { success: true, companies: companies || [] }
  } catch (error) {
    console.error("Error fetching companies:", error)
    return { success: false, error: (error as Error).message, companies: [] }
  }
}

// Fetch company questions for a specific company and experience level
export async function fetchCompanyQuestions(companyId: string, experienceLevel: string) {
  try {
    const supabase = createClient()

    const { data: questions, error } = await supabase
      .from("company_questions")
      .select("*")
      .eq("company_id", companyId)
      .eq("experience_level", experienceLevel)
      .order("order_number", { ascending: true })

    if (error) {
      throw error
    }

    return { success: true, questions: questions || [] }
  } catch (error) {
    console.error("Error fetching company questions:", error)
    return { success: false, error: (error as Error).message, questions: [] }
  }
}
