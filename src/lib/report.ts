import { getDb } from './database'
import type {
  LoanPortfolioRow,
  RepaymentSummaryRow,
  OverdueSummaryRow,
  CustomerLoanSummaryRow,
} from '@/types'

export async function getLoanPortfolioSummary(): Promise<LoanPortfolioRow[]> {
  const db = await getDb()
  const rows = await db.select<LoanPortfolioRow[]>(
    `SELECT
       c.loan_type AS loan_type,
       COUNT(l.id) AS count,
       COALESCE(SUM(l.loan_amount), 0) AS total_amount,
       COALESCE(AVG(l.interest_rate), 0) AS avg_interest_rate,
       COALESCE(SUM(CASE WHEN l.overdue_status = 1 THEN 1 ELSE 0 END), 0) AS overdue_count
     FROM loan l
     JOIN customer c ON l.customer_id = c.id
     GROUP BY c.loan_type`
  )
  return rows
}

export async function getRepaymentSummary(
  startDate?: string,
  endDate?: string
): Promise<RepaymentSummaryRow[]> {
  const db = await getDb()
  let whereClause = ''
  const params: string[] = []

  if (startDate) {
    whereClause += ' AND ls.payment_date >= ?'
    params.push(startDate)
  }
  if (endDate) {
    whereClause += ' AND ls.payment_date <= ?'
    params.push(endDate)
  }

  const rows = await db.select<RepaymentSummaryRow[]>(
    `SELECT
       substr(ls.payment_date, 1, 7) AS period_label,
       COUNT(ls.id) AS scheduled_count,
       COALESCE(SUM(CASE WHEN ls.loan_payment_status = 1 THEN 1 ELSE 0 END), 0) AS paid_count,
       COALESCE(SUM(ls.principal), 0) AS total_principal,
       COALESCE(SUM(ls.interest), 0) AS total_interest,
       CASE
         WHEN COUNT(ls.id) = 0 THEN 0
         ELSE ROUND(CAST(SUM(CASE WHEN ls.loan_payment_status = 1 THEN 1 ELSE 0 END) AS REAL) / COUNT(ls.id) * 100, 1)
       END AS collection_rate
     FROM loan_schedule ls
     WHERE 1=1${whereClause}
     GROUP BY substr(ls.payment_date, 1, 7)
     ORDER BY period_label DESC`,
    params
  )
  return rows
}

export async function getOverdueSummary(): Promise<OverdueSummaryRow[]> {
  const db = await getDb()
  const rows = await db.select<OverdueSummaryRow[]>(
    `SELECT
       c.name AS customer_name,
       os.loan_id AS loan_id,
       COALESCE(os.principal + os.interest, 0) AS overdue_amount,
       CAST(julianday('now') - julianday(os.payment_date) AS INTEGER) AS overdue_days,
       COALESCE(os.overdue_interest, 0) AS overdue_interest
     FROM overdue_schedule os
     JOIN loan l ON os.loan_id = l.id
     JOIN customer c ON l.customer_id = c.id
     ORDER BY overdue_days DESC`
  )
  return rows
}

export async function getCustomerLoanSummary(): Promise<CustomerLoanSummaryRow[]> {
  const db = await getDb()
  const rows = await db.select<CustomerLoanSummaryRow[]>(
    `SELECT
       c.name AS customer_name,
       c.id AS customer_id,
       COUNT(l.id) AS loan_count,
       COALESCE(SUM(l.loan_amount), 0) AS total_amount,
       COALESCE(SUM(CASE WHEN l.overdue_status = 1 THEN 1 ELSE 0 END), 0) AS overdue_count
     FROM customer c
     LEFT JOIN loan l ON l.customer_id = c.id
     GROUP BY c.id, c.name
     ORDER BY total_amount DESC`
  )
  return rows
}
