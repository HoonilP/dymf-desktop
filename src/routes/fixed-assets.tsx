import { useCallback, useEffect, useState } from 'react'
import type { FixedAssetSchema } from '@/types'
import {
  getFixedAssets,
  createFixedAsset,
  updateFixedAsset,
  deleteFixedAsset,
} from '@/lib/fixed-asset'

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

interface FormState {
  name: string
  purchase_date: string
  price: string
  method_status: boolean
  depreciation_period: string
  depreciation_ratio: string
}

const emptyForm: FormState = {
  name: '',
  purchase_date: '',
  price: '',
  method_status: false,
  depreciation_period: '',
  depreciation_ratio: '',
}

const PAGE_SIZE = 20

export default function FixedAssetsPage() {
  const [assets, setAssets] = useState<FixedAssetSchema[]>([])
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
  const [deleteTarget, setDeleteTarget] = useState<FixedAssetSchema | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await getFixedAssets({
        page,
        limit: PAGE_SIZE,
        name: searchName || undefined,
      })
      setAssets(result.data)
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

  function openEdit(asset: FixedAssetSchema) {
    setEditingId(asset.id)
    setForm({
      name: asset.name,
      purchase_date: asset.purchase_date,
      price: String(asset.price),
      method_status: asset.method_status,
      depreciation_period: asset.depreciation_period ? String(asset.depreciation_period) : '',
      depreciation_ratio: asset.depreciation_ratio ? String(asset.depreciation_ratio) : '',
    })
    setFormError(null)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setFormError('자산명은 필수입니다')
      return
    }
    if (!form.purchase_date) {
      setFormError('구매일은 필수입니다')
      return
    }
    if (!form.price || Number(form.price) <= 0) {
      setFormError('가격을 입력해주세요')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const payload = {
        name: form.name.trim(),
        purchase_date: form.purchase_date,
        price: Number(form.price),
        method_status: form.method_status,
        depreciation_period: form.method_status ? Number(form.depreciation_period) || undefined : undefined,
        depreciation_ratio: form.method_status ? Number(form.depreciation_ratio) || undefined : undefined,
      }
      if (editingId !== null) {
        await updateFixedAsset(editingId, payload)
      } else {
        await createFixedAsset(payload)
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
      await deleteFixedAsset(deleteTarget.id)
      setDeleteTarget(null)
      await load()
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : '삭제에 실패했습니다')
    }
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>고정자산 관리</CardTitle>
            <CardDescription>고정자산 정보를 관리합니다</CardDescription>
          </div>
          <Button onClick={openCreate}>추가</Button>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4 flex gap-2">
            <Input
              placeholder="자산명 검색"
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
          ) : assets.length === 0 ? (
            <p className="text-sm text-muted-foreground">등록된 고정자산이 없습니다</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">ID</TableHead>
                    <TableHead>자산명</TableHead>
                    <TableHead>구매일</TableHead>
                    <TableHead className="text-right">가격</TableHead>
                    <TableHead>감가상각</TableHead>
                    <TableHead>기간/비율</TableHead>
                    <TableHead className="w-[160px] text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell>{asset.id}</TableCell>
                      <TableCell className="font-medium">{asset.name}</TableCell>
                      <TableCell>{asset.purchase_date}</TableCell>
                      <TableCell className="text-right">
                        {asset.price.toLocaleString()}
                      </TableCell>
                      <TableCell>{asset.method_status ? '사용' : '미사용'}</TableCell>
                      <TableCell>
                        {asset.method_status
                          ? `${asset.depreciation_period ?? '-'}개월 / ${asset.depreciation_ratio ?? '-'}%`
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="mr-2"
                          onClick={() => openEdit(asset)}
                        >
                          수정
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setDeleteError(null)
                            setDeleteTarget(asset)
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
              {editingId !== null ? '고정자산 수정' : '고정자산 추가'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">자산명 *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="purchase_date">구매일 *</Label>
              <Input
                id="purchase_date"
                type="date"
                value={form.purchase_date}
                onChange={(e) => setForm((f) => ({ ...f, purchase_date: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">가격 *</Label>
              <Input
                id="price"
                type="number"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>감가상각 방식</Label>
              <Select
                value={form.method_status ? 'true' : 'false'}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, method_status: v === 'true' }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">사용</SelectItem>
                  <SelectItem value="false">미사용</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.method_status && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="depreciation_period">감가상각 기간 (개월)</Label>
                  <Input
                    id="depreciation_period"
                    type="number"
                    value={form.depreciation_period}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, depreciation_period: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="depreciation_ratio">감가상각 비율 (%)</Label>
                  <Input
                    id="depreciation_ratio"
                    type="number"
                    value={form.depreciation_ratio}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, depreciation_ratio: e.target.value }))
                    }
                  />
                </div>
              </>
            )}
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
            <AlertDialogTitle>고정자산 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" 자산을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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
