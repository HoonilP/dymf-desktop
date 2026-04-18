import { useCallback, useEffect, useState } from 'react'
import { getOverdueSchedules } from '@/lib/loan'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

const PAGE_SIZE = 20

export default function OverdueSearchPage() {
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [nameFilter, setNameFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const load = useCallback(
    async (
      targetPage: number,
      name: string,
      start_date: string,
      end_date: string
    ) => {
      try {
        setLoading(true)
        setError(null)
        const result = await getOverdueSchedules({
          page: targetPage,
          limit: PAGE_SIZE,
          name: name || undefined,
          start_date: start_date || undefined,
          end_date: end_date || undefined,
        })
        setData(result.data)
        setTotal(result.total)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : '데이터를 불러오지 못했습니다')
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    load(1, '', '', '')
  }, [load])

  function handleSearch() {
    setPage(1)
    load(1, nameFilter, startDate, endDate)
  }

  function handlePageChange(newPage: number) {
    setPage(newPage)
    load(newPage, nameFilter, startDate, endDate)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>연체 조회</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="name-filter">
                고객명
              </label>
              <Input
                id="name-filter"
                placeholder="고객명으로 검색"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="start-date">
                시작일
              </label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="end-date">
                종료일
              </label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button onClick={handleSearch}>검색</Button>
          </div>

          {error && (
            <p className="mb-4 text-sm text-destructive">{error}</p>
          )}

          {/* Table */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              연체 스케줄이 없습니다
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">ID</TableHead>
                    <TableHead>대출 ID</TableHead>
                    <TableHead>고객명</TableHead>
                    <TableHead>NRC</TableHead>
                    <TableHead>납부일</TableHead>
                    <TableHead>원금</TableHead>
                    <TableHead>이자</TableHead>
                    <TableHead>연체이자</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => (
                    <TableRow key={row.id as number}>
                      <TableCell>{row.id as number}</TableCell>
                      <TableCell>{row.loan_id as number}</TableCell>
                      <TableCell className="font-medium">
                        {(row.customer_name as string) ?? '-'}
                      </TableCell>
                      <TableCell>{(row.customer_nrc_number as string) ?? '-'}</TableCell>
                      <TableCell>{row.payment_date as string}</TableCell>
                      <TableCell>{Number(row.principal).toLocaleString()}</TableCell>
                      <TableCell>{Number(row.interest).toLocaleString()}</TableCell>
                      <TableCell>{Number(row.overdue_interest).toLocaleString()}</TableCell>
                      <TableCell>
                        {row.transaction_id ? (
                          <Badge variant="secondary">상환완료</Badge>
                        ) : (
                          <Badge variant="destructive">미상환</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  총 {total}건 (페이지 {page}/{totalPages})
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => handlePageChange(page - 1)}
                  >
                    이전
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => handlePageChange(page + 1)}
                  >
                    다음
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
