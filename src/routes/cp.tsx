import { useCallback, useEffect, useState } from 'react'
import type { CpNumberSchema } from '@/types'
import {
  getCpNumbers,
  createCpNumber,
  updateCpNumber,
  deleteCpNumber,
} from '@/lib/cp-number'

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

interface FormState {
  area_number: string
  description: string
}

const emptyForm: FormState = { area_number: '', description: '' }

export default function CpPage() {
  const [cpNumbers, setCpNumbers] = useState<CpNumberSchema[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // delete confirm
  const [deleteTarget, setDeleteTarget] = useState<CpNumberSchema | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getCpNumbers()
      setCpNumbers(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '데이터를 불러오지 못했습니다')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(cp: CpNumberSchema) {
    setEditingId(cp.id)
    setForm({ area_number: cp.area_number, description: cp.description })
    setFormError(null)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.area_number.trim() || !form.description.trim()) {
      setFormError('지역번호와 설명을 모두 입력해주세요')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      if (editingId !== null) {
        await updateCpNumber(editingId, form.area_number.trim(), form.description.trim())
      } else {
        await createCpNumber(form.area_number.trim(), form.description.trim())
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
      await deleteCpNumber(deleteTarget.id)
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
            <CardTitle>CP Number 관리</CardTitle>
            <CardDescription>지역번호(Check Point)를 관리합니다</CardDescription>
          </div>
          <Button onClick={openCreate}>추가</Button>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-4 text-sm text-destructive">{error}</p>
          )}
          {loading ? (
            <p className="text-sm text-muted-foreground">불러오는 중...</p>
          ) : cpNumbers.length === 0 ? (
            <p className="text-sm text-muted-foreground">등록된 지역번호가 없습니다</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead>지역번호</TableHead>
                  <TableHead>설명</TableHead>
                  <TableHead className="w-[160px] text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cpNumbers.map((cp) => (
                  <TableRow key={cp.id}>
                    <TableCell>{cp.id}</TableCell>
                    <TableCell className="font-medium">{cp.area_number}</TableCell>
                    <TableCell>{cp.description}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="mr-2"
                        onClick={() => openEdit(cp)}
                      >
                        수정
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setDeleteError(null)
                          setDeleteTarget(cp)
                        }}
                      >
                        삭제
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId !== null ? '지역번호 수정' : '지역번호 추가'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="area_number">지역번호</Label>
              <Input
                id="area_number"
                value={form.area_number}
                onChange={(e) => setForm((f) => ({ ...f, area_number: e.target.value }))}
                placeholder="예: YGN-01"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">설명</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="예: 양곤 1구역"
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
            <AlertDialogTitle>지역번호 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.area_number}" 지역번호를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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
