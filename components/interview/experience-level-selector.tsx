"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { GraduationCap, Briefcase, Trophy } from "lucide-react"

interface ExperienceLevelSelectorProps {
  onSelectLevel: (level: "fresher" | "1-3-years" | "3-plus-years") => void
  selectedLevel?: string
}

const experienceLevels = [
  {
    id: "fresher",
    title: "Fresher",
    description: "New graduate or entry-level position",
    icon: GraduationCap,
    details: "Perfect for recent graduates or those starting their career",
  },
  {
    id: "1-3-years",
    title: "1–3 Years",
    description: "Junior to mid-level experience",
    icon: Briefcase,
    details: "Ideal for professionals with some industry experience",
  },
  {
    id: "3-plus-years",
    title: "3+ Years",
    description: "Senior level experience",
    icon: Trophy,
    details: "Suitable for experienced professionals and senior roles",
  },
] as const

export function ExperienceLevelSelector({ onSelectLevel, selectedLevel }: ExperienceLevelSelectorProps) {
  const handleSelectLevel = (levelId: string) => {
    onSelectLevel(levelId as "fresher" | "1-3-years" | "3-plus-years")
  }

  return (
    <div className="space-y-4">
      <RadioGroup value={selectedLevel || ""} onValueChange={handleSelectLevel}>
        <div className="grid gap-4 md:grid-cols-3">
          {experienceLevels.map((level) => {
            const IconComponent = level.icon
            return (
              <div key={level.id}>
                <RadioGroupItem value={level.id} id={level.id} className="peer sr-only" aria-label={level.title} />
                <Label htmlFor={level.id} className="block cursor-pointer">
                  <Card
                    className={cn(
                      "h-full transition-all hover:border-primary",
                      selectedLevel === level.id && "border-primary bg-primary/5",
                    )}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-center mb-2">
                        <div className="rounded-full bg-primary/10 p-3">
                          <IconComponent className="h-8 w-8 text-primary" />
                        </div>
                      </div>
                      <CardTitle className="text-xl text-center">{level.title}</CardTitle>
                      <CardDescription className="text-center">{level.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground text-center">{level.details}</p>
                    </CardContent>
                  </Card>
                </Label>
              </div>
            )
          })}
        </div>
      </RadioGroup>
    </div>
  )
}
