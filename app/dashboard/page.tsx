import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { AnalyticsOverview } from "@/components/dashboard/analytics-overview"
import { InterviewCard } from "@/components/dashboard/interview-card"
import { EmptyState } from "@/components/dashboard/empty-state"
import { StudentProfile } from "@/components/dashboard/student-profile"

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: interviews } = await supabase
    .from("interviews")
    .select("*, companies(name, logo_url)")
    .order("created_at", { ascending: false })
    .limit(10)

  return (
    <div className="container py-8">
      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
          <div className="space-y-8">
            <Suspense fallback={<div>Loading analytics...</div>}>
              <AnalyticsOverview />
            </Suspense>

            <div>
              <h2 className="text-xl font-semibold mb-4">Recent Interviews</h2>
              {interviews && interviews.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {interviews.map((interview) => (
                    <InterviewCard key={interview.id} interview={interview} />
                  ))}
                </div>
              ) : (
                <EmptyState />
              )}
            </div>
          </div>
        </div>

        <div>
          <StudentProfile />
        </div>
      </div>
    </div>
  )
}
