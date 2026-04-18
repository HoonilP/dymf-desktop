import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { CpNumberSchema } from '@/types'
import { getCpNumbers } from '@/lib/cp-number'
import {
  createGuarantor,
  getGuarantor,
  updateGuarantor,
  deleteGuarantor,
} from '@/lib/guarantor'
import { pickAndUploadToS3 } from '@/lib/file'
import { S3Image } from '@/components/s3-image'

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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const genderOptions = [
  { value: 'man', label: '남성' },
  { value: 'woman', label: '여성' },
  { value: 'notdefinded', label: '미정' },
]

const loanTypeOptions = [
  { value: 'special_loan', label: '특별대출' },
  { value: 'group_loan', label: '그룹대출' },
  { value: 'etc', label: '기타' },
]

const MAX_DETAILS = 5

interface FormData {
  name: string
  nrc_number: string
  father_name: string
  birth: string
  phone_number: string
  email: string
  gender: string
  loan_type: string
  cp_number_id: string
  home_address: string
  home_postal_code: string
  office_address: string
  office_postal_code: string
  details: string[]
  image: string
}

const emptyForm: FormData = {
  name: '',
  nrc_number: '',
  father_name: '',
  birth: '2000-01-01',
  phone_number: '',
  email: '',
  gender: 'man',
  loan_type: 'special_loan',
  cp_number_id: '',
  home_address: '',
  home_postal_code: '',
  office_address: '',
  office_postal_code: '',
  details: [''],
  image: '',
}

export default function GuarantorRegistrationPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const guarantorId = searchParams.get('id')
  const isEditMode = !!guarantorId

  const [form, setForm] = useState<FormData>({ ...emptyForm })
  const [cpNumbers, setCpNumbers] = useState<CpNumberSchema[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load CP numbers
  useEffect(() => {
    getCpNumbers().then(setCpNumbers).catch(() => {})
  }, [])

  // Load guarantor data in edit mode
  const loadGuarantor = useCallback(async (id: number) => {
    try {
      setLoading(true)
      setError(null)
      const g = await getGuarantor(id)
      if (!g) {
        setError('보증인 정보를 찾을 수 없습니다')
        return
      }
      setForm({
        name: g.name,
        nrc_number: g.nrc_number,
        father_name: g.father_name,
        birth: g.birth,
        phone_number: g.phone_number,
        email: g.email || '',
        gender: String(g.gender),
        loan_type: String(g.loan_type),
        cp_number_id: String(g.cp_number_id),
        home_address: g.home_address,
        home_postal_code: g.home_postal_code,
        office_address: g.office_address || '',
        office_postal_code: g.office_postal_code || '',
        details: g.details && g.details.length > 0 ? g.details : [''],
        image: g.image || '',
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '데이터를 불러오지 못했습니다')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (guarantorId) {
      loadGuarantor(Number(guarantorId))
    }
  }, [guarantorId, loadGuarantor])

  // Field updaters
  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handlePhoneChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    setField('phone_number', digits)
  }

  // Dynamic array helpers
  function updateArrayItem(index: number, value: string) {
    setForm((prev) => {
      const arr = [...prev.details]
      arr[index] = value
      return { ...prev, details: arr }
    })
  }

  function addArrayItem() {
    setForm((prev) => {
      if (prev.details.length >= MAX_DETAILS) return prev
      return { ...prev, details: [...prev.details, ''] }
    })
  }

  function removeArrayItem(index: number) {
    setForm((prev) => {
      const arr = prev.details.filter((_, i) => i !== index)
      return { ...prev, details: arr.length === 0 ? [''] : arr }
    })
  }

  // Save handler
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.name.trim()) {
      setError('이름을 입력해 주세요')
      return
    }
    if (!form.nrc_number.trim()) {
      setError('NRC 번호를 입력해 주세요')
      return
    }
    if (!form.phone_number || form.phone_number.length !== 11) {
      setError('전화번호는 11자리여야 합니다')
      return
    }
    if (!form.cp_number_id) {
      setError('CP Number를 선택해 주세요')
      return
    }
    if (!form.home_address.trim()) {
      setError('자택주소를 입력해 주세요')
      return
    }
    if (!form.home_postal_code.trim()) {
      setError('자택우편번호를 입력해 주세요')
      return
    }

    const details = form.details.filter((d) => d.trim() !== '')

    try {
      setSaving(true)
      if (isEditMode) {
        await updateGuarantor(Number(guarantorId), {
          name: form.name,
          nrc_number: form.nrc_number,
          father_name: form.father_name,
          birth: form.birth,
          phone_number: form.phone_number,
          email: form.email || undefined,
          gender: form.gender,
          loan_type: form.loan_type,
          cp_number_id: Number(form.cp_number_id),
          home_address: form.home_address,
          home_postal_code: form.home_postal_code,
          office_address: form.office_address,
          office_postal_code: form.office_postal_code,
          details,
          image: form.image || undefined,
        })
      } else {
        await createGuarantor({
          name: form.name,
          nrc_number: form.nrc_number,
          father_name: form.father_name,
          birth: form.birth,
          phone_number: form.phone_number,
          email: form.email || undefined,
          gender: form.gender,
          loan_type: form.loan_type,
          cp_number_id: Number(form.cp_number_id),
          home_address: form.home_address,
          home_postal_code: form.home_postal_code,
          office_address: form.office_address,
          office_postal_code: form.office_postal_code,
          details,
          image: form.image || undefined,
        })
      }
      navigate('/search/guarantor')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '저장에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  // Delete handler
  async function handleDelete() {
    if (!guarantorId) return
    try {
      setSaving(true)
      setError(null)
      await deleteGuarantor(Number(guarantorId))
      navigate('/search/guarantor')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '삭제에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-6">
        <p className="text-muted-foreground">불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <form onSubmit={handleSave}>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            {isEditMode ? '보증인 수정' : '보증인 등록'}
          </h1>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/search/guarantor')}
            >
              취소
            </Button>
            {isEditMode && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" disabled={saving}>
                    삭제
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>보증인 삭제</AlertDialogTitle>
                    <AlertDialogDescription>
                      이 보증인을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      삭제
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button type="submit" disabled={saving}>
              {saving ? '저장 중...' : isEditMode ? '수정' : '등록'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Image Upload */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>사진</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <S3Image entity="guarantor" filename={form.image || undefined} />
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  const filename = await pickAndUploadToS3('guarantor')
                  if (filename) setField('image', filename)
                }}
              >
                사진 업로드
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Section 1: Basic Info */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>기본정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-2 grid gap-1.5">
                <Label htmlFor="name">이름 *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  required
                />
              </div>
              <div className="col-span-2 grid gap-1.5">
                <Label htmlFor="father_name">아버지 이름</Label>
                <Input
                  id="father_name"
                  value={form.father_name}
                  onChange={(e) => setField('father_name', e.target.value)}
                />
              </div>
              <div className="col-span-2 grid gap-1.5">
                <Label htmlFor="nrc_number">NRC 번호 *</Label>
                <Input
                  id="nrc_number"
                  value={form.nrc_number}
                  onChange={(e) => setField('nrc_number', e.target.value)}
                  required
                />
              </div>
              <div className="col-span-2 grid gap-1.5">
                <Label htmlFor="birth">생년월일</Label>
                <Input
                  id="birth"
                  type="date"
                  value={form.birth}
                  onChange={(e) => setField('birth', e.target.value)}
                />
              </div>
              <div className="col-span-2 grid gap-1.5">
                <Label htmlFor="phone_number">전화번호 *</Label>
                <Input
                  id="phone_number"
                  value={form.phone_number}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="11자리 숫자"
                  required
                />
              </div>
              <div className="col-span-2 grid gap-1.5">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                />
              </div>
              <div className="col-span-2 grid gap-1.5">
                <Label>성별</Label>
                <Select
                  value={form.gender}
                  onValueChange={(v) => setField('gender', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="성별 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {genderOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 grid gap-1.5">
                <Label>대출유형</Label>
                <Select
                  value={form.loan_type}
                  onValueChange={(v) => setField('loan_type', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="대출유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {loanTypeOptions.map((opt) => (
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

        {/* Section 2: Address */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>주소</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-2 grid gap-1.5">
                <Label>CP Number *</Label>
                <Select
                  value={form.cp_number_id}
                  onValueChange={(v) => setField('cp_number_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="CP Number 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {cpNumbers.map((cp) => (
                      <SelectItem key={cp.id} value={String(cp.id)}>
                        {cp.area_number} — {cp.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2" />
              <div className="col-span-3 grid gap-1.5">
                <Label htmlFor="home_address">자택주소 *</Label>
                <Input
                  id="home_address"
                  value={form.home_address}
                  onChange={(e) => setField('home_address', e.target.value)}
                  required
                />
              </div>
              <div className="col-span-1 grid gap-1.5">
                <Label htmlFor="home_postal_code">우편번호 *</Label>
                <Input
                  id="home_postal_code"
                  value={form.home_postal_code}
                  onChange={(e) => setField('home_postal_code', e.target.value)}
                  required
                />
              </div>
              <div className="col-span-3 grid gap-1.5">
                <Label htmlFor="office_address">직장주소</Label>
                <Input
                  id="office_address"
                  value={form.office_address}
                  onChange={(e) => setField('office_address', e.target.value)}
                />
              </div>
              <div className="col-span-1 grid gap-1.5">
                <Label htmlFor="office_postal_code">우편번호</Label>
                <Input
                  id="office_postal_code"
                  value={form.office_postal_code}
                  onChange={(e) =>
                    setField('office_postal_code', e.target.value)
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Additional Info (details) */}
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>추가정보</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addArrayItem()}
                disabled={form.details.length >= MAX_DETAILS}
              >
                + 항목 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {form.details.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Label className="w-16 shrink-0">항목 {idx + 1}</Label>
                  <Input
                    value={item}
                    onChange={(e) => updateArrayItem(idx, e.target.value)}
                    placeholder={`추가정보 ${idx + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeArrayItem(idx)}
                    disabled={form.details.length <= 1}
                  >
                    삭제
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
