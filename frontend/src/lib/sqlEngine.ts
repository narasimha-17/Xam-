import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";

let sqlJsPromise: Promise<SqlJsStatic> | null = null;

/** Loads the real SQLite-over-WebAssembly engine once and reuses it — this is a genuine SQL
 * engine (not a hand-rolled parser), so query semantics (joins, aggregates, etc.) are correct. */
export function loadSqlJs(): Promise<SqlJsStatic> {
  if (!sqlJsPromise) {
    sqlJsPromise = initSqlJs({ locateFile: () => "/sql-wasm.wasm" });
  }
  return sqlJsPromise;
}

export function buildDatabase(SQL: SqlJsStatic, setup: string[]): Database {
  const db = new SQL.Database();
  for (const stmt of setup) db.exec(stmt);
  return db;
}

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  error: string | null;
}

export function runQuery(db: Database, sql: string): QueryResult {
  try {
    const results = db.exec(sql);
    if (results.length === 0) return { columns: [], rows: [], error: null };
    const last = results[results.length - 1];
    return { columns: last.columns, rows: last.values, error: null };
  } catch (e) {
    return { columns: [], rows: [], error: e instanceof Error ? e.message : String(e) };
  }
}

function normalizeRows(rows: unknown[][]): string[][] {
  return rows.map((r) => r.map((v) => (v === null || v === undefined ? "NULL" : String(v))));
}

/** Compares two result sets by value only (column names/aliases don't have to match) —
 * orderMatters should be true only for levels that specifically teach ORDER BY / LIMIT. */
export function rowsMatch(a: unknown[][], b: unknown[][], orderMatters: boolean): boolean {
  if (a.length !== b.length) return false;
  const na = normalizeRows(a);
  const nb = normalizeRows(b);
  if (orderMatters) {
    return na.every((row, i) => row.length === nb[i].length && row.every((v, j) => v === nb[i][j]));
  }
  const key = (rows: string[][]) => rows.map((r) => r.join("")).sort();
  const ka = key(na);
  const kb = key(nb);
  return ka.every((v, i) => v === kb[i]);
}

/** Shared correctness check for levels that teach a SELECT: re-runs the reference solution
 * against the same live db and compares it to what the student's last query produced. */
export function matchesSolution(
  db: Database,
  solutionSql: string,
  lastResult: QueryResult | null,
  orderMatters = false,
): boolean {
  if (!lastResult || lastResult.error) return false;
  const solution = runQuery(db, solutionSql);
  if (solution.error) return false;
  return rowsMatch(lastResult.rows, solution.rows, orderMatters);
}
