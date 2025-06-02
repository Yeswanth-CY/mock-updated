"use client"

import { useState } from "react"
import { interviewTemplates, type InterviewTemplate } from "@/lib/interview-templates"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import * as Icons from "lucide-react"

interface TemplateSelectorProps {
  onSelectTemplate: (template: InterviewTemplate) => void
}

export function TemplateSelector({ onSelectTemplate }: TemplateSelectorProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
    const template = interviewTemplates.find((t) => t.id === templateId)
    if (template) {
      onSelectTemplate(template)
    }
  }

  // Dynamic icon component
  const DynamicIcon = ({ name }: { name: string }) => {
    const IconComponent = (Icons as any)[name] || Icons.HelpCircle
    return <IconComponent className="h-5 w-5" />
  }

  return (
    <div className="space-y-4">
      <RadioGroup value={selectedTemplateId || ""} onValueChange={handleSelectTemplate}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {interviewTemplates.map((template) => (
            <div key={template.id}>
              <RadioGroupItem
                value={template.id}
                id={template.id}
                className="peer sr-only"
                aria-label={template.title}
              />
              <Label htmlFor={template.id} className="block cursor-pointer">
                <Card
                  className={cn(
                    "h-full transition-all hover:border-primary",
                    selectedTemplateId === template.id && "border-primary bg-primary/5",
                  )}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="rounded-full bg-primary/10 p-1.5">
                        <DynamicIcon name={template.icon} />
                      </div>
                      <Badge variant="outline">{template.difficulty}</Badge>
                    </div>
                    <CardTitle className="text-lg mt-2">{template.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="text-sm text-muted-foreground">
                      <div>
                        <strong>Role:</strong> {template.jobRole}
                      </div>
                      <div>
                        <strong>Industry:</strong> {template.industry}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <div className="flex flex-wrap gap-1">
                      {template.questionTypes.map((type) => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Badge>
                      ))}
                    </div>
                  </CardFooter>
                </Card>
              </Label>
            </div>
          ))}
        </div>
      </RadioGroup>
    </div>
  )
}
