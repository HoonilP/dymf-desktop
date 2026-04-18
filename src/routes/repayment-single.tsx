import { useCallback, useState } from 'react'
import { getLoans, getLoan, changeLoanScheduleState } from '@/lib/loan'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

const repaymentMethodLabel: Record<string, string> = {
  Equal: '원리금균등',
  Equal_Principal: '원금균등',
  Bullet: '만기일시',
}

interface LoanRow {
  id: number
  customer_name: string
  customer_nrc_number: string
  loan_amount: number
  repayment_method: string
  contract_date: string
}

interface ScheduleRow {
  id: number
  period: number
  payment_date: string
  principal: number
  interest: number
  total: number
  remaining_balance: number
  loan_payment_status: number
}

export default function RepaymentSinglePage() {
  // Loan search
  const [searchQuery, setSearchQuery] = useState('')
  const [loans, setLoans] = useState<LoanRow[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  // Selected loan & schedules
  const [selectedLoan, setSelectedLoan] = useState<LoanRow | null>(null)
  const [schedules, setSchedules] = useState<ScheduleRow[]>([])
  const [scheduleLoading, setScheduleLoading] = useState(false)

  // Confirmation dialog
  const [confirmTarget, setConfirmTarget] = useState<ScheduleRow | null>(null)
  const [processing, setProcessing] = useState(false)

  const searchLoans = useCallback(async () => {
    try {
      setSearchLoading(true)
      setSearchError(null)
      const result = await getLoans({
        name: searchQuery || undefined,
        limit: 50,
      })
      setLoans(result.data as unknown as LoanRow[])
    } catch (e: unknown) {
      setSearchError(e instanceof Error ? e.message : '대출 검색에 실패했습니다')
    } finally {
      setSearchLoading(false)
    }
  }, [searchQuery])

  const loadSchedules = useCallback(async (loanId: number) => {
    try {
      setScheduleLoading(true)
      const loanData = await getLoan(loanId)
      if (loanData && loanData.loan_schedules) {
        setSchedules(loanData.loan_schedules as unknown as ScheduleRow[])
      }
    } catch {
      setSchedules([])
    } finally {
      setScheduleLoading(false)
    }
  }, [])

  function handleSelectLoan(loan: LoanRow) {
    setSelectedLoan(loan)
    loadSchedules(loan.id)
  }

  async function handleConfirmRepay() {
    if (!confirmTarget) return
    try {
      setProcessing(true)
      await changeLoanScheduleState(confirmTarget.id, 1)
      // Refresh schedules
      if (selectedLoan) {
        await loadSchedules(selectedLoan.id)
      }
    } catch (e: unknown) {
      setSearchError(e instanceof Error ? e.message : '상환 처리에 실패했습니다')
    } finally {
      setProcessing(false)
      setConfirmTarget(null)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') searchLoans()
  }

  const unpaidSchedules = schedules.filter((s) => !s.loan_payment_status)

  return (
    <div className="p-6 space-y-6">
      {/* Loan Search */}
      <Card>
        <CardHeader>
          <CardTitle>개별 상환</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-end gap-3">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="loan-search">
                고객명 / 대출 검색
              </label>
              <Input
                id="loan-search"
                placeholder="고객명으로 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <Button onClick={searchLoans}>검색</Button>
          </div>

          {searchError && (
            <p className="mb-4 text-sm text-destructive">{searchError}</p>
          )}

          {searchLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : loans.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">ID</TableHead>
                  <TableHead>고객명</TableHead>
                  <TableHead>NRC</TableHead>
                  <TableHead>대출금액</TableHead>
                  <TableHead>상환방식</TableHead>
                  <TableHead>계약일</TableHead>
                  <TableHead className="w-[80px]">선택</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((loan) => (
                  <TableRow
                    key={loan.id}
                    className={selectedLoan?.id === loan.id ? 'bg-muted/50' : ''}
                  >
                    <TableCell>{loan.id}</TableCell>
                    <TableCell className="font-medium">{loan.customer_name}</TableCell>
                    <TableCell>{loan.customer_nrc_number}</TableCell>
                    <TableCell>{Number(loan.loan_amount).toLocaleString()}</TableCell>
                    <TableCell>
                      {repaymentMethodLabel[loan.repayment_method] ?? loan.repayment_method}
                    </TableCell>
                    <TableCell>{loan.contract_date}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={selectedLoan?.id === loan.id ? 'default' : 'outline'}
                        onClick={() => handleSelectLoan(loan)}
                      >
                        선택
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>

      {/* Schedule Table */}
      {selectedLoan && (
        <Card>
          <CardHeader>
            <CardTitle>
              미상환 스케줄 — {selectedLoan.customer_name} (대출 #{selectedLoan.id})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scheduleLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : unpaidSchedules.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                미상환 스케줄이 없습니다
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">회차</TableHead>
                    <TableHead>납부일</TableHead>
                    <TableHead>원금</TableHead>
                    <TableHead>이자</TableHead>
                    <TableHead>합계</TableHead>
                    <TableHead>잔액</TableHead>
                    <TableHead className="w-[80px]">상환</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unpaidSchedules.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.period}</TableCell>
                      <TableCell>{s.payment_date}</TableCell>
                      <TableCell>{Number(s.principal).toLocaleString()}</TableCell>
                      <TableCell>{Number(s.interest).toLocaleString()}</TableCell>
                      <TableCell>{Number(s.total).toLocaleString()}</TableCell>
                      <TableCell>{Number(s.remaining_balance).toLocaleString()}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => setConfirmTarget(s)}
                        >
                          상환
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>상환 확인</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget && (
                <>
                  {confirmTarget.period}회차 스케줄을 상환 처리하시겠습니까?
                  <br />
                  원금: {Number(confirmTarget.principal).toLocaleString()}원 / 이자: {Number(confirmTarget.interest).toLocaleString()}원 / 합계: {Number(confirmTarget.total).toLocaleString()}원
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRepay} disabled={processing}>
              {processing ? '처리 중...' : '상환 처리'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
