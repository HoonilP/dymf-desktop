// Enum
export enum LoanTypeEnum {
  special_loan,
  group_loan,
  etc,
}
export enum GenderEnum {
  man,
  woman,
  notdefinded,
}
export enum WorkingStatusEnum {
  working,
  notworking,
  etc,
}
export enum LoanStateEnum {
  inprocess,
  overdue,
  complete,
}
export enum RepaymentMethodEnum {
  Equal,
  Equal_Principal,
  Bullet,
}
export enum CollateralTypeEnum {
  Property,
  Car,
}

// Entity Schemas
export interface CpNumberSchema {
  id: number
  area_number: string
  description: string
  created_at: string
  updated_at: string
  version: number
}

export interface CustomerSchema {
  id: number
  name: string
  nrc_number: string
  birth: string
  phone_number: string
  father_name: string
  email?: string
  gender: GenderEnum
  area_number: string
  cp_number_id: number
  loan_type: LoanTypeEnum
  home_address: string
  home_postal_code: string
  office_address?: string
  office_postal_code?: string
  details?: string[]
  family_information?: string[]
  image?: string
}

export interface GetCustomerSchema extends CustomerSchema {
  cp_area_number: string
}

export interface GuarantorSchema {
  id: number
  name: string
  nrc_number: string
  birth: string
  phone_number: string
  father_name: string
  email?: string
  gender: GenderEnum
  area_number: string
  cp_number_id: number
  loan_type: LoanTypeEnum
  home_address: string
  home_postal_code: string
  office_address?: string
  office_postal_code?: string
  details?: string[]
  image?: string
}

export interface GetGuarantorSchema extends GuarantorSchema {
  cp_area_number: string
}

export interface CollateralSchema {
  id: number
  type: CollateralTypeEnum
  name: string
  detail: string
  price?: number
  loan_id?: number
}

export interface CheckPointSchema {
  id: number
  area_number: string
  description: string
}

export interface EmployeeSchema {
  id: number
  name: string
  nrc_number: string
  birth: string
  phone_number: string
  address: string
  email: string
  gender: GenderEnum
  salary: number
  ssb: number
  income_tax: number
  bonus?: number
  working_status: WorkingStatusEnum
  image?: string
}

export interface LoanOfficerSchema {
  id: number
  personnel_id: number
}

export interface LoanSchema {
  id: number
  loan_state: LoanStateEnum
  loan_amount: number
  contract_date: string
  repayment_cycle: number
  interest_rate: number
  number_of_repayment: number
  repayment_method: RepaymentMethodEnum
  overdue_status: boolean
  consulting_info: string[]
}

export interface LoanScheduleSchema {
  id: number
  principal: number
  interest: number
  loan_state: LoanStateEnum
  payment_date: string
  period: number
  remaining_balance: number
  total: number
  loan_payment_status: boolean
}

export interface OverdueLoanScheduleSchema {
  id: number
  principal: number
  interest: number
  overdue_interest: number
  payment_date: string
}

export interface LoanTransactionSchema {
  id: number
  before_re: number
  repayment_amount: number
  is_overdue: boolean
}

export interface OverdueLoanTransactionSchema {
  id: number
  received_principal: number
  received_interest: number
  received_overdue_interest: number
}

export interface GuaranteeSchema {
  id: number
  loan_id: number
  guarantor_id: number
}

export interface FixedAssetSchema {
  id: number
  name: string
  purchase_date: string
  price: number
  method_status: boolean
  depreciation_period?: number
  depreciation_ratio?: number
}

export interface UserSchema {
  id: number
  user_name: string
  password: string
  role: 'admin' | 'paidUser'
  created_at: string
  updated_at: string
  version: number
}

// Report types
export interface LoanPortfolioRow {
  loan_type: string
  count: number
  total_amount: number
  avg_interest_rate: number
  overdue_count: number
}

export interface RepaymentSummaryRow {
  period_label: string
  scheduled_count: number
  paid_count: number
  total_principal: number
  total_interest: number
  collection_rate: number
}

export interface OverdueSummaryRow {
  customer_name: string
  loan_id: number
  overdue_amount: number
  overdue_days: number
  overdue_interest: number
}

export interface CustomerLoanSummaryRow {
  customer_name: string
  customer_id: number
  loan_count: number
  total_amount: number
  overdue_count: number
}
