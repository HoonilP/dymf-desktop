import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { GetCustomerSchema } from '@/types'
import { getCustomers } from '@/lib/customer'
import { S3Image } from '@/components/s3-image'

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
import { Skeleton } from '@/components/ui/skeleton'

const PAGE_SIZE = 20

const genderLabel: Record<string, string> = {
  man: '남성',
  woman: '여성',
  notdefinded: '-',
}

const loanTypeLabel: Record<string, string> = {
  special_loan: '특별대출',
  group_loan: '그룹대출',
  etc: '기타',
}

export default function CustomerSearchPage() {
  const navigate = useNavigate()

  const [customers, setCustomers] = useState<GetCustomerSchema[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // search filters
  const [nameFilter, setNameFilter] = useState('')
  const [nrcFilter, setNrcFilter] = useState('')

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const load = useCallback(
    async (targetPage: number, name: string, nrc_number: string) => {
      try {
        setLoading(true)
        setError(null)
        const result = await getCustomers({
          page: targetPage,
          limit: PAGE_SIZE,
          name: name || undefined,
          nrc_number: nrc_number || undefined,
        })
        setCustomers(result.data)
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
    load(1, '', '')
  }, [load])

  function handleSearch() {
    setPage(1)
    load(1, nameFilter, nrcFilter)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch()
  }

  function goPage(newPage: number) {
    setPage(newPage)
    load(newPage, nameFilter, nrcFilter)
  }

  function handleRowClick(customer: GetCustomerSchema) {
    navigate(`/registration/customer?id=${customer.id}`)
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>고객 검색</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search filters */}
          <div className="mb-4 flex items-end gap-3">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="search-name">
                이름
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
              <label className="text-sm font-medium" htmlFor="search-nrc">
                NRC 번호
              </label>
              <Input
                id="search-nrc"
                placeholder="NRC 번호 검색"
                value={nrcFilter}
                onChange={(e) => setNrcFilter(e.target.value)}
                onKeyDown={handleKeyDown}
              />
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
          ) : customers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {nameFilter || nrcFilter
                ? '검색 결과가 없습니다'
                : '등록된 고객이 없습니다'}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">No</TableHead>
                    <TableHead className="w-[60px]">사진</TableHead>
                    <TableHead>이름</TableHead>
                    <TableHead>NRC 번호</TableHead>
                    <TableHead>전화번호</TableHead>
                    <TableHead>성별</TableHead>
                    <TableHead>지역번호</TableHead>
                    <TableHead>대출유형</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c, idx) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(c)}
                    >
                      <TableCell>
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </TableCell>
                      <TableCell>
                        <S3Image entity="customer" filename={c.image} className="h-8 w-8" />
                      </TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.nrc_number}</TableCell>
                      <TableCell>{c.phone_number}</TableCell>
                      <TableCell>
                        {genderLabel[c.gender as unknown as string] ?? '-'}
                      </TableCell>
                      <TableCell>{c.cp_area_number || c.area_number}</TableCell>
                      <TableCell>
                        {loanTypeLabel[c.loan_type as unknown as string] ?? '-'}
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
