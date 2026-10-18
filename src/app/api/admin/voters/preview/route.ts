import ExcelJS from "exceljs";
import { Readable } from "node:stream";
import { getSession, isSameOriginRequest } from "@/lib/auth";
import type { VoterSpreadsheetRow } from "@/lib/voter-import";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_NONEMPTY_ROWS = 400;
const MAX_WORKSHEET_ROWS = 100_000;
const MAX_COLUMNS = 100;

function csvRows(text: string): VoterSpreadsheetRow[] {
  const rows: VoterSpreadsheetRow[] = [];
  let values: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(value.trim());
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      values.push(value.trim());
      if (values.some(Boolean)) rows.push({ rowNumber: rows.length + 1, values });
      values = [];
      value = "";
    } else {
      value += character;
    }
  }

  if (quoted) throw new Error("The CSV contains an unclosed quoted field.");
  values.push(value.trim());
  if (values.some(Boolean)) rows.push({ rowNumber: rows.length + 1, values });
  return rows;
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  if ("text" in value && typeof value.text === "string") return value.text.trim();
  if ("richText" in value) return value.richText.map((part) => part.text).join("").trim();
  if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
  return "";
}

export async function POST(request: Request) {
  const requestOrigin = request.headers.get("origin") ?? request.headers.get("referer");
  if (!isSameOriginRequest(requestOrigin, null, new URL(request.url).host)) {
    return Response.json({ error: "Request origin is not trusted." }, { status: 403 });
  }

  const session = await getSession();
  if (!session || session.kind !== "admin") {
    return Response.json({ error: "Admin access required." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Choose an .xlsx or .csv file." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Choose an .xlsx or .csv file." }, { status: 400 });
  }
  if (file.size === 0) return Response.json({ error: "The selected file is empty." }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) {
    return Response.json({ error: "Spreadsheet must be 4 MB or smaller." }, { status: 413 });
  }

  const extension = file.name.toLowerCase().split(".").pop();
  if (extension !== "xlsx" && extension !== "csv") {
    return Response.json({ error: "Use an Excel .xlsx workbook or a .csv file. Legacy .xls files are not supported." }, { status: 415 });
  }

  let sheets: string[];
  let sheetName: string;
  let rows: VoterSpreadsheetRow[];
  let truncated = false;

  if (extension === "csv") {
    sheets = ["CSV"];
    sheetName = "CSV";
    try {
      rows = csvRows(await file.text());
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Could not parse the CSV file." },
        { status: 400 },
      );
    }
    if (rows.some((row) => row.values.length > MAX_COLUMNS)) {
      return Response.json({ error: "This file has too many columns. Keep spreadsheets to 100 columns or fewer." }, { status: 413 });
    }
  } else {
    const workbook = new ExcelJS.Workbook();
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      await workbook.xlsx.read(Readable.from([bytes]));
    } catch {
      return Response.json({ error: "Could not read this Excel workbook. Check that it is a valid .xlsx file." }, { status: 400 });
    }

    sheets = workbook.worksheets.map((worksheet) => worksheet.name);
    const requestedSheet = form.get("sheetName");
    sheetName = typeof requestedSheet === "string" && sheets.includes(requestedSheet)
      ? requestedSheet
      : sheets[0];
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) return Response.json({ error: "The selected worksheet could not be found." }, { status: 400 });
    if (worksheet.rowCount > MAX_WORKSHEET_ROWS) {
      return Response.json({ error: "This worksheet contains too many rows to safely review." }, { status: 413 });
    }

    rows = [];
    let tooWide = false;
    worksheet.eachRow((row, rowNumber) => {
      if (row.cellCount > MAX_COLUMNS) {
        tooWide = true;
        return;
      }
      const values = Array.from({ length: row.cellCount }, (_, index) => cellText(row.getCell(index + 1).value));
      if (values.some(Boolean)) {
        if (rows.length < MAX_NONEMPTY_ROWS) rows.push({ rowNumber, values });
        else truncated = true;
      }
    });
    if (tooWide) {
      return Response.json({ error: "This worksheet has too many columns. Keep spreadsheets to 100 columns or fewer." }, { status: 413 });
    }
  }

  const allowedEmailDomains = (process.env.ALLOWED_EMAIL_DOMAINS || "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);

  return Response.json({ sheetName, sheets, rows, truncated, allowedEmailDomains });
}
