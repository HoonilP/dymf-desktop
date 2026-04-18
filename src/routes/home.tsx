import { useEffect, useState } from "react"
import { getDb } from "@/lib/database"

export default function HomePage() {
  const [tables, setTables] = useState<string[]>([])

  useEffect(() => {
    getDb()
      .then(async (db) => {
        const rows = await db.select<{ name: string }[]>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_sqlx_%' ORDER BY name"
        )
        const names = rows.map((r) => r.name)
        console.log("DB tables:", names)
        setTables(names)
      })
      .catch((err) => console.error("Database.load error:", err))
  }, [])

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-bold">DYMF Desktop</h1>
      <p className="text-muted-foreground">{tables.length} tables loaded</p>
    </div>
  )
}
