"use client"

import { Button } from "@/components/ui/button"
import { MoonIcon, SunIcon, LayoutDashboard, BookOpen } from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function Header() {
  const { setTheme, theme } = useTheme()
  const pathname = usePathname()

  const routes = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
      active: pathname === "/dashboard",
    },
    {
      href: "/tests",
      label: "Available Tests",
      icon: <BookOpen className="mr-2 h-4 w-4" />,
      active: pathname === "/tests",
    },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="container flex h-16 items-center justify-between py-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl font-bold">MockInterview</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "flex items-center text-sm font-medium transition-colors hover:text-primary",
                route.active ? "text-black dark:text-white" : "text-muted-foreground",
              )}
            >
              {route.icon}
              {route.label}
            </Link>
          ))}
          <Link
            href="/recruiter"
            className="flex items-center text-sm font-medium transition-colors hover:text-primary text-muted-foreground"
          >
            Recruiter Portal
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <SunIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <MoonIcon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </div>
      </div>
    </header>
  )
}
