export type AccountType = 'current' | 'savings' | 'od_cc';
export type PartyType = 'customer' | 'supplier' | 'both';
export type Direction = 'sale' | 'purchase'; // For bills: sale = receivable, purchase = payable
export type ChequeDirection = 'received' | 'issued';
export type PayeeType = 'account_payee' | 'bearer';

export type ReceivedChequeStatus = 'received' | 'deposited' | 'cleared' | 'bounced';
export type IssuedChequeStatus = 'issued' | 'presented' | 'cleared' | 'bounced' | 'stopped' | 'cancelled';
export type ChequeStatus = ReceivedChequeStatus | IssuedChequeStatus;

export type BillPaymentStatus = 'unpaid' | 'partly_paid' | 'paid';

export interface Profile {
  user_id: string;
  business_name: string | null;
  gstin: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankAccount {
  id: number;
  user_id: string;
  nickname: string;
  bank_name: string;
  branch: string | null;
  ifsc: string | null;
  last_four_digits: string;
  account_type: AccountType;
  opening_balance: number;
  opening_balance_date: string;
  is_default: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Party {
  id: number;
  user_id: string;
  name: string;
  party_type: PartyType;
  phone: string | null;
  gstin: string | null;
  address: string | null;
  notes: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Bill {
  id: number;
  user_id: string;
  party_id: number;
  direction: Direction;
  bill_number: string;
  bill_date: string;
  due_date: string | null;
  amount: number;
  notes: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  // joined fields
  parties?: Party;
}

export interface Cheque {
  id: number;
  user_id: string;
  party_id: number;
  bank_account_id: number | null;
  direction: ChequeDirection;
  cheque_number: string;
  cheque_date: string;
  amount: number;
  payer_bank: string | null;
  payer_branch: string | null;
  payee_type: PayeeType;
  is_post_dated: boolean;
  deposit_date: string | null;
  status: ChequeStatus;
  bounce_reason: string | null;
  bounce_charges: number | null;
  cleared_date: string | null;
  remarks: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  // joined fields
  parties?: Party;
  bank_accounts?: BankAccount;
  cheque_bill_links?: ChequeBillLink[];
}

export interface ChequeStatusHistory {
  id: number;
  user_id: string;
  cheque_id: number;
  old_status: string | null;
  new_status: string;
  changed_at: string;
  notes: string | null;
}

export interface ChequeBillLink {
  id: number;
  user_id: string;
  cheque_id: number;
  bill_id: number;
  amount_applied: number;
  created_at: string;
  // joined
  bills?: Bill;
  cheques?: Cheque;
}

export interface ChequeBook {
  id: number;
  user_id: string;
  bank_account_id: number;
  series_start: string;
  series_end: string;
  total_leaves: number;
  used_leaves: number;
  notes: string | null;
  created_at: string;
}

export interface Attachment {
  id: number;
  user_id: string;
  entity_type: 'cheque' | 'bill';
  entity_id: number;
  file_path: string;
  thumbnail_path: string | null;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

export interface AuditLogEntry {
  id: number;
  user_id: string;
  table_name: string;
  record_id: number;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_at: string;
}

// Views
export interface BillStatusView {
  bill_id: number;
  user_id: string;
  party_id: number;
  direction: Direction;
  bill_number: string;
  bill_date: string;
  due_date: string | null;
  bill_amount: number;
  notes: string | null;
  is_deleted: boolean;
  paid_amount: number;
  unpaid_amount: number;
  payment_status: BillPaymentStatus;
  is_overdue: boolean;
  parties?: Party;
}

export interface PartyOutstandingView {
  party_id: number;
  user_id: string;
  party_name: string;
  party_type: PartyType;
  phone: string | null;
  is_deleted: boolean;
  total_receivable: number;
  total_payable: number;
  net_balance: number;
}

export interface ChequeAlertView {
  entity_id: number;
  user_id: string;
  alert_type: 'post_dated_due' | 'issued_uncleared' | 'bounced' | 'expiring_soon' | 'overdue_bill';
  severity: 'High' | 'Medium' | 'Low';
  title: string;
  description: string;
  alert_date: string;
  amount: number;
}

