import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Database } from "@/types/supabase"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { PlayCircle, CheckCircle, Clock } from "lucide-react"

type Interview = Database["public"]["Tables"]["interviews"]["Row"]

interface InterviewCardProps {
  interview: Interview
}

// Add this helper function before the InterviewCard component
const getExperienceLevelBadge = (level: string | null) => {
  if (!level) return null

  const levelConfig = {
    fresher: { label: "Fresher", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
    "1-3-years": { label: "1-3 Years", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
    "3-plus-years": {
      label: "3+ Years",
      color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    },
  }

  const config = levelConfig[level as keyof typeof levelConfig]
  if (!config) return null

  return (
    <Badge variant="outline" className={config.color}>
      {config.label}
    </Badge>
  )
}

export function InterviewCard({ interview }: InterviewCardProps) {
  const getStatusBadge = () => {
    switch (interview.status) {
      case "in_progress":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
            In Progress
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
            Completed
          </Badge>
        )
      case "abandoned":
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
            Abandoned
          </Badge>
        )
      default:
        return null
    }
  }

  const getDifficultyBadge = () => {
    if (!interview.difficulty) return null

    switch (interview.difficulty) {
      case "beginner":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
            Beginner
          </Badge>
        )
      case "intermediate":
        return (
          <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
            Intermediate
          </Badge>
        )
      case "advanced":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
            Advanced
          </Badge>
        )
      default:
        return null
    }
  }

  const getStatusIcon = () => {
    switch (interview.status) {
      case "in_progress":
        return <Clock className="h-5 w-5 text-yellow-500" />
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      default:
        return null
    }
  }

  const getActionButton = () => {
    if (interview.status === "in_progress") {
      return (
        <Button asChild>
          <Link href={`/interviews/${interview.id}`}>
            <PlayCircle className="mr-2 h-4 w-4" />
            Continue
          </Link>
        </Button>
      )
    }

    if (interview.status === "completed") {
      return (
        <Button asChild variant="outline">
          <Link href={`/interviews/${interview.id}/results`}>View Results</Link>
        </Button>
      )
    }

    return (
      <Button asChild>
        <Link href={`/interviews/${interview.id}`}>View</Link>
      </Button>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl">{interview.title}</CardTitle>
          {getStatusIcon()}
        </div>
        <CardDescription>
          {interview.job_role}
          {interview.industry && ` • ${interview.industry}`}
          {interview.company_id && ` • Company Interview`}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex flex-wrap gap-2 mb-4">
          {getStatusBadge()}
          {getDifficultyBadge()}
          {getExperienceLevelBadge(interview.experience_level)}
        </div>
        <p className="text-sm text-muted-foreground">
          Created {formatDistanceToNow(new Date(interview.created_at), { addSuffix: true })}
        </p>
      </CardContent>
      <CardFooter>{getActionButton()}</CardFooter>
    </Card>
  )
}
