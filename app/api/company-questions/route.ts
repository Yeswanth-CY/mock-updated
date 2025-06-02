import { NextResponse } from "next/server"
import { fetchCompanyQuestions } from "@/app/actions"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get("companyId")
    const experienceLevel = searchParams.get("experienceLevel")

    if (!companyId || !experienceLevel) {
      return NextResponse.json({ error: "Missing companyId or experienceLevel" }, { status: 400 })
    }

    const result = await fetchCompanyQuestions(companyId, experienceLevel)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json(result.questions)
  } catch (error) {
    console.error("Error in company-questions API route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
