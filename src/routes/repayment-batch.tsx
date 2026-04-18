import { useCallback, useState } from 'react'
import { getLoanSchedules, changeLoanScheduleState } from '@/lib/loan'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'

const PAGE_SIZE = 20

const paymentStatusOptions = [
  { value: 'unpaid', label: '미상환만' },
  { value: 'all', label: '전체' },
]

interface ScheduleRow {
  id: number
  period: number
  payment_date: string
  principal: number
  interest: number
  total: number
  remaining_balance: number
  loan_payment_status: number
  loan_id: number
  customer_id: number
  customer_name: string
  customer_nrc_number: string
}

export default function RepaymentBatchPage() {
  // Filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [statusFilter, setStatusFilter] = useState('unpaid')

  // Data
  const [schedules, setSchedules] = useState<ScheduleRow[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // Batch processing
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const load = useCallback(
    async (targetPage: number) => {
      try {
        setLoading(true)
        setError(null)
        const result = await getLoanSchedules({
          page: targetPage,
          page_size: PAGE_SIZE,
          get_start_date: startDate || undefined,
          get_last_date: endDate || undefined,
          loan_payment_status: statusFilter === 'unpaid' ? 0 : undefined,
        })
        setSchedules(result.data as unknown as ScheduleRow[])
        setTotalPages(result.total_pages)
        setTotalCount(result.count)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : '데이터를 불러오지 못했습니다')
      } finally {
        setLoading(false)
      }
    },
    [startDate, endDate, statusFilter]
  )

  function handleSearch() {
    setPage(1)
    setSelectedIds(new Set())
    load(1)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch()
  }

  function goPage(newPage: number) {
    setPage(newPage)
    setSelectedIds(new Set())
    load(newPage)
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleSelectAll() {
    const unpaid = schedules.filter((s) => !s.loan_payment_status)
    if (selectedIds.size === unpaid.length && unpaid.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(unpaid.map((s) => s.id)))
    }
  }

  async function handleBatchRepay() {
    const ids = Array.from(selectedIds)
    setProcessing(true)
    setProgress({ current: 0, total: ids.length })

    try {
      for (let i = 0; i < ids.length; i++) {
        await changeLoanScheduleState(ids[i], 1)
        setProgress({ current: i + 1, total: ids.length })
      }
      // Refresh after batch
      setSelectedIds(new Set())
      await load(page)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '일괄 상환 처리 중 오류가 발생했습니다')
    } finally {
      setProcessing(false)
      setConfirmOpen(false)
    }
  }

  const unpaidOnPage = schedules.filter((s) => !s.loan_payment_status)
  const allUnpaidSelected = unpaidOnPage.length > 0 && selectedIds.size === unpaidOnPage.length

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>일괄 상환</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="start-date">
                시작일
              </label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                onKeyDown={handleKeyDown}
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
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">상환 상태</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentStatusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSearch}>검색</Button>
          </div>

          {error && (
            <p className="mb-4 text-sm text-destructive">{error}</p>
          )}

          {/* Batch action bar */}
          {selectedIds.size > 0 && (
            <div className="mb-4 flex items-center gap-3 rounded-md border bg-muted/30 p-3">
              <span className="text-sm font-medium">
                {selectedIds.size}건 선택됨
              </span>
              <Button onClick={() => setConfirmOpen(true)} disabled={processing}>
                {processing
                  ? `처리 중 (${progress.current}/${progress.total})`
                  : '일괄 상환'}
              </Button>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : schedules.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              검색 결과가 없습니다
            </p>
          ) : (
            <>
              <div className="mb-2 text-sm text-muted-foreground">
                총 {totalCount}건
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <input
                        type="checkbox"
                        checked={allUnpaidSelected}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableHead>
                    <TableHead>고객명</TableHead>
                    <TableHead>NRC</TableHead>
                    <TableHead className="w-[60px]">대출ID</TableHead>
                    <TableHead className="w-[50px]">회차</TableHead>
                    <TableHead>납부일</TableHead>
                    <TableHead>원금</TableHead>
                    <TableHead>이자</TableHead>
                    <TableHead>합계</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((s) => {
                    const isPaid = !!s.loan_payment_status
                    return (
                      <TableRow key={s.id} className={isPaid ? 'opacity-50' : ''}>
                        <TableCell>
                          {!isPaid && (
                            <input
                              type="checkbox"
                              checked={selectedIds.has(s.id)}
                              onChange={() => toggleSelect(s.id)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{s.customer_name}</TableCell>
                        <TableCell>{s.customer_nrc_number}</TableCell>
                        <TableCell>{s.loan_id}</TableCell>
                        <TableCell>{s.period}</TableCell>
                        <TableCell>{s.payment_date}</TableCell>
                        <TableCell>{Number(s.principal).toLocaleString()}</TableCell>
                        <TableCell>{Number(s.interest).toLocaleString()}</TableCell>
                        <TableCell>{Number(s.total).toLocaleString()}</TableCell>
                        <TableCell>
                          {isPaid ? (
                            <span className="text-xs text-green-600 font-medium">상환완료</span>
                          ) : (
                            <span className="text-xs text-amber-600 font-medium">미상환</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => goPage(page - 1)}
                >
                  이전
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => goPage(page + 1)}
                >
                  다음
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={(open) => !open && !processing && setConfirmOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>일괄 상환 확인</AlertDialogTitle>
            <AlertDialogDescription>
              선택한 {selectedIds.size}건의 스케줄을 일괄 상환 처리하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchRepay} disabled={processing}>
              {processing
                ? `처리 중 (${progress.current}/${progress.total})`
                : '일괄 상환 처리'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
