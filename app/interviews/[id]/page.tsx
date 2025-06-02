import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { InterviewSession } from "@/components/interview/interview-session"

interface InterviewPageProps {
  params: {
    id: string
  }
}

export default async function InterviewPage({ params }: InterviewPageProps) {
  const supabase = createClient()

  // Fetch the interview without user check
  const { data: interview } = await supabase.from("interviews").select("*").eq("id", params.id).single()

  if (!interview) {
    notFound()
  }

  // Fetch the questions
  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("interview_id", params.id)
    .order("order_number", { ascending: true })

  if (!questions || questions.length === 0) {
    notFound()
  }

  return (
    <div className="container max-w-4xl py-10">
      <InterviewSession interview={interview} questions={questions} />
    </div>
  )
}
