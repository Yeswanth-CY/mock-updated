export interface InterviewTemplate {
  id: string
  title: string
  jobRole: string
  industry: string
  difficulty: "beginner" | "intermediate" | "advanced"
  description: string
  questionTypes: Array<"behavioral" | "technical" | "situational" | "general">
  icon: string // Lucide icon name
}

export const interviewTemplates: InterviewTemplate[] = [
  {
    id: "software-engineer",
    title: "Software Engineer Interview",
    jobRole: "Software Engineer",
    industry: "Technology",
    difficulty: "intermediate",
    description:
      "Practice common software engineering interview questions covering coding, system design, and problem-solving.",
    questionTypes: ["technical", "behavioral", "situational"],
    icon: "Code",
  },
  {
    id: "product-manager",
    title: "Product Manager Interview",
    jobRole: "Product Manager",
    industry: "Technology",
    difficulty: "intermediate",
    description:
      "Prepare for product management interviews with questions on product strategy, execution, and leadership.",
    questionTypes: ["behavioral", "situational", "general"],
    icon: "Briefcase",
  },
  {
    id: "data-scientist",
    title: "Data Scientist Interview",
    jobRole: "Data Scientist",
    industry: "Technology",
    difficulty: "intermediate",
    description: "Practice data science interview questions covering statistics, machine learning, and data analysis.",
    questionTypes: ["technical", "behavioral", "situational"],
    icon: "BarChart",
  },
  {
    id: "ux-designer",
    title: "UX Designer Interview",
    jobRole: "UX Designer",
    industry: "Design",
    difficulty: "intermediate",
    description:
      "Prepare for UX design interviews with questions on design process, user research, and portfolio review.",
    questionTypes: ["behavioral", "technical", "situational"],
    icon: "Palette",
  },
  {
    id: "marketing-manager",
    title: "Marketing Manager Interview",
    jobRole: "Marketing Manager",
    industry: "Marketing",
    difficulty: "intermediate",
    description: "Practice marketing interview questions covering strategy, campaigns, and analytics.",
    questionTypes: ["behavioral", "situational", "general"],
    icon: "TrendingUp",
  },
  {
    id: "sales-representative",
    title: "Sales Representative Interview",
    jobRole: "Sales Representative",
    industry: "Sales",
    difficulty: "intermediate",
    description:
      "Prepare for sales interviews with questions on sales techniques, customer relationships, and objection handling.",
    questionTypes: ["behavioral", "situational", "general"],
    icon: "DollarSign",
  },
  {
    id: "project-manager",
    title: "Project Manager Interview",
    jobRole: "Project Manager",
    industry: "Business",
    difficulty: "intermediate",
    description:
      "Practice project management interview questions covering methodologies, team leadership, and problem-solving.",
    questionTypes: ["behavioral", "situational", "general"],
    icon: "ClipboardList",
  },
  {
    id: "customer-support",
    title: "Customer Support Interview",
    jobRole: "Customer Support Specialist",
    industry: "Customer Service",
    difficulty: "beginner",
    description:
      "Prepare for customer support interviews with questions on communication, problem-solving, and customer satisfaction.",
    questionTypes: ["behavioral", "situational", "general"],
    icon: "HeadsetHelp",
  },
]

// Function to get a template by ID
export function getTemplateById(id: string): InterviewTemplate | undefined {
  return interviewTemplates.find((template) => template.id === id)
}
