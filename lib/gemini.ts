import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai"

// Initialize the Google Generative AI with your API key
const apiKey = process.env.GOOGLE_AI_API_KEY!
const genAI = new GoogleGenerativeAI(apiKey)

// Configure safety settings
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
]

// Generate interview questions based on job role and industry
export async function generateInterviewQuestions({
  jobRole,
  industry,
  difficulty,
  count = 5,
}: {
  jobRole: string
  industry: string | null
  difficulty: string | null
  count?: number
}) {
  try {
    // Get the Gemini model - using gemini-1.5-flash instead of gemini-flash-2.0
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      safetySettings,
    })

    // Create the prompt
    const prompt = `Generate ${count} realistic interview questions for a ${difficulty || "intermediate"} level ${jobRole} position ${
      industry ? `in the ${industry} industry` : ""
    }.

    For each question, include:
    1. The question text
    2. The question type (behavioral, technical, situational, or general)

    Return the response as a valid JSON array with objects containing 'question_text' and 'question_type' fields.
    
    Example format:
    [
      {
        "question_text": "Tell me about a time when you had to solve a complex problem under tight deadlines.",
        "question_type": "behavioral"
      },
      {
        "question_text": "How would you optimize a slow-loading web application?",
        "question_type": "technical"
      }
    ]`

    // Generate content
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Extract JSON from the response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error("Failed to parse JSON from response")
    }

    const questions = JSON.parse(jsonMatch[0])
    return questions
  } catch (error) {
    console.error("Error generating interview questions:", error)
    // Return default questions if there's an error
    return generateDefaultQuestions(jobRole, industry, difficulty)
  }
}

// Analyze a response to an interview question
export async function analyzeResponse({
  question,
  response,
  responseType,
  jobRole,
}: {
  question: string
  response: string
  responseType: "text" | "video" | "audio"
  jobRole: string
}) {
  try {
    // Get the Gemini model - using gemini-1.5-flash instead of gemini-flash-2.0
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      safetySettings,
    })

    // Create the prompt
    const prompt = `Analyze the following ${responseType} response to an interview question for a ${jobRole} position.

    Question: "${question}"
    
    Response: "${response}"
    
    Provide a detailed analysis including:
    1. Overall feedback on the quality and relevance of the response
    2. Specific strengths (list at least 3)
    3. Areas for improvement (list at least 3)
    4. A confidence score from 0.0 to 1.0 indicating how well the response answers the question
    
    If this was a video or audio response, also analyze:
    - Voice tone and clarity
    - Pacing and delivery
    - Non-verbal communication cues (if applicable)
    
    Return the response as a valid JSON object with 'feedback_text', 'strengths', 'improvement_areas', and 'confidence_score' fields.
    
    Example format:
    {
      "feedback_text": "Your response effectively addressed the question with specific examples...",
      "strengths": ["Clear communication", "Relevant examples", "Structured answer"],
      "improvement_areas": ["Could provide more specific metrics", "Consider addressing potential challenges", "Elaborate on technical details"],
      "confidence_score": 0.85
    }`

    // Generate content
    const result = await model.generateContent(prompt)
    const responseText = await result.response
    const text = responseText.text()

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("Failed to parse JSON from response")
    }

    const analysis = JSON.parse(jsonMatch[0])
    return analysis
  } catch (error) {
    console.error("Error analyzing response:", error)
    // Return default feedback if there's an error
    return generateDefaultFeedback()
  }
}

// Transcribe audio or video to text
export async function transcribeMedia({
  mediaUrl,
  mediaType,
}: {
  mediaUrl: string
  mediaType: "audio" | "video"
}) {
  try {
    // In a real implementation, you would use a speech-to-text API here
    // For now, we'll return a simulated transcription
    // This is a placeholder for where you would integrate with a transcription service

    // For a real implementation, you could use:
    // 1. Google Cloud Speech-to-Text API
    // 2. OpenAI Whisper API
    // 3. AssemblyAI
    // 4. Other transcription services

    // Simulated delay to mimic processing time
    await new Promise((resolve) => setTimeout(resolve, 2000))

    return "I believe I'm well-suited for this position because of my experience and skills in this field. I've worked on similar projects in the past and have developed the necessary expertise to handle the challenges of this role effectively. I'm particularly proud of my ability to collaborate with cross-functional teams and deliver results on time and within budget."
  } catch (error) {
    console.error(`Error transcribing ${mediaType}:`, error)
    return "I believe I'm well-suited for this position because of my experience and skills in this field. I've worked on similar projects in the past and have developed the necessary expertise to handle the challenges of this role effectively."
  }
}

// Function to generate default interview questions
function generateDefaultQuestions(jobRole: string, industry: string | null, difficulty: string | null) {
  // Base questions that apply to most roles
  const baseQuestions = [
    {
      question_text: `Tell me about your experience as a ${jobRole}.`,
      question_type: "behavioral",
    },
    {
      question_text: `What are the key skills required for a ${jobRole} position?`,
      question_type: "general",
    },
    {
      question_text: `Describe a challenging situation you faced in your previous role.`,
      question_type: "behavioral",
    },
    {
      question_text: `How do you stay updated with the latest trends in ${industry || "your field"}?`,
      question_type: "general",
    },
    {
      question_text: `Where do you see yourself in 5 years?`,
      question_type: "general",
    },
  ]

  // Role-specific questions
  const roleSpecificQuestions: Record<string, any[]> = {
    "Software Engineer": [
      {
        question_text: "Explain the difference between a stack and a queue. When would you use each?",
        question_type: "technical",
      },
      {
        question_text: "How would you optimize a slow-loading web application?",
        question_type: "technical",
      },
      {
        question_text: "Describe a time when you had to refactor a large codebase. What approach did you take?",
        question_type: "behavioral",
      },
      {
        question_text: "How do you ensure your code is maintainable and readable for other developers?",
        question_type: "situational",
      },
    ],
    "Product Manager": [
      {
        question_text: "How do you prioritize features in your product roadmap?",
        question_type: "situational",
      },
      {
        question_text: "Describe a time when you had to make a difficult product decision based on user feedback.",
        question_type: "behavioral",
      },
      {
        question_text: "How do you measure the success of a product feature after launch?",
        question_type: "technical",
      },
      {
        question_text: "How do you balance stakeholder requests with user needs?",
        question_type: "situational",
      },
    ],
    "Data Scientist": [
      {
        question_text: "Explain the difference between supervised and unsupervised learning.",
        question_type: "technical",
      },
      {
        question_text: "How would you handle missing data in a dataset?",
        question_type: "technical",
      },
      {
        question_text: "Describe a time when your data analysis led to a significant business decision.",
        question_type: "behavioral",
      },
      {
        question_text: "How do you communicate complex data findings to non-technical stakeholders?",
        question_type: "situational",
      },
    ],
    "UX Designer": [
      {
        question_text: "Walk me through your design process from research to implementation.",
        question_type: "technical",
      },
      {
        question_text: "How do you incorporate user feedback into your designs?",
        question_type: "situational",
      },
      {
        question_text: "Describe a time when you had to defend a design decision to stakeholders.",
        question_type: "behavioral",
      },
      {
        question_text: "How do you balance aesthetic design with usability?",
        question_type: "situational",
      },
    ],
    "Marketing Manager": [
      {
        question_text: "How do you measure the success of a marketing campaign?",
        question_type: "technical",
      },
      {
        question_text: "Describe a marketing campaign you led that didn't meet expectations. What did you learn?",
        question_type: "behavioral",
      },
      {
        question_text: "How would you allocate a limited marketing budget across different channels?",
        question_type: "situational",
      },
      {
        question_text: "How do you stay ahead of changing marketing trends and technologies?",
        question_type: "general",
      },
    ],
    "Sales Representative": [
      {
        question_text: "How do you handle objections from potential customers?",
        question_type: "situational",
      },
      {
        question_text: "Describe your sales process from prospecting to closing.",
        question_type: "technical",
      },
      {
        question_text: "Tell me about a time when you lost a sale. What did you learn?",
        question_type: "behavioral",
      },
      {
        question_text: "How do you build long-term relationships with clients?",
        question_type: "situational",
      },
    ],
    "Project Manager": [
      {
        question_text: "How do you handle scope creep in a project?",
        question_type: "situational",
      },
      {
        question_text: "Describe a time when you had to manage a project with limited resources.",
        question_type: "behavioral",
      },
      {
        question_text: "What project management methodologies are you familiar with, and when do you use each?",
        question_type: "technical",
      },
      {
        question_text: "How do you communicate project status to stakeholders?",
        question_type: "situational",
      },
    ],
    "Customer Support Specialist": [
      {
        question_text: "How do you handle an angry or frustrated customer?",
        question_type: "situational",
      },
      {
        question_text: "Describe a time when you went above and beyond for a customer.",
        question_type: "behavioral",
      },
      {
        question_text: "How do you prioritize multiple customer issues?",
        question_type: "situational",
      },
      {
        question_text: "What metrics do you use to measure customer satisfaction?",
        question_type: "technical",
      },
    ],
  }

  // Get role-specific questions or use empty array if role not found
  const specificQuestions = roleSpecificQuestions[jobRole] || []

  // Combine base questions with role-specific questions
  let combinedQuestions = [...baseQuestions, ...specificQuestions]

  // Adjust difficulty if specified
  if (difficulty) {
    if (difficulty === "advanced") {
      combinedQuestions = combinedQuestions.map((q) => {
        if (q.question_type === "technical") {
          return {
            ...q,
            question_text: q.question_text.replace(/how|explain|describe/i, "Provide an in-depth explanation of"),
          }
        }
        return q
      })
    } else if (difficulty === "beginner") {
      combinedQuestions = combinedQuestions.map((q) => {
        if (q.question_type === "technical") {
          return {
            ...q,
            question_text: q.question_text.replace(/explain|describe/i, "Briefly explain"),
          }
        }
        return q
      })
    }
  }

  // Shuffle and return the questions
  return shuffleArray(combinedQuestions).slice(0, 7)
}

// Fisher-Yates shuffle algorithm
function shuffleArray(array: any[]) {
  const newArray = [...array]
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[newArray[i], newArray[j]] = [newArray[j], newArray[i]]
  }
  return newArray
}

// Function to generate default feedback
function generateDefaultFeedback() {
  return {
    feedback_text:
      "Your response addresses the question, but could be more specific and detailed. Consider providing concrete examples from your experience to support your points. Overall, your answer demonstrates a good understanding of the topic, but adding more depth would make it stronger.",
    strengths: ["Good communication", "Relevant points", "Clear structure"],
    improvement_areas: ["Add more specific examples", "Elaborate on key points", "Connect to the job role"],
    confidence_score: 0.7,
  }
}
