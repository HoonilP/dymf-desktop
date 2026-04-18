import { useCallback, useEffect, useState } from 'react'
import type { CollateralSchema } from '@/types'
import {
  getCollaterals,
  createCollateral,
  updateCollateral,
  deleteCollateral,
} from '@/lib/collateral'

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

const collateralTypeOptions = [
  { value: 'Property', label: '부동산 (Property)' },
  { value: 'Car', label: '차량 (Car)' },
]

interface FormState {
  type: string
  name: string
  detail: string
  price: string
}

const emptyForm: FormState = {
  type: 'Property',
  name: '',
  detail: '',
  price: '',
}

const PAGE_SIZE = 20

export default function CollateralPage() {
  const [collaterals, setCollaterals] = useState<CollateralSchema[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // search
  const [searchName, setSearchName] = useState('')

  // dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // delete confirm
  const [deleteTarget, setDeleteTarget] = useState<CollateralSchema | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await getCollaterals({
        page,
        limit: PAGE_SIZE,
        name: searchName || undefined,
      })
      setCollaterals(result.data)
      setTotal(result.total)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '데이터를 불러오지 못했습니다')
    } finally {
      setLoading(false)
    }
  }, [page, searchName])

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

  function openEdit(item: CollateralSchema) {
    setEditingId(item.id)
    setForm({
      type: String(item.type),
      name: item.name,
      detail: item.detail,
      price: item.price ? String(item.price) : '',
    })
    setFormError(null)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.detail.trim()) {
      setFormError('이름과 상세 정보는 필수입니다')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const payload = {
        type: form.type,
        name: form.name.trim(),
        detail: form.detail.trim(),
        price: form.price ? Number(form.price) : undefined,
      }
      if (editingId !== null) {
        await updateCollateral(editingId, payload)
      } else {
        await createCollateral(payload)
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
      await deleteCollateral(deleteTarget.id)
      setDeleteTarget(null)
      await load()
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : '삭제에 실패했습니다')
    }
  }

  const typeLabel = (type: string) =>
    collateralTypeOptions.find((o) => o.value === String(type))?.label ?? String(type)

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>담보 관리</CardTitle>
            <CardDescription>담보 정보를 관리합니다</CardDescription>
          </div>
          <Button onClick={openCreate}>추가</Button>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4 flex gap-2">
            <Input
              placeholder="담보명 검색"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
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
          ) : collaterals.length === 0 ? (
            <p className="text-sm text-muted-foreground">등록된 담보가 없습니다</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">ID</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead>이름</TableHead>
                    <TableHead>상세</TableHead>
                    <TableHead className="text-right">가격</TableHead>
                    <TableHead className="w-[160px] text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collaterals.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.id}</TableCell>
                      <TableCell>{typeLabel(String(item.type))}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{item.detail}</TableCell>
                      <TableCell className="text-right">
                        {item.price ? item.price.toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="mr-2"
                          onClick={() => openEdit(item)}
                        >
                          수정
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setDeleteError(null)
                            setDeleteTarget(item)
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
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>
              {editingId !== null ? '담보 수정' : '담보 추가'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>유형 *</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {collateralTypeOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">이름 *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="detail">상세 *</Label>
              <Input
                id="detail"
                value={form.detail}
                onChange={(e) => setForm((f) => ({ ...f, detail: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">가격</Label>
              <Input
                id="price"
                type="number"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="선택사항"
              />
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
            <AlertDialogTitle>담보 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" 담보를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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
