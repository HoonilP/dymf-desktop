import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCustomers } from '@/lib/customer'
import {
  createLoan,
  createCollateral,
  getRepaymentSchedule,
  getGuarantors,
  getLoanOfficers,
  type ScheduleItem,
  type CreateCollateralInput,
} from '@/lib/loan'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

const repaymentMethodOptions = [
  { value: 'Equal', label: '원리금균등' },
  { value: 'Equal_Principal', label: '원금균등' },
  { value: 'Bullet', label: '만기일시' },
]

const collateralTypeOptions = [
  { value: 'Property', label: '부동산' },
  { value: 'Car', label: '차량' },
]

interface CollateralForm {
  type: string
  name: string
  detail: string
  price: string
}

const emptyCollateral: CollateralForm = { type: 'Property', name: '', detail: '', price: '' }

interface FormData {
  customer_id: string
  loan_officer_id: string
  loan_amount: string
  contract_date: string
  repayment_cycle: string
  interest_rate: string
  number_of_repayment: string
  repayment_method: string
}

const emptyForm: FormData = {
  customer_id: '',
  loan_officer_id: '',
  loan_amount: '',
  contract_date: new Date().toISOString().split('T')[0],
  repayment_cycle: '30',
  interest_rate: '',
  number_of_repayment: '',
  repayment_method: 'Equal',
}

export default function LoanRegistrationPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState<FormData>({ ...emptyForm })
  const [collaterals, setCollaterals] = useState<CollateralForm[]>([])
  const [guarantorIds, setGuarantorIds] = useState<number[]>([])
  const [schedule, setSchedule] = useState<ScheduleItem[]>([])

  const [customers, setCustomers] = useState<{ id: number; name: string; nrc_number: string }[]>([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [guarantorList, setGuarantorList] = useState<Record<string, unknown>[]>([])
  const [officerList, setOfficerList] = useState<Record<string, unknown>[]>([])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load reference data
  useEffect(() => {
    getGuarantors().then(setGuarantorList).catch(() => {})
    getLoanOfficers().then(setOfficerList).catch(() => {})
  }, [])

  // Customer search
  const searchCustomers = useCallback(async (name: string) => {
    if (!name.trim()) {
      setCustomers([])
      return
    }
    try {
      const result = await getCustomers({ name, limit: 10 })
      setCustomers(
        result.data.map((c) => ({ id: c.id, name: c.name, nrc_number: c.nrc_number }))
      )
    } catch {
      setCustomers([])
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => searchCustomers(customerSearch), 300)
    return () => clearTimeout(timer)
  }, [customerSearch, searchCustomers])

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // Collateral handlers
  function addCollateral() {
    setCollaterals((prev) => [...prev, { ...emptyCollateral }])
  }

  function updateCollateral(index: number, field: keyof CollateralForm, value: string) {
    setCollaterals((prev) => {
      const arr = [...prev]
      arr[index] = { ...arr[index], [field]: value }
      return arr
    })
  }

  function removeCollateral(index: number) {
    setCollaterals((prev) => prev.filter((_, i) => i !== index))
  }

  // Guarantor handlers
  function addGuarantor(id: number) {
    if (!guarantorIds.includes(id)) {
      setGuarantorIds((prev) => [...prev, id])
    }
  }

  function removeGuarantor(id: number) {
    setGuarantorIds((prev) => prev.filter((gid) => gid !== id))
  }

  // Schedule preview
  function handlePreviewSchedule() {
    setError(null)
    try {
      const items = getRepaymentSchedule({
        loan_amount: Number(form.loan_amount),
        number_of_repayment: Number(form.number_of_repayment),
        interest_rate: Number(form.interest_rate) / 100,
        repayment_cycle: Number(form.repayment_cycle),
        contract_date: form.contract_date,
        repayment_method: form.repayment_method,
      })
      setSchedule(items)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '스케줄 생성에 실패했습니다')
    }
  }

  // Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.customer_id) {
      setError('고객을 선택해 주세요')
      return
    }
    if (!form.loan_officer_id) {
      setError('대출 담당자를 선택해 주세요')
      return
    }
    if (!form.loan_amount || Number(form.loan_amount) <= 0) {
      setError('대출 금액을 입력해 주세요')
      return
    }
    if (!form.interest_rate || Number(form.interest_rate) <= 0) {
      setError('이자율을 입력해 주세요')
      return
    }
    if (!form.number_of_repayment || Number(form.number_of_repayment) <= 0) {
      setError('상환 횟수를 입력해 주세요')
      return
    }

    try {
      setSaving(true)

      // Create collaterals first, collect IDs
      const collateralIds: number[] = []
      for (const c of collaterals) {
        if (c.name.trim()) {
          const input: CreateCollateralInput = {
            type: c.type,
            name: c.name,
            detail: c.detail,
            price: c.price ? Number(c.price) : undefined,
          }
          const id = await createCollateral(input)
          collateralIds.push(id)
        }
      }

      await createLoan({
        customer_id: Number(form.customer_id),
        loan_officer_id: Number(form.loan_officer_id),
        loan_amount: Number(form.loan_amount),
        repayment_cycle: Number(form.repayment_cycle),
        interest_rate: Number(form.interest_rate) / 100,
        contract_date: form.contract_date,
        number_of_repayment: Number(form.number_of_repayment),
        repayment_method: form.repayment_method,
        collateral_ids: collateralIds.length > 0 ? collateralIds : undefined,
        guarantor_ids: guarantorIds.length > 0 ? guarantorIds : undefined,
      })

      navigate('/search/loan')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '대출 등록에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  const selectedCustomer = customers.find((c) => String(c.id) === form.customer_id)

  return (
    <div className="p-6">
      <form onSubmit={handleSubmit}>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">대출 등록</h1>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/search/loan')}
            >
              취소
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? '등록 중...' : '등록'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Section 1: Basic Loan Info */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>대출 기본정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {/* Customer search */}
              <div className="col-span-2 grid gap-1.5">
                <Label>고객 *</Label>
                {selectedCustomer ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {selectedCustomer.name} ({selectedCustomer.nrc_number})
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setField('customer_id', '')
                        setCustomerSearch('')
                      }}
                    >
                      변경
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      placeholder="고객 이름 검색"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                    />
                    {customers.length > 0 && !form.customer_id && (
                      <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover shadow-md">
                        {customers.map((c) => (
                          <div
                            key={c.id}
                            className="cursor-pointer px-3 py-2 text-sm hover:bg-accent"
                            onClick={() => {
                              setField('customer_id', String(c.id))
                              setCustomerSearch(c.name)
                            }}
                          >
                            {c.name} ({c.nrc_number})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="col-span-2 grid gap-1.5">
                <Label>대출 담당자 *</Label>
                <Select
                  value={form.loan_officer_id}
                  onValueChange={(v) => setField('loan_officer_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="담당자 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {officerList.map((o) => (
                      <SelectItem key={String(o.id)} value={String(o.id)}>
                        {String(o.name || `담당자 #${o.id}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 grid gap-1.5">
                <Label htmlFor="loan_amount">대출 금액 *</Label>
                <Input
                  id="loan_amount"
                  type="number"
                  value={form.loan_amount}
                  onChange={(e) => setField('loan_amount', e.target.value)}
                  placeholder="금액 입력"
                />
              </div>

              <div className="col-span-2 grid gap-1.5">
                <Label htmlFor="contract_date">계약일 *</Label>
                <Input
                  id="contract_date"
                  type="date"
                  value={form.contract_date}
                  onChange={(e) => setField('contract_date', e.target.value)}
                />
              </div>

              <div className="col-span-1 grid gap-1.5">
                <Label htmlFor="repayment_cycle">상환 주기 (일)</Label>
                <Input
                  id="repayment_cycle"
                  type="number"
                  value={form.repayment_cycle}
                  onChange={(e) => setField('repayment_cycle', e.target.value)}
                />
              </div>

              <div className="col-span-1 grid gap-1.5">
                <Label htmlFor="interest_rate">연이자율 (%)</Label>
                <Input
                  id="interest_rate"
                  type="number"
                  step="0.01"
                  value={form.interest_rate}
                  onChange={(e) => setField('interest_rate', e.target.value)}
                  placeholder="예: 12.5"
                />
              </div>

              <div className="col-span-1 grid gap-1.5">
                <Label htmlFor="number_of_repayment">상환 횟수</Label>
                <Input
                  id="number_of_repayment"
                  type="number"
                  value={form.number_of_repayment}
                  onChange={(e) => setField('number_of_repayment', e.target.value)}
                />
              </div>

              <div className="col-span-1 grid gap-1.5">
                <Label>상환 방법</Label>
                <Select
                  value={form.repayment_method}
                  onValueChange={(v) => setField('repayment_method', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {repaymentMethodOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Collateral */}
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>담보물</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addCollateral}>
                + 담보 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {collaterals.length === 0 ? (
              <p className="text-sm text-muted-foreground">등록된 담보물이 없습니다</p>
            ) : (
              <div className="space-y-3">
                {collaterals.map((c, idx) => (
                  <div key={idx} className="grid grid-cols-5 items-end gap-2">
                    <div className="grid gap-1">
                      <Label className="text-xs">유형</Label>
                      <Select
                        value={c.type}
                        onValueChange={(v) => updateCollateral(idx, 'type', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {collateralTypeOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">명칭</Label>
                      <Input
                        value={c.name}
                        onChange={(e) => updateCollateral(idx, 'name', e.target.value)}
                        placeholder="담보물 명칭"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">상세</Label>
                      <Input
                        value={c.detail}
                        onChange={(e) => updateCollateral(idx, 'detail', e.target.value)}
                        placeholder="상세 설명"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">가격</Label>
                      <Input
                        type="number"
                        value={c.price}
                        onChange={(e) => updateCollateral(idx, 'price', e.target.value)}
                        placeholder="가격"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCollateral(idx)}
                    >
                      삭제
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Guarantors */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>보증인</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex items-end gap-2">
              <div className="grid gap-1.5">
                <Label>보증인 선택</Label>
                <Select onValueChange={(v) => addGuarantor(Number(v))}>
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="보증인을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {guarantorList
                      .filter((g) => !guarantorIds.includes(g.id as number))
                      .map((g) => (
                        <SelectItem key={String(g.id)} value={String(g.id)}>
                          {String(g.name)} ({String(g.nrc_number)})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {guarantorIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">등록된 보증인이 없습니다</p>
            ) : (
              <div className="space-y-2">
                {guarantorIds.map((gid) => {
                  const g = guarantorList.find((gl) => gl.id === gid)
                  return (
                    <div key={gid} className="flex items-center gap-2 rounded-md border p-2">
                      <span className="text-sm">
                        {g ? `${g.name} (${g.nrc_number})` : `보증인 #${gid}`}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeGuarantor(gid)}
                      >
                        삭제
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 4: Schedule Preview */}
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>스케줄 미리보기</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={handlePreviewSchedule}>
                스케줄 미리보기
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {schedule.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                대출 정보를 입력한 후 미리보기 버튼을 클릭하세요
              </p>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedule.map((item) => (
                    <TableRow key={item.period}>
                      <TableCell>{item.period}</TableCell>
                      <TableCell>{item.payment_date}</TableCell>
                      <TableCell className="text-right">
                        {item.principal.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.interest.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.total.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.remaining_balance.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
