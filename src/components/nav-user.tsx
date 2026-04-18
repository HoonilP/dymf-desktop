import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import { LogOut } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/context/auth-context"

export function NavUser({
  username,
  userRole,
}: {
  username: string
  userRole: string
}) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          {userRole === "admin" ? (
            <Avatar className="h-8 w-[60px] rounded-lg">
              <AvatarFallback className="rounded-lg bg-[#CD5C5C] text-white">
                Admin
              </AvatarFallback>
            </Avatar>
          ) : (
            <Avatar className="h-8 w-[50px] rounded-lg">
              <AvatarFallback className="rounded-lg bg-[#0067A3] text-white">
                User
              </AvatarFallback>
            </Avatar>
          )}
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{username}</span>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <LogOut
                className="cursor-pointer"
                onClick={() => setIsDialogOpen(true)}
              />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Logout</DialogTitle>
                <DialogDescription>
                  Are you sure you want to log out?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="secondary"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleLogout}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  Confirm
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
