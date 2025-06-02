"use client"

import { useState, useEffect } from "react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Search, Building2, Loader2 } from "lucide-react"
import type { Database } from "@/types/supabase"

type Company = Database["public"]["Tables"]["companies"]["Row"]

interface CompanySelectorProps {
  onSelectCompany: (company: Company) => void
  selectedCompanyId?: string
}

export function CompanySelector({ onSelectCompany, selectedCompanyId }: CompanySelectorProps) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCompanies()
  }, [])

  useEffect(() => {
    // Filter companies based on search term
    if (searchTerm.trim() === "") {
      setFilteredCompanies(companies)
    } else {
      const filtered = companies.filter(
        (company) =>
          company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (company.industry && company.industry.toLowerCase().includes(searchTerm.toLowerCase())),
      )
      setFilteredCompanies(filtered)
    }
  }, [searchTerm, companies])

  const fetchCompanies = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Use the server action instead of direct Supabase call
      const result = await fetch("/api/companies")

      if (!result.ok) {
        throw new Error("Failed to fetch companies")
      }

      const data = await result.json()
      setCompanies(data || [])
      setFilteredCompanies(data || [])
    } catch (err) {
      console.error("Error fetching companies:", err)
      setError("Failed to load companies. Please try again.")

      // Fallback to sample companies if API fails
      const sampleCompanies: Company[] = [
        {
          id: "1",
          name: "Google",
          description: "Technology company specializing in Internet-related services and products",
          logo_url: null,
          industry: "Technology",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "2",
          name: "Microsoft",
          description: "Multinational technology corporation",
          logo_url: null,
          industry: "Technology",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "3",
          name: "Amazon",
          description: "E-commerce and cloud computing company",
          logo_url: null,
          industry: "Technology",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "4",
          name: "Apple",
          description: "Technology company that designs and manufactures consumer electronics",
          logo_url: null,
          industry: "Technology",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "5",
          name: "Meta",
          description: "Social media and technology company",
          logo_url: null,
          industry: "Technology",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "6",
          name: "Netflix",
          description: "Streaming entertainment service",
          logo_url: null,
          industry: "Entertainment",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "7",
          name: "Tesla",
          description: "Electric vehicle and clean energy company",
          logo_url: null,
          industry: "Automotive",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "8",
          name: "Spotify",
          description: "Audio streaming and media services provider",
          logo_url: null,
          industry: "Entertainment",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      setCompanies(sampleCompanies)
      setFilteredCompanies(sampleCompanies)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectCompany = (companyId: string) => {
    const company = companies.find((c) => c.id === companyId)
    if (company) {
      onSelectCompany(company)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading companies...</span>
      </div>
    )
  }

  if (error && companies.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search companies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredCompanies.length === 0 ? (
        <div className="text-center p-8">
          <p className="text-muted-foreground">
            {searchTerm ? "No companies found matching your search." : "No companies available."}
          </p>
        </div>
      ) : (
        <RadioGroup value={selectedCompanyId || ""} onValueChange={handleSelectCompany}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCompanies.map((company) => (
              <div key={company.id}>
                <RadioGroupItem value={company.id} id={company.id} className="peer sr-only" aria-label={company.name} />
                <Label htmlFor={company.id} className="block cursor-pointer">
                  <Card
                    className={cn(
                      "h-full transition-all hover:border-primary",
                      selectedCompanyId === company.id && "border-primary bg-primary/5",
                    )}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="rounded-full bg-primary/10 p-2">
                          {company.logo_url ? (
                            <img
                              src={company.logo_url || "/placeholder.svg"}
                              alt={`${company.name} logo`}
                              className="h-6 w-6 object-contain"
                            />
                          ) : (
                            <Building2 className="h-6 w-6" />
                          )}
                        </div>
                        {company.industry && (
                          <Badge variant="outline" className="text-xs">
                            {company.industry}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg mt-2">{company.name}</CardTitle>
                      {company.description && (
                        <CardDescription className="line-clamp-2 text-sm">{company.description}</CardDescription>
                      )}
                    </CardHeader>
                  </Card>
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      )}
    </div>
  )
}
