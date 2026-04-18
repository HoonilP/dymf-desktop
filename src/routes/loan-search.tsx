import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLoans } from '@/lib/loan'

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
import { Skeleton } from '@/components/ui/skeleton'

const PAGE_SIZE = 20

const repaymentMethodLabel: Record<string, string> = {
  Equal: '원리금균등',
  Equal_Principal: '원금균등',
  Bullet: '만기일시',
}

const loanTypeFilterOptions = [
  { value: '__all__', label: '전체' },
  { value: 'special_loan', label: '특별대출' },
  { value: 'group_loan', label: '그룹대출' },
  { value: 'etc', label: '기타' },
]

const overdueFilterOptions = [
  { value: '__all__', label: '전체' },
  { value: '0', label: '정상' },
  { value: '1', label: '연체' },
]

export default function LoanSearchPage() {
  const navigate = useNavigate()

  const [loans, setLoans] = useState<Record<string, unknown>[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [nameFilter, setNameFilter] = useState('')
  const [overdueFilter, setOverdueFilter] = useState('__all__')
  const [loanTypeFilter, setLoanTypeFilter] = useState('__all__')

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const load = useCallback(
    async (targetPage: number, name: string, overdue: string, loanType: string) => {
      try {
        setLoading(true)
        setError(null)
        const result = await getLoans({
          page: targetPage,
          limit: PAGE_SIZE,
          name: name || undefined,
          overdue_status: overdue !== '__all__' ? Number(overdue) : undefined,
          loan_type: loanType !== '__all__' ? loanType : undefined,
        })
        setLoans(result.data)
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
    load(1, '', '__all__', '__all__')
  }, [load])

  function handleSearch() {
    setPage(1)
    load(1, nameFilter, overdueFilter, loanTypeFilter)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch()
  }

  function goPage(newPage: number) {
    setPage(newPage)
    load(newPage, nameFilter, overdueFilter, loanTypeFilter)
  }

  function handleRowClick(loan: Record<string, unknown>) {
    navigate(`/loan/detail?id=${loan.id}`)
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>대출 검색</CardTitle>
            <Button onClick={() => navigate('/registration/loan')}>
              신규 대출 등록
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search filters */}
          <div className="mb-4 flex items-end gap-3">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="search-name">
                고객명
              </label>
              <Input
                id="search-name"
                placeholder="이름 검색"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">연체 상태</label>
              <Select value={overdueFilter} onValueChange={setOverdueFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {overdueFilterOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">대출 유형</label>
              <Select value={loanTypeFilter} onValueChange={setLoanTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {loanTypeFilterOptions.map((opt) => (
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

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : loans.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {nameFilter || overdueFilter !== '__all__' || loanTypeFilter !== '__all__'
                ? '검색 결과가 없습니다'
                : '등록된 대출이 없습니다'}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">No</TableHead>
                    <TableHead>고객명</TableHead>
                    <TableHead className="text-right">대출 금액</TableHead>
                    <TableHead>계약일</TableHead>
                    <TableHead>상환 방법</TableHead>
                    <TableHead>연체 상태</TableHead>
                    <TableHead>대출 상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map((loan, idx) => (
                    <TableRow
                      key={String(loan.id)}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(loan)}
                    >
                      <TableCell>
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {String(loan.customer_name || '-')}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(loan.loan_amount).toLocaleString()}
                      </TableCell>
                      <TableCell>{String(loan.contract_date || '-')}</TableCell>
                      <TableCell>
                        {repaymentMethodLabel[String(loan.repayment_method)] || String(loan.repayment_method)}
                      </TableCell>
                      <TableCell>
                        {Number(loan.overdue_status) ? (
                          <Badge variant="destructive">연체</Badge>
                        ) : (
                          <Badge variant="secondary">정상</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {String(loan.loan_state || '-')}
                      </TableCell>
                    </TableRow>
                  ))}
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
    </div>
  )
}
