"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addVoter, bulkImportVoters, removeVoter, resetVoterActivation } from "@/lib/actions/admin";
import { Alert, Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import { voterClasses } from "@/lib/voter-classes";
import {
  detectVoterHeader,
  serializeVoterRowsAsCsv,
  validateVoterImport,
  type VoterImportField,
  type VoterSpreadsheetRow,
} from "@/lib/voter-import";

export type VoterRow = {
  id: string;
  name: string;
  indexNumber: string;
  email: string;
  classGroup: string;
  activated: boolean;
  hasVoted: boolean;
};

function suggestColumns(rows: VoterSpreadsheetRow[]) {
  const detected = detectVoterHeader(rows);
  const columns: Record<VoterImportField, number | ""> = {
    name: detected?.columns.name ?? "",
    indexNumber: detected?.columns.indexNumber ?? "",
    email: detected?.columns.email ?? "",
  };
  const used = new Set(Object.values(columns).filter((column): column is number => column !== ""));

  for (const field of ["name", "indexNumber", "email"] as const) {
    if (columns[field] !== "") continue;
    const unusedColumn = Math.max(3, ...rows.map((row) => row.values.length));
    for (let column = 0; column < unusedColumn; column += 1) {
      if (!used.has(column)) {
        columns[field] = column;
        used.add(column);
        break;
      }
    }
  }

  return { columns, detected };
}

function spreadsheetColumnLabel(columnIndex: number) {
  let column = columnIndex + 1;
  let label = "";
  while (column > 0) {
    const remainder = (column - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    column = Math.floor((column - 1) / 26);
  }
  return label;
}

function isSpreadsheetRow(value: unknown): value is VoterSpreadsheetRow {
  return (
    value !== null &&
    typeof value === "object" &&
    "rowNumber" in value &&
    typeof value.rowNumber === "number" &&
    "values" in value &&
    Array.isArray(value.values) &&
    value.values.every((cell): cell is string => typeof cell === "string")
  );
}

export function AddVoterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [indexNumber, setIndexNumber] = useState("");
  const [email, setEmail] = useState("");
  const [classGroup, setClassGroup] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    startTransition(async () => {
      const result = await addVoter({ name, indexNumber, email, classGroup });
      if (result.ok) {
        setOk(true);
        setName("");
        setIndexNumber("");
        setEmail("");
        setClassGroup("");
        router.refresh();
      } else {
        setError(result.error || "Could not add voter.");
      }
    });
  }

  return (
    <Card>
      <h2 className="mb-1 font-semibold">Add a voter to the register</h2>
      <p className="mb-4 text-sm text-muted">Use this for an omitted student after verifying their eligibility.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="v-name">Full name</Label>
          <Input id="v-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Amina Bello" required />
        </div>
        <div>
          <Label htmlFor="v-index">Index number</Label>
          <Input
            id="v-index"
            value={indexNumber}
            onChange={(e) => setIndexNumber(e.target.value.toUpperCase())}
            placeholder="FCM.21.101.203.05"
            required
          />
        </div>
        <div>
          <Label htmlFor="v-email">School email</Label>
          <Input id="v-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cy-name1234@st.umat.edu.gh" required />
        </div>
        <div>
          <Label htmlFor="v-class">Class</Label>
          <Select id="v-class" value={classGroup} onChange={(e) => setClassGroup(e.target.value)} required>
            <option value="" disabled>Select class</option>
            {voterClasses.map((studentClass) => (
              <option key={studentClass.value} value={studentClass.value}>{studentClass.label}</option>
            ))}
          </Select>
        </div>
        {error && <Alert kind="error">{error}</Alert>}
        {ok && <Alert kind="success">Voter added. They can now activate their account.</Alert>}
        <Button type="submit" disabled={pending}>
          {pending ? "Adding..." : "Add voter"}
        </Button>
      </form>
    </Card>
  );
}

export function BulkImportForm() {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [sheetName, setSheetName] = useState("");
  const [sheets, setSheets] = useState<string[]>([]);
  const [spreadsheetRows, setSpreadsheetRows] = useState<VoterSpreadsheetRow[]>([]);
  const [headerRowNumber, setHeaderRowNumber] = useState(1);
  const [columns, setColumns] = useState<Record<VoterImportField, number | "">>({
    name: "",
    indexNumber: "",
    email: "",
  });
  const [allowedEmailDomains, setAllowedEmailDomains] = useState<string[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [classGroup, setClassGroup] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [imported, setImported] = useState(false);
  const [pending, startTransition] = useTransition();

  const columnCount = Math.max(0, ...spreadsheetRows.map((row) => row.values.length));
  const headerValues = spreadsheetRows.find((row) => row.rowNumber === headerRowNumber)?.values ?? [];
  const dataRows = spreadsheetRows.filter((row) => row.rowNumber > headerRowNumber);
  const validation = useMemo(() => {
    if (columns.name === "" || columns.indexNumber === "" || columns.email === "") return null;
    const mappedColumns = {
      name: columns.name,
      indexNumber: columns.indexNumber,
      email: columns.email,
    };
    return validateVoterImport(
      spreadsheetRows,
      headerRowNumber,
      mappedColumns,
      allowedEmailDomains,
    );
  }, [allowedEmailDomains, columns, headerRowNumber, spreadsheetRows]);
  const review = validation?.rows.map((row) => ({
    row,
    data: validation.checkedRows.get(row.rowNumber),
  })) ?? [];
  const mappingErrors = validation?.issues.filter((issue) => issue.field === "row") ?? [];
  const validRows = review.filter((item) => item.data && item.data.errors.length === 0);
  const invalidRowCount = review.length - validRows.length;

  async function loadSpreadsheet(selectedFile: File, requestedSheet?: string) {
    setLoadingFile(true);
    setError(null);
    setSummary(null);
    setImported(false);
    try {
      const form = new FormData();
      form.append("file", selectedFile);
      if (requestedSheet) form.append("sheetName", requestedSheet);
      const response = await fetch("/api/admin/voters/preview", { method: "POST", body: form });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message = payload !== null && typeof payload === "object" && "error" in payload
          ? payload.error
          : null;
        throw new Error(typeof message === "string" ? message : "Could not read the spreadsheet.");
      }
      if (
        payload === null ||
        typeof payload !== "object" ||
        !("rows" in payload) ||
        !Array.isArray(payload.rows) ||
        !payload.rows.every(isSpreadsheetRow) ||
        !("sheets" in payload) ||
        !Array.isArray(payload.sheets)
      ) {
        throw new Error("The spreadsheet preview response was invalid.");
      }

      const rows = payload.rows as VoterSpreadsheetRow[];
      const sheetNames = payload.sheets.filter((value): value is string => typeof value === "string");
      const { columns: suggested, detected } = suggestColumns(rows);
      setFile(selectedFile);
      setSpreadsheetRows(rows);
      setSheets(sheetNames);
      setSheetName(
        "sheetName" in payload && typeof payload.sheetName === "string"
          ? payload.sheetName
          : sheetNames[0] ?? "",
      );
      setAllowedEmailDomains(
        "allowedEmailDomains" in payload && Array.isArray(payload.allowedEmailDomains)
          ? payload.allowedEmailDomains.filter((value): value is string => typeof value === "string")
          : [],
      );
      setTruncated("truncated" in payload && payload.truncated === true);
      setHeaderRowNumber(rows[detected?.rowIndex ?? 0]?.rowNumber ?? 1);
      setColumns(suggested);
      if (!detected) {
        setError("I couldn't confidently find all three column headings. Choose the header row and map each field below.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read the spreadsheet.");
    } finally {
      setLoadingFile(false);
    }
  }

  function clearSpreadsheet() {
    setFile(null);
    setSheetName("");
    setSheets([]);
    setSpreadsheetRows([]);
    setHeaderRowNumber(1);
    setColumns({ name: "", indexNumber: "", email: "" });
    setTruncated(false);
    setImported(false);
    setError(null);
    setSummary(null);
    setCsv("");
    setFileInputKey((key) => key + 1);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSummary(null);
    if (file && validRows.length === 0) {
      setError("There are no valid rows to import. Fix the fields or column mapping and review the list again.");
      return;
    }
    if (file && validRows.length > 300) {
      setError("Import at most 300 valid students at a time for one class.");
      return;
    }
    const importCsv = file
      ? serializeVoterRowsAsCsv(
          validRows.flatMap((item) =>
            item.data
              ? [[item.data.name, item.data.indexNumber, item.data.email] as [string, string, string]]
              : [],
          ),
        )
      : csv;
    startTransition(async () => {
      const result = await bulkImportVoters({ csv: importCsv, classGroup });
      if (result.ok) {
        const skipped = file && invalidRowCount > 0
          ? ` ${invalidRowCount} row(s) with validation errors were not imported.`
          : "";
        setSummary(`${result.summary || "Import complete."}${skipped}`);
        if (file) {
          setImported(true);
        } else {
          setCsv("");
          setFileInputKey((key) => key + 1);
        }
        router.refresh();
      } else {
        setError(result.error || "Import failed.");
      }
    });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    if (!/\.(xlsx|csv)$/i.test(file.name)) {
      setError("Choose an Excel workbook (.xlsx) or CSV file. Save older .xls files as .xlsx first.");
      input.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Spreadsheet is too large. Keep each upload below 5 MB.");
      input.value = "";
      return;
    }

    setCsv("");
    await loadSpreadsheet(file);
  }

  return (
    <Card>
      <h2 className="mb-1 font-semibold">Bulk import voters</h2>
      <p className="mb-4 text-sm text-muted">
        Upload an Excel workbook or CSV. I’ll find the name, index number, and email columns, check each row, and let you review the list before importing.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="import-class">Class for this list</Label>
          <Select id="import-class" value={classGroup} onChange={(e) => setClassGroup(e.target.value)} required>
            <option value="" disabled>Select class</option>
            {voterClasses.map((studentClass) => (
              <option key={studentClass.value} value={studentClass.value}>{studentClass.label}</option>
            ))}
          </Select>
        </div>
        {!file && (
          <>
            <div>
              <Label htmlFor="voter-csv-file">Excel or CSV file</Label>
              <Input key={fileInputKey} id="voter-csv-file" type="file" accept=".xlsx,.csv" onChange={handleFileChange} className="file:mr-3 file:rounded-lg file:border-0 file:bg-accent-soft file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-accent-contrast" />
              <p className="mt-1 text-xs text-faint">Excel .xlsx or .csv · up to 5 MB · maximum 300 students per class</p>
            </div>
            <Textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={5}
              placeholder={"Or paste CSV rows:\nFull Name, Index Number, Email\nAmina Bello, FCM.21.101.203.01, cs-amina1001@st.umat.edu.gh"}
              className="font-mono text-xs"
            />
          </>
        )}
        {file && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{file.name}</p>
              <p className="text-xs text-muted">{Math.ceil(file.size / 1024)} KB · {spreadsheetRows.length} non-empty rows found</p>
            </div>
            <Button type="button" variant="ghost" className="px-3 py-1.5 text-xs" onClick={clearSpreadsheet}>Choose another file</Button>
          </div>
        )}
        {loadingFile && <Alert kind="info">Reading the workbook and checking its columns...</Alert>}
        {file && sheets.length > 1 && (
          <div>
            <Label htmlFor="voter-sheet">Worksheet</Label>
            <Select
              id="voter-sheet"
              value={sheetName}
              onChange={(e) => {
                setSheetName(e.target.value);
                void loadSpreadsheet(file, e.target.value);
              }}
              disabled={loadingFile}
            >
              {sheets.map((sheet) => <option key={sheet} value={sheet}>{sheet}</option>)}
            </Select>
          </div>
        )}
        {file && spreadsheetRows.length > 0 && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="voter-header-row">Header row</Label>
                <Select
                  id="voter-header-row"
                  value={headerRowNumber}
                  onChange={(e) => {
                    const selectedRowNumber = Number(e.target.value);
                    const selectedHeader = spreadsheetRows.find((row) => row.rowNumber === selectedRowNumber);
                    setHeaderRowNumber(selectedRowNumber);
                    setColumns(suggestColumns(selectedHeader ? [selectedHeader] : []).columns);
                    setError(null);
                    setSummary(null);
                    setImported(false);
                  }}
                  disabled={loadingFile || imported}
                >
                  {spreadsheetRows.slice(0, 20).map((row) => (
                    <option key={row.rowNumber} value={row.rowNumber}>
                      Row {row.rowNumber}: {row.values.filter(Boolean).join(" · ").slice(0, 90)}
                    </option>
                  ))}
                </Select>
              </div>
              {(["name", "indexNumber", "email"] as const).map((field) => (
                <div key={field}>
                  <Label htmlFor={`voter-column-${field}`}>
                    {field === "name" ? "Name column" : field === "indexNumber" ? "Index number column" : "Email column"}
                  </Label>
                  <Select
                    id={`voter-column-${field}`}
                    value={columns[field]}
                    onChange={(e) => setColumns((previous) => ({
                      ...previous,
                      [field]: e.target.value === "" ? "" : Number(e.target.value),
                    }))}
                    disabled={loadingFile || imported}
                  >
                    <option value="">Choose a column</option>
                    {Array.from({ length: columnCount }, (_, columnIndex) => (
                      <option key={columnIndex} value={columnIndex}>
                        {spreadsheetColumnLabel(columnIndex)}
                        {" — "}
                        {headerValues[columnIndex]?.trim() || `Column ${columnIndex + 1}`}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
            {mappingErrors.map((issue) => (
              <Alert key={`${issue.field}-${issue.rowNumber}`} kind="error">{issue.message}</Alert>
            ))}
            {truncated && (
              <Alert kind="error">This worksheet has too many rows to safely review. Split it into files of at most 300 students and upload again.</Alert>
            )}
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="font-semibold text-green-700 dark:text-green-400">{validRows.length} ready to import</span>
              <span className={invalidRowCount ? "font-semibold text-red-600 dark:text-red-400" : "text-muted"}>
                {invalidRowCount} need attention
              </span>
              {dataRows.length > 300 && <span className="font-semibold text-red-600 dark:text-red-400">Over the 300-student limit</span>}
            </div>
            <div className="max-h-80 overflow-auto rounded-xl border border-line">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="sticky top-0 bg-surface text-[10px] uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Index number</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Check</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {review.map(({ row, data }) => (
                    <tr key={row.rowNumber} className={data?.errors.length ? "bg-red-500/5" : ""}>
                      <td className="px-3 py-2 font-mono text-muted">{row.rowNumber}</td>
                      <td className="px-3 py-2">{data?.name}</td>
                      <td className="px-3 py-2 font-mono">{data?.indexNumber}</td>
                      <td className="px-3 py-2">{data?.email}</td>
                      <td className="max-w-64 px-3 py-2">
                        {data?.errors.length === 0 ? (
                          <span className="font-semibold text-green-700 dark:text-green-400">Ready</span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">
                            {data?.errors.join(" ") || "Check column mapping."}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {review.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-muted">No voter rows found below the selected header.</p>
              )}
            </div>
          </>
        )}
        {file && spreadsheetRows.length === 0 && !loadingFile && (
          <Alert kind="error">No non-empty rows were found in this file. Check the selected worksheet or upload another file.</Alert>
        )}
        {error && <Alert kind="error">{error}</Alert>}
        {summary && <Alert kind={summary.includes("Issues") ? "info" : "success"}>{summary}</Alert>}
        <Button
          type="submit"
          disabled={
            pending ||
            loadingFile ||
            imported ||
            !classGroup ||
            (file
              ? validRows.length === 0 || dataRows.length > 300 || truncated
              : !csv.trim())
          }
        >
          {pending ? "Importing..." : file ? `Import ${validRows.length} checked voter(s)` : "Import voters"}
        </Button>
      </form>
    </Card>
  );
}

export function VoterRowActions({ voter, isSuperAdmin }: { voter: VoterRow; isSuperAdmin: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div className="flex justify-end gap-1">
      {!voter.hasVoted && voter.activated && (
        <Button
          variant="ghost"
          className="px-2 py-1 text-xs"
          disabled={pending}
          onClick={() => {
            if (window.confirm(`Reset activation for ${voter.name}? They will need a new code to set a password again.`)) {
              run(() => resetVoterActivation(voter.id));
            }
          }}
        >
          Reset
        </Button>
      )}
      {isSuperAdmin && !voter.hasVoted && (
        <Button
          variant="ghost"
          className="px-2 py-1 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          disabled={pending}
          onClick={() => {
            if (window.confirm(`Remove ${voter.name} (${voter.indexNumber}) from the voter register?`)) {
              run(() => removeVoter(voter.id));
            }
          }}
        >
          Remove
        </Button>
      )}
    </div>
  );
}
