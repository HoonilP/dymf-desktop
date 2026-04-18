import { getDb } from './database'

// --- Helper functions ---

export function roundUp100(value: number): number {
  return Math.ceil(value / 100) * 100
}

function periodInterestRate(annualRate: number, cycleDays: number): number {
  return (annualRate / 365) * cycleDays
}

// --- Schedule types ---

export interface ScheduleItem {
  principal: number
  interest: number
  payment_date: string
  period: number
  remaining_balance: number
  total: number
}

// --- Schedule generators ---

export function equalPayment(
  loanAmount: number,
  numberOfRepayment: number,
  interestRate: number,
  repaymentCycle: number,
  contractDate: string
): ScheduleItem[] {
  const rate = periodInterestRate(interestRate, repaymentCycle)

  let amountPerPeriod = roundUp100(
    (loanAmount * rate * Math.pow(1 + rate, numberOfRepayment)) /
    (Math.pow(1 + rate, numberOfRepayment) - 1)
  )

  let totalCalculated = amountPerPeriod * numberOfRepayment

  const schedule: ScheduleItem[] = []
  const currentDate = new Date(contractDate)
  let remainingPrincipal = loanAmount

  for (let period = 1; period <= numberOfRepayment; period++) {
    const interestPayment = roundUp100(remainingPrincipal * rate)
    let principalPayment = roundUp100(amountPerPeriod - interestPayment)

    if (period === numberOfRepayment) {
      const remainingDifference = roundUp100(totalCalculated - (principalPayment + interestPayment))
      if (remainingDifference !== 0) {
        principalPayment += remainingDifference
      }
      amountPerPeriod = principalPayment + interestPayment
    }

    totalCalculated -= (principalPayment + interestPayment)

    currentDate.setDate(currentDate.getDate() + repaymentCycle)

    schedule.push({
      period,
      payment_date: currentDate.toISOString().split('T')[0],
      principal: principalPayment,
      interest: interestPayment,
      total: roundUp100(amountPerPeriod),
      remaining_balance: period === numberOfRepayment ? 0 : roundUp100(remainingPrincipal),
    })

    remainingPrincipal -= principalPayment
  }

  return schedule
}

export function equalPrincipalPayment(
  loanAmount: number,
  numberOfRepayment: number,
  interestRate: number,
  repaymentCycle: number,
  contractDate: string
): ScheduleItem[] {
  let principalPayment = roundUp100(loanAmount / numberOfRepayment)
  const rate = periodInterestRate(interestRate, repaymentCycle)

  const schedule: ScheduleItem[] = []
  const currentDate = new Date(contractDate)
  let remainingPrincipal = loanAmount

  for (let period = 1; period <= numberOfRepayment; period++) {
    const interestPayment = roundUp100(remainingPrincipal * rate)

    if (period === numberOfRepayment) {
      principalPayment = roundUp100(remainingPrincipal)
    }

    const amountPerPeriod = principalPayment + interestPayment
    remainingPrincipal -= principalPayment

    currentDate.setDate(currentDate.getDate() + repaymentCycle)

    schedule.push({
      period,
      payment_date: currentDate.toISOString().split('T')[0],
      principal: principalPayment,
      interest: interestPayment,
      total: roundUp100(amountPerPeriod),
      remaining_balance: period === numberOfRepayment ? 0 : roundUp100(remainingPrincipal),
    })
  }

  return schedule
}

export function bulletPayment(
  loanAmount: number,
  numberOfRepayment: number,
  interestRate: number,
  repaymentCycle: number,
  contractDate: string
): ScheduleItem[] {
  // bulletPayment uses annualRate / 12 (monthly), NOT daily rate
  const rate = interestRate / 12

  const schedule: ScheduleItem[] = []
  const currentDate = new Date(contractDate)
  let remainingPrincipal = loanAmount

  for (let period = 1; period <= numberOfRepayment; period++) {
    const interestPayment = roundUp100(remainingPrincipal * rate)
    let principalPayment = 0
    let totalPayment = interestPayment

    if (period === numberOfRepayment) {
      principalPayment = roundUp100(remainingPrincipal)
      totalPayment += principalPayment
      remainingPrincipal = 0
    }

    currentDate.setDate(currentDate.getDate() + repaymentCycle)

    schedule.push({
      period,
      payment_date: currentDate.toISOString().split('T')[0],
      principal: principalPayment,
      interest: interestPayment,
      total: roundUp100(totalPayment),
      remaining_balance: period === numberOfRepayment ? 0 : roundUp100(remainingPrincipal),
    })
  }

  return schedule
}

// --- Schedule dispatcher ---

export function getRepaymentSchedule(input: {
  loan_amount: number
  number_of_repayment: number
  interest_rate: number
  repayment_cycle: number
  contract_date: string
  repayment_method: string
}): ScheduleItem[] {
  switch (input.repayment_method) {
    case 'Equal':
      return equalPayment(input.loan_amount, input.number_of_repayment, input.interest_rate, input.repayment_cycle, input.contract_date)
    case 'Equal_Principal':
      return equalPrincipalPayment(input.loan_amount, input.number_of_repayment, input.interest_rate, input.repayment_cycle, input.contract_date)
    case 'Bullet':
      return bulletPayment(input.loan_amount, input.number_of_repayment, input.interest_rate, input.repayment_cycle, input.contract_date)
    default:
      throw new Error('유효하지 않은 상환 방법입니다.')
  }
}

// --- Input interfaces ---

export interface CreateLoanInput {
  loan_officer_id: number
  loan_amount: number
  repayment_cycle: number
  interest_rate: number
  contract_date: string
  number_of_repayment: number
  repayment_method: string
  customer_id: number
  consulting_info?: string[]
  collateral_ids?: number[]
  guarantor_ids?: number[]
}

export interface GetLoansParams {
  page?: number
  limit?: number
  name?: string
  overdue_status?: number
  loan_type?: string
}

export interface GetLoanSchedulesParams {
  page?: number
  page_size?: number
  get_start_date?: string
  get_last_date?: string
  loan_payment_status?: number
}

export interface CreateOverdueTransactionInput {
  received_principal: number
  received_interest: number
  received_overdue_interest: number
  overdue_interest_rate: number
}

// --- CRUD operations ---

export async function createLoan(input: CreateLoanInput): Promise<number> {
  const db = await getDb()

  // Validate customer exists
  const customerCheck = await db.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM customer WHERE id = $1',
    [input.customer_id]
  )
  if (customerCheck[0].count === 0) {
    throw new Error('존재하지 않는 고객입니다.')
  }

  // Validate loan officer exists
  const officerCheck = await db.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM loan_officier WHERE id = $1',
    [input.loan_officer_id]
  )
  if (officerCheck[0].count === 0) {
    throw new Error('존재하지 않는 대출 담당자입니다.')
  }

  // Generate repayment schedule
  const schedule = getRepaymentSchedule({
    loan_amount: input.loan_amount,
    number_of_repayment: input.number_of_repayment,
    interest_rate: input.interest_rate,
    repayment_cycle: input.repayment_cycle,
    contract_date: input.contract_date,
    repayment_method: input.repayment_method,
  })

  try {
    await db.execute('BEGIN')

    // Insert loan
    const loanResult = await db.execute(
      `INSERT INTO loan (
        loan_officer_id, loan_amount, repayment_cycle, interest_rate,
        contract_date, number_of_repayment, repayment_method, customer_id, consulting_info
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        input.loan_officer_id,
        input.loan_amount,
        input.repayment_cycle,
        input.interest_rate,
        input.contract_date,
        input.number_of_repayment,
        input.repayment_method,
        input.customer_id,
        JSON.stringify(input.consulting_info || []),
      ]
    )

    const loanId = loanResult.lastInsertId as number

    // Insert schedule items
    for (const item of schedule) {
      await db.execute(
        `INSERT INTO loan_schedule (
          principal, interest, payment_date, period, remaining_balance, total, loan_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          roundUp100(item.principal),
          roundUp100(item.interest),
          item.payment_date,
          item.period,
          roundUp100(item.remaining_balance),
          roundUp100(item.total),
          loanId,
        ]
      )
    }

    // Insert collaterals
    if (input.collateral_ids && input.collateral_ids.length > 0) {
      for (const collateralId of input.collateral_ids) {
        await db.execute(
          'UPDATE collateral SET loan_id = $1 WHERE id = $2',
          [loanId, collateralId]
        )
      }
    }

    // Insert guarantees
    if (input.guarantor_ids && input.guarantor_ids.length > 0) {
      for (const guarantorId of input.guarantor_ids) {
        await db.execute(
          'INSERT INTO guarantee (loan_id, guarantor_id) VALUES ($1, $2)',
          [loanId, guarantorId]
        )
      }
    }

    await db.execute('COMMIT')
    return loanId
  } catch (e) {
    await db.execute('ROLLBACK')
    console.error('Transaction rollback on createLoan:', e)
    throw e
  }
}

export async function getLoans(
  params: GetLoansParams = {}
): Promise<{ data: Record<string, unknown>[]; total: number }> {
  const db = await getDb()
  const { page = 1, limit = 20, name, overdue_status, loan_type } = params

  const conditions: string[] = []
  const bindings: unknown[] = []
  let bindIdx = 1

  if (name) {
    conditions.push(`c.name LIKE $${bindIdx}`)
    bindings.push(`%${name}%`)
    bindIdx++
  }

  if (overdue_status !== undefined) {
    conditions.push(`l.overdue_status = $${bindIdx}`)
    bindings.push(overdue_status)
    bindIdx++
  }

  if (loan_type !== undefined) {
    conditions.push(`c.loan_type = $${bindIdx}`)
    bindings.push(loan_type)
    bindIdx++
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Total count
  const countRows = await db.select<{ count: number }[]>(
    `SELECT COUNT(*) as count FROM loan l
     LEFT JOIN customer c ON l.customer_id = c.id
     ${whereClause}`,
    bindings
  )
  const total = countRows[0].count

  // Data with JOINs
  const offset = (page - 1) * limit
  const dataBindings = [...bindings, limit, offset]
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT l.*, c.name as customer_name, c.nrc_number as customer_nrc_number,
            c.phone_number as customer_phone_number, c.loan_type as customer_loan_type
     FROM loan l
     LEFT JOIN customer c ON l.customer_id = c.id
     ${whereClause}
     ORDER BY l.id DESC
     LIMIT $${bindIdx} OFFSET $${bindIdx + 1}`,
    dataBindings
  )

  return { data: rows, total }
}

export async function getLoan(
  id: number,
  overdueStatus?: boolean
): Promise<Record<string, unknown> | null> {
  const db = await getDb()

  const loanRows = await db.select<Record<string, unknown>[]>(
    'SELECT * FROM loan WHERE id = $1',
    [id]
  )

  if (loanRows.length === 0) return null

  const loan = loanRows[0]

  if (overdueStatus) {
    // Return overdue schedules with transactions
    const overdueSchedules = await db.select<Record<string, unknown>[]>(
      `SELECT os.*, ot.id as transaction_id, ot.received_principal, ot.received_interest, ot.received_overdue_interest
       FROM overdue_schedule os
       LEFT JOIN overdue_transaction ot ON os.id = ot.overdue_schedule_id
       WHERE os.loan_id = $1
       ORDER BY os.id ASC`,
      [id]
    )
    return { ...loan, overdue_schedules: overdueSchedules }
  } else {
    // Return regular schedules
    const schedules = await db.select<Record<string, unknown>[]>(
      `SELECT * FROM loan_schedule WHERE loan_id = $1 ORDER BY period ASC`,
      [id]
    )
    return { ...loan, loan_schedules: schedules }
  }
}

export async function getLoanSchedules(
  params: GetLoanSchedulesParams = {}
): Promise<{ data: Record<string, unknown>[]; total_pages: number; count: number }> {
  const db = await getDb()
  const { page = 1, page_size = 20, get_start_date, get_last_date, loan_payment_status } = params

  const conditions: string[] = []
  const bindings: unknown[] = []
  let bindIdx = 1

  if (loan_payment_status !== undefined) {
    conditions.push(`ls.loan_payment_status = $${bindIdx}`)
    bindings.push(loan_payment_status)
    bindIdx++
  }

  if (get_start_date) {
    conditions.push(`ls.payment_date >= $${bindIdx}`)
    bindings.push(get_start_date)
    bindIdx++
  }

  if (get_last_date) {
    conditions.push(`ls.payment_date <= $${bindIdx}`)
    bindings.push(get_last_date)
    bindIdx++
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Count
  const countRows = await db.select<{ count: number }[]>(
    `SELECT COUNT(*) as count FROM loan_schedule ls
     LEFT JOIN loan l ON ls.loan_id = l.id
     LEFT JOIN customer c ON l.customer_id = c.id
     ${whereClause}`,
    bindings
  )
  const count = countRows[0].count
  const total_pages = Math.ceil(count / page_size)

  // Data
  const offset = (page - 1) * page_size
  const dataBindings = [...bindings, page_size, offset]
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT ls.*, l.id as loan_id, c.id as customer_id, c.name as customer_name, c.nrc_number as customer_nrc_number
     FROM loan_schedule ls
     LEFT JOIN loan l ON ls.loan_id = l.id
     LEFT JOIN customer c ON l.customer_id = c.id
     ${whereClause}
     ORDER BY ls.payment_date ASC
     LIMIT $${bindIdx} OFFSET $${bindIdx + 1}`,
    dataBindings
  )

  return { data: rows, total_pages, count }
}

export async function changeLoanScheduleState(
  scheduleId: number,
  loanPaymentStatus: number
): Promise<number> {
  const db = await getDb()

  const scheduleRows = await db.select<Record<string, unknown>[]>(
    'SELECT ls.*, ls.loan_id FROM loan_schedule ls WHERE ls.id = $1',
    [scheduleId]
  )

  if (scheduleRows.length === 0) {
    throw new Error('존재하지 않는 ID의 값의 대출스케줄입니다.')
  }

  const schedule = scheduleRows[0]
  const currentStatus = schedule.loan_payment_status as number
  const loanId = schedule.loan_id as number
  const remainingBalance = schedule.remaining_balance as number
  const total = schedule.total as number

  const beforeRe = currentStatus
    ? remainingBalance
    : remainingBalance + total

  try {
    await db.execute('BEGIN')

    await db.execute(
      'UPDATE loan_schedule SET loan_payment_status = $1 WHERE id = $2',
      [loanPaymentStatus, scheduleId]
    )

    await db.execute(
      `INSERT INTO loan_transaction (before_re, repayment_amount, loan_id)
       VALUES ($1, $2, $3)`,
      [beforeRe, total, loanId]
    )

    await db.execute('COMMIT')
  } catch (e) {
    await db.execute('ROLLBACK')
    console.error('Transaction rollback on changeLoanScheduleState:', e)
    throw e
  }

  return loanPaymentStatus
}

// --- Overdue functions ---

export async function changeOverdueState(
  loanId: number,
  overdueStatus: boolean
): Promise<boolean> {
  const db = await getDb()

  const loanRows = await db.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM loan WHERE id = $1',
    [loanId]
  )

  if (loanRows[0].count === 0) {
    throw new Error('존재하지 않는 ID의 값의 대출입니다.')
  }

  await db.execute(
    'UPDATE loan SET overdue_status = $1 WHERE id = $2',
    [overdueStatus ? 1 : 0, loanId]
  )

  return overdueStatus
}

export async function createOverdueSchedule(
  loanId: number,
  overdueInterestRate: number
): Promise<number> {
  const db = await getDb()

  // Check loan exists and is overdue
  const loanRows = await db.select<Record<string, unknown>[]>(
    'SELECT * FROM loan WHERE id = $1',
    [loanId]
  )

  if (loanRows.length === 0) {
    throw new Error('존재하지 않는 ID의 값의 대출입니다.')
  }

  const loan = loanRows[0]

  if (!(loan.overdue_status as number)) {
    throw new Error('연체대출이 아닙니다!')
  }

  // Check if overdue schedule already exists
  const existingOverdue = await db.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM overdue_schedule WHERE loan_id = $1',
    [loanId]
  )

  if (existingOverdue[0].count > 0) {
    throw new Error('이미 연체 스케줄이 생성된 대출입니다.')
  }

  const currentDate = new Date()
  const repaymentDate = new Date(currentDate)
  repaymentDate.setDate(currentDate.getDate() + (loan.repayment_cycle as number))
  const currentDateStr = currentDate.toISOString().split('T')[0]

  // Get overdue schedules (payment_date < today AND unpaid)
  const overdueSchedules = await db.select<Record<string, unknown>[]>(
    `SELECT * FROM loan_schedule
     WHERE loan_id = $1 AND payment_date < $2 AND loan_payment_status = 0`,
    [loanId, currentDateStr]
  )

  // Get ALL unpaid schedules
  const allUnpaidSchedules = await db.select<Record<string, unknown>[]>(
    'SELECT * FROM loan_schedule WHERE loan_id = $1 AND loan_payment_status = 0',
    [loanId]
  )

  // Calculate total principal and overdue days from overdue schedules
  let totalPrincipal = 0
  let totalOverdueDays = 0
  for (const sched of overdueSchedules) {
    const paymentDate = new Date(sched.payment_date as string)
    const timeDiff = currentDate.getTime() - paymentDate.getTime()
    const overdueDays = Math.ceil(timeDiff / (1000 * 3600 * 24))
    totalPrincipal += Number(sched.principal)
    totalOverdueDays += overdueDays
  }

  // Calculate overdue interest
  const totalOverdueInterest = totalPrincipal * (overdueInterestRate / 365 * totalOverdueDays)

  // Calculate total unpaid principal and interest from ALL unpaid schedules
  let totalUnpaidPrincipal = 0
  let totalInterest = 0
  for (const sched of allUnpaidSchedules) {
    totalUnpaidPrincipal += Number(sched.principal)
    totalInterest += Number(sched.interest)
  }

  try {
    await db.execute('BEGIN')

    const result = await db.execute(
      `INSERT INTO overdue_schedule (principal, interest, overdue_interest, payment_date, loan_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        roundUp100(totalUnpaidPrincipal),
        roundUp100(totalInterest),
        roundUp100(totalOverdueInterest),
        repaymentDate.toISOString().split('T')[0],
        loanId,
      ]
    )

    await db.execute('COMMIT')
    return result.lastInsertId as number
  } catch (e) {
    await db.execute('ROLLBACK')
    console.error('Transaction rollback on createOverdueSchedule:', e)
    throw e
  }
}

export async function createOverdueTransaction(
  overdueScheduleId: number,
  dto: CreateOverdueTransactionInput
): Promise<Record<string, unknown>> {
  const db = await getDb()

  // Get the overdue schedule with its loan
  const overdueRows = await db.select<Record<string, unknown>[]>(
    `SELECT os.*, l.repayment_cycle
     FROM overdue_schedule os
     LEFT JOIN loan l ON os.loan_id = l.id
     WHERE os.id = $1`,
    [overdueScheduleId]
  )

  if (overdueRows.length === 0) {
    throw new Error('존재하지 않는 연체 스케줄입니다.')
  }

  const overdueSchedule = overdueRows[0]
  const repaymentCycle = overdueSchedule.repayment_cycle as number
  const principal = Number(overdueSchedule.principal)
  const interest = Number(overdueSchedule.interest)
  const overdueInterest = Number(overdueSchedule.overdue_interest)
  const loanId = overdueSchedule.loan_id as number

  // Validate amounts don't exceed owed
  if (
    principal < dto.received_principal ||
    interest < dto.received_interest ||
    overdueInterest < dto.received_overdue_interest
  ) {
    throw new Error('잘못된 입력 금액입니다. 갚아야 하는 금액보다 클 수 없습니다.')
  }

  const remainedPrincipal = roundUp100(principal - dto.received_principal)
  const remainedInterest = roundUp100(interest - dto.received_interest)
  const remainedOverdueInterest = roundUp100(overdueInterest - dto.received_overdue_interest)
  const totalAmount = remainedPrincipal + remainedInterest + remainedOverdueInterest

  const currentDate = new Date()
  const newPaymentDate = new Date(overdueSchedule.payment_date as string)

  if (currentDate.getTime() - newPaymentDate.getTime() < 0) {
    throw new Error('목표 날짜 보다 더 이른 날짜에 기입은 불가능 합니다.')
  }

  const timeDifference = Math.abs(currentDate.getTime() - newPaymentDate.getTime())
  const daysDifference = Math.ceil(timeDifference / (1000 * 3600 * 24))

  let repaymentCycleDays = Math.floor(daysDifference / repaymentCycle)
  repaymentCycleDays = repaymentCycleDays * repaymentCycle

  newPaymentDate.setDate(newPaymentDate.getDate() + repaymentCycle)

  const newOverdueInterest = totalAmount * (dto.overdue_interest_rate / 365 * repaymentCycleDays)

  try {
    await db.execute('BEGIN')

    // Insert overdue transaction
    await db.execute(
      `INSERT INTO overdue_transaction (received_principal, received_interest, received_overdue_interest, overdue_schedule_id)
       VALUES ($1, $2, $3, $4)`,
      [dto.received_principal, dto.received_interest, dto.received_overdue_interest, overdueScheduleId]
    )

    // Insert new overdue schedule (chaining)
    await db.execute(
      `INSERT INTO overdue_schedule (principal, interest, overdue_interest, payment_date, loan_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        remainedPrincipal,
        remainedInterest,
        roundUp100(newOverdueInterest),
        newPaymentDate.toISOString().split('T')[0],
        loanId,
      ]
    )

    await db.execute('COMMIT')
  } catch (e) {
    await db.execute('ROLLBACK')
    console.error('Transaction rollback on createOverdueTransaction:', e)
    throw e
  }

  return {
    principal: remainedPrincipal,
    interest: remainedInterest,
    overdue_interest: roundUp100(newOverdueInterest),
    payment_date: newPaymentDate.toISOString().split('T')[0],
  }
}

// --- Collateral helpers ---

export interface CreateCollateralInput {
  type: string
  name: string
  detail: string
  price?: number
}

export async function createCollateral(input: CreateCollateralInput): Promise<number> {
  const db = await getDb()
  const result = await db.execute(
    `INSERT INTO collateral (type, name, detail, price) VALUES ($1, $2, $3, $4)`,
    [input.type, input.name, input.detail, input.price ?? null]
  )
  return result.lastInsertId as number
}

// --- Guarantor helpers ---

export async function getGuarantors(): Promise<Record<string, unknown>[]> {
  const db = await getDb()
  return db.select<Record<string, unknown>[]>(
    'SELECT id, name, nrc_number, phone_number FROM guarantor ORDER BY name ASC'
  )
}

// --- Loan officer helpers ---

export async function getLoanOfficers(): Promise<Record<string, unknown>[]> {
  const db = await getDb()
  return db.select<Record<string, unknown>[]>(
    `SELECT lo.id, p.name FROM loan_officier lo
     LEFT JOIN personal p ON lo.personnel_id_id = p.id
     ORDER BY lo.id ASC`
  )
}

// --- Overdue search ---

export interface GetOverdueSchedulesParams {
  page?: number
  limit?: number
  name?: string
  start_date?: string
  end_date?: string
}

export async function getOverdueSchedules(
  params: GetOverdueSchedulesParams = {}
): Promise<{ data: Record<string, unknown>[]; total: number }> {
  const db = await getDb()
  const { page = 1, limit = 20, name, start_date, end_date } = params

  const conditions: string[] = []
  const bindings: unknown[] = []
  let bindIdx = 1

  if (name) {
    conditions.push(`c.name LIKE $${bindIdx}`)
    bindings.push(`%${name}%`)
    bindIdx++
  }

  if (start_date) {
    conditions.push(`os.payment_date >= $${bindIdx}`)
    bindings.push(start_date)
    bindIdx++
  }

  if (end_date) {
    conditions.push(`os.payment_date <= $${bindIdx}`)
    bindings.push(end_date)
    bindIdx++
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const countRows = await db.select<{ count: number }[]>(
    `SELECT COUNT(*) as count FROM overdue_schedule os
     LEFT JOIN loan l ON os.loan_id = l.id
     LEFT JOIN customer c ON l.customer_id = c.id
     ${whereClause}`,
    bindings
  )
  const total = countRows[0].count

  const offset = (page - 1) * limit
  const dataBindings = [...bindings, limit, offset]
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT os.*, l.id as loan_id, c.name as customer_name, c.nrc_number as customer_nrc_number,
            ot.id as transaction_id, ot.received_principal, ot.received_interest, ot.received_overdue_interest
     FROM overdue_schedule os
     LEFT JOIN loan l ON os.loan_id = l.id
     LEFT JOIN customer c ON l.customer_id = c.id
     LEFT JOIN overdue_transaction ot ON os.id = ot.overdue_schedule_id
     ${whereClause}
     ORDER BY os.id DESC
     LIMIT $${bindIdx} OFFSET $${bindIdx + 1}`,
    dataBindings
  )

  return { data: rows, total }
}

// --- Delete ---

export async function deleteLoan(id: number): Promise<void> {
  const db = await getDb()

  const loanRows = await db.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM loan WHERE id = $1',
    [id]
  )

  if (loanRows[0].count === 0) {
    throw new Error('존재하지 않는 ID의 대출입니다.')
  }

  await db.execute('DELETE FROM loan WHERE id = $1', [id])
}
