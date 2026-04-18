import { type LucideIcon, Moon, Sun } from "lucide-react"
import { Link } from "react-router-dom"
import { useState, useEffect } from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

function useThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light")

  useEffect(() => {
    const root = document.documentElement
    if (theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      root.classList.toggle("dark", prefersDark)
    } else {
      root.classList.toggle("dark", theme === "dark")
    }
  }, [theme])

  return { theme, setTheme }
}

export function NavManagements({
  menus,
}: {
  menus: {
    name: string
    url: string
    icon: LucideIcon
  }[]
}) {
  const { setTheme } = useThemeToggle()

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Management</SidebarGroupLabel>
      <SidebarMenu>
        {menus.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild>
              <Link to={item.url}>
                <item.icon />
                <span>{item.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}

        <br />

        <SidebarGroupLabel>Settings</SidebarGroupLabel>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center justify-between text-sm text-sidebar-foreground/100 rounded-md px-2 py-2 hover:bg-sidebar-accent transition">
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4 dark:hidden" />
                  <Moon className="h-4 w-4 hidden dark:block" />
                  <span>Theme</span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-full rounded-md shadow-md" style={{ minWidth: '16rem' }}>
              <DropdownMenuItem className="cursor-pointer" onClick={() => setTheme("light")}>Light</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => setTheme("system")}>System</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
