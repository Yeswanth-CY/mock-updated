import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import Link from "next/link"

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50">
      <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
        <h3 className="mt-4 text-lg font-semibold">No interviews found</h3>
        <p className="mb-4 mt-2 text-sm text-muted-foreground">
          You haven&apos;t created any mock interviews yet. Start by creating your first interview.
        </p>
        <Button asChild>
          <Link href="/interviews/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Interview
          </Link>
        </Button>
      </div>
    </div>
  )
}
