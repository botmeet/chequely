import * as XLSX from "xlsx";

export interface ChequeExportRow {
  "Cheque Date": string;
  "Cheque Number": string;
  Direction: string;
  Party: string;
  "Bank Account / Payer Bank": string;
  "Amount (INR)": number;
  Status: string;
  "Is PDC": string;
  "Deposit Date": string;
  "Linked Bills": string;
  Remarks: string;
}

export interface BillExportRow {
  "Bill Date": string;
  "Bill Number": string;
  Direction: string;
  Party: string;
  "Due Date": string;
  "Total Amount (INR)": number;
  "Paid Amount (INR)": number;
  "Unpaid Amount (INR)": number;
  Status: string;
  Notes: string;
}

export interface LedgerExportRow {
  Date: string;
  Type: string;
  Reference: string;
  "Debit (Sale / Receivable)": number | "";
  "Credit (Receipt / Cheque)": number | "";
  "Running Balance": number;
}

/**
 * Export rows to an Excel workbook and trigger browser download
 */
export function downloadExcelFile(
  data: Record<string, unknown>[],
  sheetName: string,
  fileName: string
) {
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Freeze top row
  worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

/**
 * Full Multi-Sheet Backup Export (EX-2)
 */
export function downloadFullBackupExcel({
  cheques,
  bills,
  parties,
  accounts,
}: {
  cheques: Record<string, unknown>[];
  bills: Record<string, unknown>[];
  parties: Record<string, unknown>[];
  accounts: Record<string, unknown>[];
}) {
  const workbook = XLSX.utils.book_new();

  const wsCheques = XLSX.utils.json_to_sheet(cheques);
  wsCheques["!freeze"] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(workbook, wsCheques, "Cheques");

  const wsBills = XLSX.utils.json_to_sheet(bills);
  wsBills["!freeze"] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(workbook, wsBills, "Bills");

  const wsParties = XLSX.utils.json_to_sheet(parties);
  wsParties["!freeze"] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(workbook, wsParties, "Parties");

  const wsAccounts = XLSX.utils.json_to_sheet(accounts);
  wsAccounts["!freeze"] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(workbook, wsAccounts, "Bank Accounts");

  const todayStr = new Date().toISOString().split("T")[0];
  XLSX.writeFile(workbook, `Chequely_Full_Backup_${todayStr}.xlsx`);
}

