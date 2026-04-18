import * as React from "react"
import { Link } from "react-router-dom"

import {
  Users,
  PenLine,
  Calculator,
  Folders,
  Search,
  CalendarClock,
  Calendar,
  MapPinCheckInside,
  HousePlus,
  UserRoundPlus,
  Settings,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavManagements } from "@/components/nav-management"
import { NavUser } from "@/components/nav-user"
import { useAuth } from "@/context/auth-context"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Registration",
      url: "#",
      icon: PenLine,
      items: [
        { title: "Customer", url: "/registration/customer" },
        { title: "Guarantor", url: "/registration/guarantor" },
        { title: "Loan", url: "/registration/loan" },
      ],
    },
    {
      title: "Search",
      url: "#",
      icon: Search,
      items: [
        { title: "Customer", url: "/search/customer" },
        { title: "Guarantor", url: "/search/guarantor" },
        { title: "Loan", url: "/search/loan" },
      ],
    },
    {
      title: "Repayment",
      url: "#",
      icon: Calendar,
      items: [
        { title: "Single", url: "/repayment/single" },
        { title: "Batch", url: "/repayment/batch" },
      ],
    },
    {
      title: "Overdue",
      url: "#",
      icon: CalendarClock,
      items: [
        { title: "Registration", url: "/overdue/registration" },
        { title: "Management", url: "/overdue/management" },
        { title: "Search", url: "/overdue/search" },
      ],
    },
  ],
  menus: [
    { name: "CP No.", url: "/cp", icon: MapPinCheckInside },
    { name: "Report", url: "/report", icon: Folders },
    { name: "HR", url: "/hr", icon: Users },
    { name: "Fixed Assets", url: "/fixed-assets", icon: HousePlus },
    { name: "Calculator", url: "/calculator", icon: Calculator },
    { name: "User", url: "/user", icon: UserRoundPlus },
    { name: "설정", url: "/settings", icon: Settings },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const username = user?.user_name ?? ""
  const userRole = user?.role ?? "paidUser"

  const filteredNavMain = data.navMain.map((nav) => {
    if (nav.title === "Overdue") {
      return {
        ...nav,
        items: nav.items.filter(
          (item) => userRole === "admin" || item.title !== "Registration"
        ),
      }
    }
    return nav
  })

  const filteredMenus = data.menus.filter(
    (menu) =>
      userRole !== "paidUser" ||
      !["User", "HR", "Report", "Fixed Assets"].includes(menu.name)
  )

  return (
    <Sidebar collapsible="icon" {...props}>
      <Link to="/home">
        <SidebarHeader className="pb-0">
          <span className="text-lg font-bold">DYMF</span>
        </SidebarHeader>
      </Link>

      <SidebarContent>
        <NavMain items={filteredNavMain} />
        <NavManagements menus={filteredMenus} />
      </SidebarContent>

      <SidebarTrigger className="ml-2.5" />
      <SidebarFooter>
        <NavUser username={username} userRole={userRole} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
