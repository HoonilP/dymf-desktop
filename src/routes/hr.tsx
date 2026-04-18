import { useCallback, useEffect, useState } from 'react'
import type { EmployeeSchema } from '@/types'
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from '@/lib/hr'
import { pickAndUploadToS3 } from '@/lib/file'
import { S3Image } from '@/components/s3-image'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const genderOptions = [
  { value: 'man', label: '남성' },
  { value: 'woman', label: '여성' },
  { value: 'notdefinded', label: '미정' },
]

const workingStatusOptions = [
  { value: 'working', label: '근무중' },
  { value: 'notworking', label: '퇴직' },
  { value: 'etc', label: '기타' },
]

interface FormState {
  name: string
  nrc_number: string
  birth: string
  phone_number: string
  address: string
  email: string
  gender: string
  salary: string
  ssb: string
  income_tax: string
  bonus: string
  working_status: string
  image: string
}

const emptyForm: FormState = {
  name: '',
  nrc_number: '',
  birth: '',
  phone_number: '',
  address: '',
  email: '',
  gender: 'notdefinded',
  salary: '',
  ssb: '',
  income_tax: '',
  bonus: '',
  working_status: 'working',
  image: '',
}

const PAGE_SIZE = 20

export default function HrPage() {
  const [employees, setEmployees] = useState<EmployeeSchema[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // search
  const [searchName, setSearchName] = useState('')
  const [searchNrc, setSearchNrc] = useState('')

  // dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // delete confirm
  const [deleteTarget, setDeleteTarget] = useState<EmployeeSchema | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await getEmployees({
        page,
        limit: PAGE_SIZE,
        name: searchName || undefined,
        nrc_number: searchNrc || undefined,
      })
      setEmployees(result.data)
      setTotal(result.total)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '데이터를 불러오지 못했습니다')
    } finally {
      setLoading(false)
    }
  }, [page, searchName, searchNrc])

  useEffect(() => {
    load()
  }, [load])

  function handleSearch() {
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(emp: EmployeeSchema) {
    setEditingId(emp.id)
    setForm({
      name: emp.name,
      nrc_number: emp.nrc_number,
      birth: emp.birth,
      phone_number: emp.phone_number,
      address: emp.address,
      email: emp.email,
      gender: String(emp.gender),
      salary: String(emp.salary),
      ssb: String(emp.ssb),
      income_tax: String(emp.income_tax),
      bonus: emp.bonus ? String(emp.bonus) : '',
      working_status: String(emp.working_status),
      image: emp.image || '',
    })
    setFormError(null)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.nrc_number.trim()) {
      setFormError('이름과 NRC 번호는 필수입니다')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      if (editingId !== null) {
        await updateEmployee(editingId, {
          name: form.name.trim(),
          nrc_number: form.nrc_number.trim(),
          birth: form.birth,
          phone_number: form.phone_number,
          address: form.address,
          email: form.email,
          gender: form.gender,
          salary: Number(form.salary) || 0,
          ssb: Number(form.ssb) || 0,
          income_tax: Number(form.income_tax) || 0,
          bonus: form.bonus ? Number(form.bonus) : undefined,
          working_status: form.working_status,
          image: form.image || undefined,
        })
      } else {
        await createEmployee({
          name: form.name.trim(),
          nrc_number: form.nrc_number.trim(),
          birth: form.birth,
          phone_number: form.phone_number,
          address: form.address,
          email: form.email,
          gender: form.gender,
          salary: Number(form.salary) || 0,
          ssb: Number(form.ssb) || 0,
          income_tax: Number(form.income_tax) || 0,
          bonus: form.bonus ? Number(form.bonus) : undefined,
          working_status: form.working_status,
          image: form.image || undefined,
        })
      }
      setDialogOpen(false)
      await load()
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : '저장에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteError(null)
    try {
      await deleteEmployee(deleteTarget.id)
      setDeleteTarget(null)
      await load()
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : '삭제에 실패했습니다')
    }
  }

  const workingStatusLabel = (status: string) =>
    workingStatusOptions.find((o) => o.value === String(status))?.label ?? String(status)

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>직원 관리</CardTitle>
            <CardDescription>HR 직원 정보를 관리합니다</CardDescription>
          </div>
          <Button onClick={openCreate}>추가</Button>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4 flex gap-2">
            <Input
              placeholder="이름 검색"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="max-w-[200px]"
            />
            <Input
              placeholder="NRC 번호 검색"
              value={searchNrc}
              onChange={(e) => setSearchNrc(e.target.value)}
              className="max-w-[200px]"
            />
            <Button variant="outline" onClick={handleSearch}>
              검색
            </Button>
          </div>

          {error && (
            <p className="mb-4 text-sm text-destructive">{error}</p>
          )}
          {loading ? (
            <p className="text-sm text-muted-foreground">불러오는 중...</p>
          ) : employees.length === 0 ? (
            <p className="text-sm text-muted-foreground">등록된 직원이 없습니다</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">ID</TableHead>
                    <TableHead>이름</TableHead>
                    <TableHead>NRC 번호</TableHead>
                    <TableHead>전화번호</TableHead>
                    <TableHead>근무상태</TableHead>
                    <TableHead className="text-right">급여</TableHead>
                    <TableHead className="w-[160px] text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell>{emp.id}</TableCell>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell>{emp.nrc_number}</TableCell>
                      <TableCell>{emp.phone_number}</TableCell>
                      <TableCell>{workingStatusLabel(String(emp.working_status))}</TableCell>
                      <TableCell className="text-right">
                        {emp.salary.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="mr-2"
                          onClick={() => openEdit(emp)}
                        >
                          수정
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setDeleteError(null)
                            setDeleteTarget(emp)
                          }}
                        >
                          삭제
                        </Button>
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
                    onClick={() => setPage((p) => p - 1)}
                  >
                    이전
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    다음
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingId !== null ? '직원 수정' : '직원 추가'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">이름 *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nrc_number">NRC 번호 *</Label>
              <Input
                id="nrc_number"
                value={form.nrc_number}
                onChange={(e) => setForm((f) => ({ ...f, nrc_number: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="birth">생년월일</Label>
              <Input
                id="birth"
                type="date"
                value={form.birth}
                onChange={(e) => setForm((f) => ({ ...f, birth: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone_number">전화번호</Label>
              <Input
                id="phone_number"
                value={form.phone_number}
                onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">주소</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>성별</Label>
              <Select
                value={form.gender}
                onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {genderOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="salary">급여</Label>
              <Input
                id="salary"
                type="number"
                value={form.salary}
                onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ssb">SSB</Label>
              <Input
                id="ssb"
                type="number"
                value={form.ssb}
                onChange={(e) => setForm((f) => ({ ...f, ssb: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="income_tax">소득세</Label>
              <Input
                id="income_tax"
                type="number"
                value={form.income_tax}
                onChange={(e) => setForm((f) => ({ ...f, income_tax: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bonus">보너스</Label>
              <Input
                id="bonus"
                type="number"
                value={form.bonus}
                onChange={(e) => setForm((f) => ({ ...f, bonus: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>근무상태</Label>
              <Select
                value={form.working_status}
                onValueChange={(v) => setForm((f) => ({ ...f, working_status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workingStatusOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>사진</Label>
              <div className="flex items-center gap-4">
                <S3Image entity="personal" filename={form.image || undefined} className="h-20 w-20" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const filename = await pickAndUploadToS3('personal')
                    if (filename) setForm((f) => ({ ...f, image: filename }))
                  }}
                >
                  사진 업로드
                </Button>
              </div>
            </div>
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>직원 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" 직원을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
