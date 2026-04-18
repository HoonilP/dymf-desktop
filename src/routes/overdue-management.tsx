import { useCallback, useEffect, useState } from 'react'
import { getLoans, getLoan, createOverdueTransaction, type CreateOverdueTransactionInput } from '@/lib/loan'

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
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface OverdueLoanRow {
  id: number
  customer_name: string
  customer_nrc_number: string
  loan_amount: number
  contract_date: string
}

interface OverdueScheduleRow {
  id: number
  principal: number
  interest: number
  overdue_interest: number
  payment_date: string
  transaction_id: number | null
  received_principal: number | null
  received_interest: number | null
  received_overdue_interest: number | null
}

export default function OverdueManagementPage() {
  // Overdue loan list
  const [loans, setLoans] = useState<OverdueLoanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Selected loan & overdue schedules
  const [selectedLoan, setSelectedLoan] = useState<OverdueLoanRow | null>(null)
  const [overdueSchedules, setOverdueSchedules] = useState<OverdueScheduleRow[]>([])
  const [scheduleLoading, setScheduleLoading] = useState(false)

  // Payment form
  const [payTarget, setPayTarget] = useState<OverdueScheduleRow | null>(null)
  const [receivedPrincipal, setReceivedPrincipal] = useState('')
  const [receivedInterest, setReceivedInterest] = useState('')
  const [receivedOverdueInterest, setReceivedOverdueInterest] = useState('')
  const [nextOverdueRate, setNextOverdueRate] = useState('')

  // Confirmation
  const [showConfirm, setShowConfirm] = useState(false)
  const [processing, setProcessing] = useState(false)

  const loadOverdueLoans = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await getLoans({ overdue_status: 1, limit: 100 })
      setLoans(result.data as unknown as OverdueLoanRow[])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '연체 대출 목록을 불러오지 못했습니다')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOverdueLoans()
  }, [loadOverdueLoans])

  const loadOverdueSchedules = useCallback(async (loanId: number) => {
    try {
      setScheduleLoading(true)
      const data = await getLoan(loanId, true)
      if (data && data.overdue_schedules) {
        setOverdueSchedules(data.overdue_schedules as unknown as OverdueScheduleRow[])
      } else {
        setOverdueSchedules([])
      }
    } catch {
      setOverdueSchedules([])
    } finally {
      setScheduleLoading(false)
    }
  }, [])

  function handleSelectLoan(loan: OverdueLoanRow) {
    setSelectedLoan(loan)
    setPayTarget(null)
    loadOverdueSchedules(loan.id)
  }

  function handlePayClick(schedule: OverdueScheduleRow) {
    setPayTarget(schedule)
    setReceivedPrincipal('')
    setReceivedInterest('')
    setReceivedOverdueInterest('')
    setNextOverdueRate('')
    setError(null)
  }

  function handleSubmitPayment() {
    if (!payTarget) return
    const rp = Number(receivedPrincipal) || 0
    const ri = Number(receivedInterest) || 0
    const roi = Number(receivedOverdueInterest) || 0
    const rate = Number(nextOverdueRate) || 0

    if (rp > payTarget.principal) {
      setError('수령 원금이 미상환 원금보다 큽니다.')
      return
    }
    if (ri > payTarget.interest) {
      setError('수령 이자가 미상환 이자보다 큽니다.')
      return
    }
    if (roi > payTarget.overdue_interest) {
      setError('수령 연체이자가 미상환 연체이자보다 큽니다.')
      return
    }
    if (rate <= 0) {
      setError('다음 주기 연체 이자율을 입력해주세요.')
      return
    }
    setShowConfirm(true)
  }

  async function handleConfirmPayment() {
    if (!payTarget || !selectedLoan) return
    try {
      setProcessing(true)
      setError(null)
      const dto: CreateOverdueTransactionInput = {
        received_principal: Number(receivedPrincipal) || 0,
        received_interest: Number(receivedInterest) || 0,
        received_overdue_interest: Number(receivedOverdueInterest) || 0,
        overdue_interest_rate: Number(nextOverdueRate) / 100,
      }
      await createOverdueTransaction(payTarget.id, dto)
      // Refresh
      setPayTarget(null)
      await loadOverdueSchedules(selectedLoan.id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '연체 상환 처리에 실패했습니다')
    } finally {
      setProcessing(false)
      setShowConfirm(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Overdue Loan List */}
      <Card>
        <CardHeader>
          <CardTitle>연체 관리</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-4 text-sm text-destructive">{error}</p>
          )}

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : loans.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              연체 대출이 없습니다
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">ID</TableHead>
                  <TableHead>고객명</TableHead>
                  <TableHead>NRC</TableHead>
                  <TableHead>대출금액</TableHead>
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
          )}
        </CardContent>
      </Card>

      {/* Overdue Schedule Chain */}
      {selectedLoan && (
        <Card>
          <CardHeader>
            <CardTitle>
              연체 스케줄 — {selectedLoan.customer_name} (대출 #{selectedLoan.id})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scheduleLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : overdueSchedules.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                연체 스케줄이 없습니다
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">ID</TableHead>
                    <TableHead>납부일</TableHead>
                    <TableHead>원금</TableHead>
                    <TableHead>이자</TableHead>
                    <TableHead>연체이자</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="w-[80px]">액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueSchedules.map((os) => (
                    <TableRow key={os.id}>
                      <TableCell>{os.id}</TableCell>
                      <TableCell>{os.payment_date}</TableCell>
                      <TableCell>{Number(os.principal).toLocaleString()}</TableCell>
                      <TableCell>{Number(os.interest).toLocaleString()}</TableCell>
                      <TableCell>{Number(os.overdue_interest).toLocaleString()}</TableCell>
                      <TableCell>
                        {os.transaction_id ? (
                          <Badge variant="secondary">
                            상환완료 (원금: {Number(os.received_principal).toLocaleString()}, 이자: {Number(os.received_interest).toLocaleString()}, 연체이자: {Number(os.received_overdue_interest).toLocaleString()})
                          </Badge>
                        ) : (
                          <Badge variant="destructive">미상환</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!os.transaction_id && (
                          <Button
                            size="sm"
                            onClick={() => handlePayClick(os)}
                          >
                            상환
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Form */}
      {payTarget && (
        <Card>
          <CardHeader>
            <CardTitle>연체 상환 — 스케줄 #{payTarget.id}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <span className="text-muted-foreground">미상환 원금: </span>
                <span className="font-medium">{Number(payTarget.principal).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">미상환 이자: </span>
                <span className="font-medium">{Number(payTarget.interest).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">미상환 연체이자: </span>
                <span className="font-medium">{Number(payTarget.overdue_interest).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">납부일: </span>
                <span className="font-medium">{payTarget.payment_date}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">수령 원금</label>
                <Input
                  type="number"
                  min="0"
                  max={payTarget.principal}
                  value={receivedPrincipal}
                  onChange={(e) => setReceivedPrincipal(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">수령 이자</label>
                <Input
                  type="number"
                  min="0"
                  max={payTarget.interest}
                  value={receivedInterest}
                  onChange={(e) => setReceivedInterest(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">수령 연체이자</label>
                <Input
                  type="number"
                  min="0"
                  max={payTarget.overdue_interest}
                  value={receivedOverdueInterest}
                  onChange={(e) => setReceivedOverdueInterest(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">다음 주기 연체이자율 (연 %)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={nextOverdueRate}
                  onChange={(e) => setNextOverdueRate(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={handleSubmitPayment}>상환 처리</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={(open) => !open && setShowConfirm(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>연체 상환 확인</AlertDialogTitle>
            <AlertDialogDescription>
              {payTarget && (
                <>
                  스케줄 #{payTarget.id} 연체 상환을 진행하시겠습니까?
                  <br />
                  수령 원금: {Number(receivedPrincipal || 0).toLocaleString()} / 수령 이자: {Number(receivedInterest || 0).toLocaleString()} / 수령 연체이자: {Number(receivedOverdueInterest || 0).toLocaleString()}
                  <br />
                  다음 주기 연체이자율: {nextOverdueRate}%
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPayment} disabled={processing}>
              {processing ? '처리 중...' : '상환 처리'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
