import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLoans, getLoan, changeOverdueState, createOverdueSchedule } from '@/lib/loan'

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
  overdue_status: number
}

export default function OverdueRegistrationPage() {
  const navigate = useNavigate()

  // Loan search
  const [searchQuery, setSearchQuery] = useState('')
  const [loans, setLoans] = useState<LoanRow[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Selected loan details
  const [selectedLoan, setSelectedLoan] = useState<LoanRow | null>(null)
  const [loanDetail, setLoanDetail] = useState<Record<string, unknown> | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Overdue form
  const [overdueInterestRate, setOverdueInterestRate] = useState('')

  // Confirmation dialog
  const [showConfirm, setShowConfirm] = useState(false)
  const [processing, setProcessing] = useState(false)

  const searchLoans = useCallback(async () => {
    try {
      setSearchLoading(true)
      setError(null)
      const result = await getLoans({
        name: searchQuery || undefined,
        overdue_status: 0,
        limit: 50,
      })
      setLoans(result.data as unknown as LoanRow[])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '대출 검색에 실패했습니다')
    } finally {
      setSearchLoading(false)
    }
  }, [searchQuery])

  const loadLoanDetail = useCallback(async (loanId: number) => {
    try {
      setDetailLoading(true)
      const data = await getLoan(loanId)
      setLoanDetail(data)
    } catch {
      setLoanDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  function handleSelectLoan(loan: LoanRow) {
    if (loan.overdue_status) {
      setError('이미 연체 상태인 대출입니다.')
      return
    }
    setSelectedLoan(loan)
    setLoanDetail(null)
    loadLoanDetail(loan.id)
  }

  function handleRegisterClick() {
    if (!overdueInterestRate || Number(overdueInterestRate) <= 0) {
      setError('연체 이자율을 입력해주세요.')
      return
    }
    setShowConfirm(true)
  }

  async function handleConfirmRegister() {
    if (!selectedLoan) return
    try {
      setProcessing(true)
      setError(null)
      await changeOverdueState(selectedLoan.id, true)
      await createOverdueSchedule(selectedLoan.id, Number(overdueInterestRate) / 100)
      navigate('/overdue/management')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '연체 등록에 실패했습니다')
    } finally {
      setProcessing(false)
      setShowConfirm(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') searchLoans()
  }

  // Compute unpaid schedule summary
  const schedules = (loanDetail?.loan_schedules ?? []) as {
    principal: number
    interest: number
    loan_payment_status: number
  }[]
  const unpaidSchedules = schedules.filter((s) => !s.loan_payment_status)
  const unpaidPrincipal = unpaidSchedules.reduce((sum, s) => sum + Number(s.principal), 0)
  const unpaidInterest = unpaidSchedules.reduce((sum, s) => sum + Number(s.interest), 0)

  return (
    <div className="p-6 space-y-6">
      {/* Loan Search */}
      <Card>
        <CardHeader>
          <CardTitle>연체 등록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-end gap-3">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="loan-search">
                고객명 검색 (정상 대출만)
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

          {error && (
            <p className="mb-4 text-sm text-destructive">{error}</p>
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

      {/* Loan Summary & Overdue Registration */}
      {selectedLoan && (
        <Card>
          <CardHeader>
            <CardTitle>
              대출 요약 — {selectedLoan.customer_name} (대출 #{selectedLoan.id})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {detailLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">대출금액: </span>
                    <span className="font-medium">
                      {Number(selectedLoan.loan_amount).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">미상환 원금: </span>
                    <span className="font-medium">{unpaidPrincipal.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">미상환 이자: </span>
                    <span className="font-medium">{unpaidInterest.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">미상환 회차: </span>
                    <span className="font-medium">{unpaidSchedules.length}건</span>
                  </div>
                </div>

                <div className="flex items-end gap-3 pt-4 border-t">
                  <div className="grid gap-1.5">
                    <label className="text-sm font-medium" htmlFor="overdue-rate">
                      연체 이자율 (연 %)
                    </label>
                    <Input
                      id="overdue-rate"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="예: 24"
                      value={overdueInterestRate}
                      onChange={(e) => setOverdueInterestRate(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleRegisterClick}>연체 등록</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={(open) => !open && setShowConfirm(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>연체 등록 확인</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedLoan && (
                <>
                  대출 #{selectedLoan.id} ({selectedLoan.customer_name})을 연체 상태로 변경하시겠습니까?
                  <br />
                  연체 이자율: {overdueInterestRate}%
                  <br />
                  미상환 원금: {unpaidPrincipal.toLocaleString()} / 미상환 이자: {unpaidInterest.toLocaleString()}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRegister} disabled={processing}>
              {processing ? '처리 중...' : '연체 등록'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
