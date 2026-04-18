import { useCallback, useEffect, useState } from 'react'
import type {
  LoanPortfolioRow,
  RepaymentSummaryRow,
  OverdueSummaryRow,
  CustomerLoanSummaryRow,
} from '@/types'
import {
  getLoanPortfolioSummary,
  getRepaymentSummary,
  getOverdueSummary,
  getCustomerLoanSummary,
} from '@/lib/report'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
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

const loanTypeLabel = (type: string) => {
  switch (type) {
    case 'special_loan': return '특별 대출'
    case 'group_loan': return '그룹 대출'
    default: return '기타'
  }
}

export default function ReportPage() {
  const [portfolio, setPortfolio] = useState<LoanPortfolioRow[]>([])
  const [repayment, setRepayment] = useState<RepaymentSummaryRow[]>([])
  const [overdue, setOverdue] = useState<OverdueSummaryRow[]>([])
  const [customerLoans, setCustomerLoans] = useState<CustomerLoanSummaryRow[]>([])

  const [portfolioLoading, setPortfolioLoading] = useState(true)
  const [repaymentLoading, setRepaymentLoading] = useState(true)
  const [overdueLoading, setOverdueLoading] = useState(true)
  const [customerLoading, setCustomerLoading] = useState(true)

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    getLoanPortfolioSummary()
      .then(setPortfolio)
      .finally(() => setPortfolioLoading(false))
  }, [])

  const loadRepayment = useCallback(async () => {
    setRepaymentLoading(true)
    try {
      const data = await getRepaymentSummary(
        startDate || undefined,
        endDate || undefined
      )
      setRepayment(data)
    } finally {
      setRepaymentLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    loadRepayment()
  }, [loadRepayment])

  useEffect(() => {
    getOverdueSummary()
      .then(setOverdue)
      .finally(() => setOverdueLoading(false))
  }, [])

  useEffect(() => {
    getCustomerLoanSummary()
      .then(setCustomerLoans)
      .finally(() => setCustomerLoading(false))
  }, [])

  return (
    <div className="space-y-6 p-6">
      {/* 대출 포트폴리오 요약 */}
      <Card>
        <CardHeader>
          <CardTitle>대출 포트폴리오 요약</CardTitle>
          <CardDescription>대출 유형별 현황을 확인합니다</CardDescription>
        </CardHeader>
        <CardContent>
          {portfolioLoading ? (
            <p className="text-sm text-muted-foreground">불러오는 중...</p>
          ) : portfolio.length === 0 ? (
            <p className="text-sm text-muted-foreground">데이터가 없습니다</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>대출 유형</TableHead>
                  <TableHead className="text-right">건수</TableHead>
                  <TableHead className="text-right">총 대출액</TableHead>
                  <TableHead className="text-right">평균 이자율</TableHead>
                  <TableHead className="text-right">연체 건수</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {portfolio.map((row) => (
                  <TableRow key={row.loan_type}>
                    <TableCell className="font-medium">{loanTypeLabel(row.loan_type)}</TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                    <TableCell className="text-right">{row.total_amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{(row.avg_interest_rate * 100).toFixed(1)}%</TableCell>
                    <TableCell className="text-right">{row.overdue_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 상환 현황 */}
      <Card>
        <CardHeader>
          <CardTitle>상환 현황</CardTitle>
          <CardDescription>월별 상환 스케줄 및 수금율을 확인합니다</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2 items-end">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">시작일</p>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div>
              <p className="mb-1 text-sm text-muted-foreground">종료일</p>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <Button variant="outline" onClick={loadRepayment}>조회</Button>
          </div>
          {repaymentLoading ? (
            <p className="text-sm text-muted-foreground">불러오는 중...</p>
          ) : repayment.length === 0 ? (
            <p className="text-sm text-muted-foreground">데이터가 없습니다</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>기간</TableHead>
                  <TableHead className="text-right">스케줄 건수</TableHead>
                  <TableHead className="text-right">상환 건수</TableHead>
                  <TableHead className="text-right">총 원금</TableHead>
                  <TableHead className="text-right">총 이자</TableHead>
                  <TableHead className="text-right">수금율</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repayment.map((row) => (
                  <TableRow key={row.period_label}>
                    <TableCell className="font-medium">{row.period_label}</TableCell>
                    <TableCell className="text-right">{row.scheduled_count}</TableCell>
                    <TableCell className="text-right">{row.paid_count}</TableCell>
                    <TableCell className="text-right">{row.total_principal.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{row.total_interest.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{row.collection_rate}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 연체 요약 */}
      <Card>
        <CardHeader>
          <CardTitle>연체 요약</CardTitle>
          <CardDescription>현재 연체 중인 대출 현황을 확인합니다</CardDescription>
        </CardHeader>
        <CardContent>
          {overdueLoading ? (
            <p className="text-sm text-muted-foreground">불러오는 중...</p>
          ) : overdue.length === 0 ? (
            <p className="text-sm text-muted-foreground">연체 내역이 없습니다</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>고객명</TableHead>
                  <TableHead className="text-right">대출 ID</TableHead>
                  <TableHead className="text-right">연체 금액</TableHead>
                  <TableHead className="text-right">연체 일수</TableHead>
                  <TableHead className="text-right">연체 이자</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdue.map((row, i) => (
                  <TableRow key={`${row.loan_id}-${i}`}>
                    <TableCell className="font-medium">{row.customer_name}</TableCell>
                    <TableCell className="text-right">{row.loan_id}</TableCell>
                    <TableCell className="text-right">{row.overdue_amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{row.overdue_days}</TableCell>
                    <TableCell className="text-right">{row.overdue_interest.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 고객별 대출 현황 */}
      <Card>
        <CardHeader>
          <CardTitle>고객별 대출 현황</CardTitle>
          <CardDescription>고객별 대출 건수 및 총 대출액을 확인합니다</CardDescription>
        </CardHeader>
        <CardContent>
          {customerLoading ? (
            <p className="text-sm text-muted-foreground">불러오는 중...</p>
          ) : customerLoans.length === 0 ? (
            <p className="text-sm text-muted-foreground">데이터가 없습니다</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>고객명</TableHead>
                  <TableHead className="text-right">고객 ID</TableHead>
                  <TableHead className="text-right">대출 건수</TableHead>
                  <TableHead className="text-right">총 대출액</TableHead>
                  <TableHead className="text-right">연체 건수</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerLoans.map((row) => (
                  <TableRow key={row.customer_id}>
                    <TableCell className="font-medium">{row.customer_name}</TableCell>
                    <TableCell className="text-right">{row.customer_id}</TableCell>
                    <TableCell className="text-right">{row.loan_count}</TableCell>
                    <TableCell className="text-right">{row.total_amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{row.overdue_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
