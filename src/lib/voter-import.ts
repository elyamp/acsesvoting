export type VoterImportField = "name" | "indexNumber" | "email";

export type VoterSpreadsheetRow = {
  rowNumber: number;
  values: string[];
};

export type VoterImportCheck = {
  name: string;
  indexNumber: string;
  email: string;
  errors: string[];
};

export type VoterImportIssue = {
  rowNumber: number;
  field: VoterImportField | "row" | "duplicate";
  message: string;
};

const fieldAliases: Record<VoterImportField, string[]> = {
  name: ["name", "fullname", "studentname", "studentfullname", "nameofstudent"],
  indexNumber: [
    "index",
    "indexno",
    "indexnum",
    "indexnumber",
    "studentid",
    "studentnumber",
    "registrationnumber",
    "regno",
  ],
  email: ["email", "emailaddress", "studentemail", "school email"],
};

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function headerScore(value: string, field: VoterImportField) {
  const normalized = normalizeHeader(value);
  const aliases = fieldAliases[field].map(normalizeHeader);
  if (!normalized) return 0;
  if (aliases.includes(normalized)) return 10;
  return aliases.some((alias) => alias.length > 3 && normalized.includes(alias)) ? 5 : 0;
}

export function detectVoterHeader(rows: VoterSpreadsheetRow[]) {
  let best: { rowIndex: number; columns: Partial<Record<VoterImportField, number>>; score: number } | null = null;

  for (const [rowIndex, row] of rows.slice(0, 20).entries()) {
    const columns: Partial<Record<VoterImportField, number>> = {};
    const usedColumns = new Set<number>();
    let score = 0;

    for (const field of ["name", "indexNumber", "email"] as const) {
      const matches = row.values
        .map((value, columnIndex) => ({ columnIndex, score: headerScore(value, field) }))
        .filter(({ columnIndex, score: matchScore }) => matchScore > 0 && !usedColumns.has(columnIndex))
        .sort((a, b) => b.score - a.score);
      const match = matches[0];
      if (match) {
        columns[field] = match.columnIndex;
        usedColumns.add(match.columnIndex);
        score += match.score;
      }
    }

    if (Object.keys(columns).length >= 2 && (!best || score > best.score)) {
      best = { rowIndex, columns, score };
    }
  }

  return best;
}

export function serializeVoterRowsAsCsv(rows: Array<[string, string, string]>) {
  return rows
    .map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

export function validateVoterImport(
  rows: VoterSpreadsheetRow[],
  headerRowNumber: number,
  columns: Record<VoterImportField, number>,
  allowedEmailDomains: string[],
) {
  const dataRows = rows.filter((row) => row.rowNumber > headerRowNumber);
  const indexCounts = new Map<string, number>();
  const emailCounts = new Map<string, number>();
  const checkedRows = new Map<number, VoterImportCheck>();
  const duplicateIssues: VoterImportIssue[] = [];

  if (new Set(Object.values(columns)).size !== 3) {
    return {
      rows: [] as VoterSpreadsheetRow[],
      checkedRows,
      issues: [{
        rowNumber: headerRowNumber,
        field: "row" as const,
        message: "Map name, index number, and email to different columns.",
      }],
    };
  }

  for (const row of dataRows) {
    const indexNumber = (row.values[columns.indexNumber] ?? "").trim().toUpperCase();
    const email = (row.values[columns.email] ?? "").trim().toLowerCase();
    if (indexNumber) indexCounts.set(indexNumber, (indexCounts.get(indexNumber) ?? 0) + 1);
    if (email) emailCounts.set(email, (emailCounts.get(email) ?? 0) + 1);
  }

  for (const row of dataRows) {
    const values = [
      row.values[columns.name] ?? "",
      row.values[columns.indexNumber] ?? "",
      row.values[columns.email] ?? "",
    ];
    const errors: string[] = [];
    const name = values[0].trim();
    const indexNumber = values[1].trim().toUpperCase();
    const email = values[2].trim().toLowerCase();

    if (name.length < 2 || name.length > 120) errors.push("Name must be between 2 and 120 characters.");
    if (!/^FCM\.\d{2}\.\d{3}\.\d{3}\.\d{2}$/.test(indexNumber)) {
      errors.push("Index number must look like FCM.00.000.000.00.");
    }
    if (
      !/^[a-z]{2}-[a-z.]+[0-9]+@st\.umat\.edu\.gh$/.test(email)
    ) {
      errors.push("Enter a valid UMAT school email, e.g. cy-name1234@st.umat.edu.gh.");
    }

    const domain = email.split("@")[1];
    if (allowedEmailDomains.length > 0 && domain && !allowedEmailDomains.includes(domain)) {
      errors.push(`Email domain not allowed. Expected: ${allowedEmailDomains.join(", ")}.`);
    }

    if ((indexCounts.get(indexNumber) ?? 0) > 1 && indexNumber) {
      duplicateIssues.push({
        rowNumber: row.rowNumber,
        field: "duplicate",
        message: "Index number is duplicated in this file.",
      });
      errors.push("Index number is duplicated in this file.");
    }
    if ((emailCounts.get(email) ?? 0) > 1 && email) {
      duplicateIssues.push({
        rowNumber: row.rowNumber,
        field: "duplicate",
        message: "Email is duplicated in this file.",
      });
      errors.push("Email is duplicated in this file.");
    }
    checkedRows.set(row.rowNumber, { name, indexNumber, email, errors });
  }

  return { rows: dataRows, checkedRows, issues: duplicateIssues };
}
