export interface ParsedQuestion {
  question_text: string
  question_type: string
  experience_level: string
  order_number?: number
}

export async function parseFile(file: File): Promise<ParsedQuestion[]> {
  const fileType = file.type
  const fileName = file.name.toLowerCase()

  try {
    if (fileType === "text/csv" || fileName.endsWith(".csv")) {
      return await parseCSV(file)
    } else if (fileType === "text/plain" || fileName.endsWith(".txt")) {
      return await parseText(file)
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      // For now, treat Excel files as CSV (user should export as CSV)
      return await parseCSV(file)
    } else if (fileName.endsWith(".pdf")) {
      // For now, treat PDF as text (basic implementation)
      return await parseText(file)
    } else if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
      // For now, treat Word docs as text (basic implementation)
      return await parseText(file)
    } else {
      throw new Error("Unsupported file format. Please use CSV, TXT, Excel, PDF, or Word files.")
    }
  } catch (error) {
    console.error("Error parsing file:", error)
    throw new Error("Failed to parse file. Please check the format and try again.")
  }
}

async function parseCSV(file: File): Promise<ParsedQuestion[]> {
  const text = await file.text()
  const lines = text.split("\n").filter((line) => line.trim())

  if (lines.length < 2) {
    throw new Error("CSV file must have at least a header row and one data row")
  }

  // Skip header row
  const dataLines = lines.slice(1)
  const questions: ParsedQuestion[] = []

  dataLines.forEach((line, index) => {
    const columns = parseCSVLine(line)

    if (columns.length >= 1) {
      const question: ParsedQuestion = {
        question_text: columns[0]?.trim() || "",
        question_type: columns[1]?.trim() || "general",
        experience_level: columns[2]?.trim() || "fresher",
        order_number: index + 1,
      }

      if (question.question_text) {
        questions.push(question)
      }
    }
  })

  return questions
}

async function parseText(file: File): Promise<ParsedQuestion[]> {
  const text = await file.text()
  const lines = text.split("\n").filter((line) => line.trim())

  const questions: ParsedQuestion[] = lines.map((line, index) => ({
    question_text: line.trim(),
    question_type: "general",
    experience_level: "fresher",
    order_number: index + 1,
  }))

  return questions.filter((q) => q.question_text)
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      result.push(current)
      current = ""
    } else {
      current += char
    }
  }

  result.push(current)
  return result.map((item) => item.replace(/^"|"$/g, ""))
}
