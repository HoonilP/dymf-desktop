import { useLocation } from "react-router-dom"

export default function PlaceholderPage() {
  const location = useLocation()

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4">
      <h1 className="text-xl font-semibold">{location.pathname}</h1>
      <p className="text-muted-foreground">This page is under construction.</p>
    </div>
  )
}
