/**
 * Base de datos falsa en memoria para los tests (imita lo mínimo del cliente
 * de Supabase que usa el código de correos). Solo se importa desde tests.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

export interface FakeOptions {
  /** Columnas que "no existen" (migración sin aplicar): tabla -> columnas. */
  missing?: Record<string, string[]>;
  /** Relaciones embebidas: tabla -> nombre -> { fk, table, many }. */
  rels?: Record<string, Record<string, { fk: string; table: string; many?: boolean }>>;
}

let seq = 0;

export function makeFakeDb(tables: Record<string, Row[]>, opts: FakeOptions = {}) {
  const calls: { table: string; op: string; patch?: Row }[] = [];

  function colsOf(select: string): string[] {
    const flat = select.replace(/\w+\([^()]*(?:\([^()]*\)[^()]*)*\)/g, "");
    return flat.split(",").map((c) => c.trim()).filter((c) => c && c !== "*");
  }

  function from(table: string) {
    const st: any = { table, op: "select", filters: [] as ((r: Row) => boolean)[], selectStr: "*", single: false, maybe: false, head: false, limit: null };
    const missing = opts.missing?.[table] ?? [];

    const run = (): { data: any; error: any; count?: number } => {
      calls.push({ table, op: st.op, patch: st.patch });
      const bad = (cols: string[]) => cols.find((c) => missing.includes(c));
      const rows = tables[table] ?? (tables[table] = []);
      if (st.op === "insert") {
        const b = bad(Object.keys(st.patch));
        if (b) return { data: null, error: { code: "42703", message: `column ${b} does not exist` } };
        const row = { id: `id-${++seq}`, created_at: new Date().toISOString(), ...st.patch };
        rows.push(row);
        return finish([row]);
      }
      if (bad(colsOf(st.selectStr))) {
        return { data: null, error: { code: "42703", message: `column ${bad(colsOf(st.selectStr))} does not exist` } };
      }
      let matched = rows.filter((r) => st.filters.every((f: (r: Row) => boolean) => f(r)));
      if (st.op === "update") {
        const b = bad(Object.keys(st.patch));
        if (b) return { data: null, error: { code: "42703", message: `column ${b} does not exist` } };
        matched.forEach((r) => Object.assign(r, st.patch));
        return finish(matched);
      }
      if (st.op === "delete") {
        tables[table] = rows.filter((r) => !matched.includes(r));
        return finish(matched);
      }
      if (st.order) {
        const { col, asc } = st.order;
        matched = [...matched].sort((a, b) => (a[col] > b[col] ? 1 : -1) * (asc ? 1 : -1));
      }
      if (st.range) matched = matched.slice(st.range[0], st.range[1] + 1);
      if (st.limit != null) matched = matched.slice(0, st.limit);
      return finish(matched);
    };

    const embed = (r: Row): Row => {
      const out = { ...r };
      for (const m of st.selectStr.matchAll(/(\w+)\(/g)) {
        const name = m[1];
        const rel = opts.rels?.[table]?.[name];
        if (!rel) continue;
        const target = tables[rel.table] ?? [];
        out[name] = rel.many ? target.filter((t) => t[rel.fk] === r.id) : (target.find((t) => t.id === r[rel.fk]) ?? null);
      }
      return out;
    };

    const finish = (rows: Row[]) => {
      if (st.head) return { data: null, error: null, count: rows.length };
      const shaped = st.op === "select" || st.returning ? rows.map(embed) : rows;
      if (st.single) return shaped.length === 1 ? { data: shaped[0], error: null } : { data: null, error: { code: "PGRST116", message: "none" } };
      if (st.maybe) return { data: shaped[0] ?? null, error: null };
      return { data: shaped, error: null };
    };

    const b: any = {
      select(cols = "*", o?: { count?: string; head?: boolean }) {
        if (st.op === "select") st.selectStr = cols;
        else {
          st.returning = true;
          st.selectStr = cols;
        }
        if (o?.head) st.head = true;
        return b;
      },
      update(patch: Row) {
        st.op = "update";
        st.patch = patch;
        return b;
      },
      insert(patch: Row) {
        st.op = "insert";
        st.patch = patch;
        return b;
      },
      delete() {
        st.op = "delete";
        return b;
      },
      eq(c: string, v: any) { st.filters.push((r: Row) => r[c] === v); return b; },
      neq(c: string, v: any) { st.filters.push((r: Row) => r[c] !== v); return b; },
      is(c: string, v: any) { st.filters.push((r: Row) => (r[c] ?? null) === v); return b; },
      in(c: string, v: any[]) { st.filters.push((r: Row) => v.includes(r[c])); return b; },
      gte(c: string, v: any) { st.filters.push((r: Row) => r[c] != null && r[c] >= v); return b; },
      lt(c: string, v: any) { st.filters.push((r: Row) => r[c] != null && r[c] < v); return b; },
      order(col: string, o?: { ascending?: boolean }) { st.order = { col, asc: o?.ascending !== false }; return b; },
      range(a: number, z: number) { st.range = [a, z]; return b; },
      limit(n: number) { st.limit = n; return b; },
      returns() { return b; },
      single() { st.single = true; return b; },
      maybeSingle() { st.maybe = true; return b; },
      then(res: (v: any) => any, rej?: (e: any) => any) {
        try {
          return Promise.resolve(run()).then(res, rej);
        } catch (e) {
          return Promise.reject(e).then(res, rej);
        }
      },
    };
    return b;
  }

  return { client: { from } as any, tables, calls };
}
