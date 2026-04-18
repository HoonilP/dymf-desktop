import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getLoan } from '@/lib/loan'

import { Button } from '@/components/ui/button'
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

const repaymentMethodLabel: Record<string, string> = {
  Equal: '원리금균등',
  Equal_Principal: '원금균등',
  Bullet: '만기일시',
}

export default function LoanDetailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const loanId = searchParams.get('id')

  const [loan, setLoan] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadLoan = useCallback(async (id: number) => {
    try {
      setLoading(true)
      setError(null)

      // First try normal schedules
      let data = await getLoan(id, false)
      if (!data) {
        setError('대출 정보를 찾을 수 없습니다')
        return
      }

      // If overdue, load overdue schedules
      if (Number(data.overdue_status)) {
        const overdueData = await getLoan(id, true)
        if (overdueData) {
          data = overdueData
        }
      }

      setLoan(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '데이터를 불러오지 못했습니다')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (loanId) {
      loadLoan(Number(loanId))
    }
  }, [loanId, loadLoan])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-6">
        <p className="text-muted-foreground">불러오는 중...</p>
      </div>
    )
  }

  if (error || !loan) {
    return (
      <div className="p-6">
        <div className="mb-4">
          <Button variant="outline" onClick={() => navigate('/search/loan')}>
            목록으로
          </Button>
        </div>
        <p className="text-sm text-destructive">{error || '대출 정보를 찾을 수 없습니다'}</p>
      </div>
    )
  }

  const isOverdue = Number(loan.overdue_status)
  const schedules = (loan.loan_schedules as Record<string, unknown>[]) || []
  const overdueSchedules = (loan.overdue_schedules as Record<string, unknown>[]) || []

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">대출 상세</h1>
        <Button variant="outline" onClick={() => navigate('/search/loan')}>
          목록으로
        </Button>
      </div>

      {/* Loan Info */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>대출 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">대출 번호</p>
              <p className="font-medium">{String(loan.id)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">대출 금액</p>
              <p className="font-medium">{Number(loan.loan_amount).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">계약일</p>
              <p className="font-medium">{String(loan.contract_date || '-')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">상환 방법</p>
              <p className="font-medium">
                {repaymentMethodLabel[String(loan.repayment_method)] || String(loan.repayment_method)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">상환 주기</p>
              <p className="font-medium">{String(loan.repayment_cycle)}일</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">이자율</p>
              <p className="font-medium">{(Number(loan.interest_rate) * 100).toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">상환 횟수</p>
              <p className="font-medium">{String(loan.number_of_repayment)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">연체 상태</p>
              {isOverdue ? (
                <Badge variant="destructive">연체</Badge>
              ) : (
                <Badge variant="secondary">정상</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Table */}
      {isOverdue ? (
        <Card>
          <CardHeader>
            <CardTitle>연체 스케줄</CardTitle>
          </CardHeader>
          <CardContent>
            {overdueSchedules.length === 0 ? (
              <p className="text-sm text-muted-foreground">연체 스케줄이 없습니다</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">No</TableHead>
                    <TableHead>납부일</TableHead>
                    <TableHead className="text-right">원금</TableHead>
                    <TableHead className="text-right">이자</TableHead>
                    <TableHead className="text-right">연체이자</TableHead>
                    <TableHead>처리 상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueSchedules.map((s, idx) => (
                    <TableRow key={String(s.id)}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{String(s.payment_date || '-')}</TableCell>
                      <TableCell className="text-right">
                        {Number(s.principal).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(s.interest).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(s.overdue_interest).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {s.transaction_id ? (
                          <Badge>처리됨</Badge>
                        ) : (
                          <Badge variant="outline">미처리</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>상환 스케줄</CardTitle>
          </CardHeader>
          <CardContent>
            {schedules.length === 0 ? (
              <p className="text-sm text-muted-foreground">상환 스케줄이 없습니다</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">회차</TableHead>
                    <TableHead>납부일</TableHead>
                    <TableHead className="text-right">원금</TableHead>
                    <TableHead className="text-right">이자</TableHead>
                    <TableHead className="text-right">합계</TableHead>
                    <TableHead className="text-right">잔액</TableHead>
                    <TableHead>상환 상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((s) => (
                    <TableRow key={String(s.id)}>
                      <TableCell>{String(s.period)}</TableCell>
                      <TableCell>{String(s.payment_date || '-')}</TableCell>
                      <TableCell className="text-right">
                        {Number(s.principal).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(s.interest).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(s.total).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(s.remaining_balance).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {Number(s.loan_payment_status) ? (
                          <Badge>완료</Badge>
                        ) : (
                          <Badge variant="outline">미납</Badge>
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
    </div>
  )
}
