import { NextResponse } from "next/server"
import { fetchCompanies } from "@/app/actions"

export async function GET() {
  try {
    const result = await fetchCompanies()

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json(result.companies)
  } catch (error) {
    console.error("Error in companies API route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
