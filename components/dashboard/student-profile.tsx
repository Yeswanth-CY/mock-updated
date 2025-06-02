"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/client"
import { Award, Star, TrendingUp } from "lucide-react"

export function StudentProfile() {
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [recentXP, setRecentXP] = useState<any[]>([])

  useEffect(() => {
    fetchProfile()
    fetchRecentXP()
  }, [])

  const fetchProfile = async () => {
    try {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase.from("student_xp").select("*").eq("student_id", user.id).single()

      if (error && error.code !== "PGRST116") {
        throw error
      }

      if (data) {
        setProfile(data)
      } else {
        // Create default profile
        setProfile({
          total_xp: 0,
          level: 1,
        })
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchRecentXP = async () => {
    try {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from("student_performance")
        .select(`
          xp_earned,
          created_at,
          interviews (
            title
          )
        `)
        .eq("student_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5)

      if (error) throw error

      setRecentXP(data || [])
    } catch (error) {
      console.error("Error fetching recent XP:", error)
    }
  }

  const calculateProgress = () => {
    if (!profile) return 0

    const currentXP = profile.total_xp
    const currentLevel = profile.level
    const xpForCurrentLevel = (currentLevel - 1) * 1000
    const xpForNextLevel = currentLevel * 1000

    return ((currentXP - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100
  }

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-muted rounded"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-yellow-500" />
          Your Progress
        </CardTitle>
        <CardDescription>Track your interview skills development</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Level {profile?.level || 1}</p>
            <h3 className="text-2xl font-bold">{profile?.total_xp || 0} XP</h3>
          </div>
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Star className="h-8 w-8 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress to Level {(profile?.level || 1) + 1}</span>
            <span>{Math.round(calculateProgress())}%</span>
          </div>
          <Progress value={calculateProgress()} />
        </div>

        {recentXP.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Recent XP Earned
            </h4>
            <ul className="space-y-2">
              {recentXP.map((item, i) => (
                <li key={i} className="text-sm flex justify-between items-center">
                  <span className="text-muted-foreground truncate max-w-[200px]">
                    {item.interviews?.title || "Interview"}
                  </span>
                  <span className="font-medium">+{item.xp_earned} XP</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
