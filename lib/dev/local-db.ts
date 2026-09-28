import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// Local demo database for development: a small PostgREST-compatible subset served
// through supabase-js's custom `fetch`, persisted to .data/local-db.json.
// Enabled only when LOCAL_DEMO_DB=1 and NODE_ENV is not production (see isLocalDemoDbEnabled).
// It supports what this app uses: select/insert/upsert/update/delete, eq/neq/gt/gte/lt/lte/in/is
// filters, order, limit, count and single-row responses. It is not a real database.

type Row = Record<string, unknown>;
type Db = Record<string, Row[]>;

const FILE = process.env.LOCAL_DEMO_DB_FILE || path.join(/* turbopackIgnore: true */ process.cwd(), '.data', 'local-db.json');

// Mirrors the unique keys and column defaults of supabase/migrations.
const UNIQUE_KEYS: Record<string, string[][]> = {
  farmz3d_orders: [['order_number']],
  business_decisions: [['decision_id']],
  business_decision_positions: [['decision_id', 'person']],
  business_decision_mediations: [['decision_id']],
  farmz3d_order_triage: [['order_number']],
  farmz3d_products: [['id']],
};

function defaults(table: string): Row {
  const now = new Date().toISOString();
  const base: Row = { id: randomUUID(), created_at: now };
  if (table === 'farmz3d_orders') return { ...base, status: 'new', shipping_cents: 0, payment_status: 'unpaid', updated_at: now };
  if (table === 'farmz3d_products') {
    return { ...base, description: '', personalization_hint: '', required_details: '', unit_label: 'each', emoji: '🎁', low_stock_at: 3, active: true, sort_order: 0, updated_at: now };
  }
  if (table === 'business_decisions') return { ...base, decided_at: now };
  if (table === 'business_decision_positions') return { ...base, updated_at: now };
  return base;
}

export function isLocalDemoDbEnabled() {
  return process.env.LOCAL_DEMO_DB === '1' && process.env.NODE_ENV !== 'production';
}

// Read on every request: Next.js dev loads this module separately per route,
// so an in-memory copy would go stale between the API routes and the pages.
function load(): Db {
  try {
    return existsSync(FILE) ? (JSON.parse(readFileSync(FILE, 'utf8')) as Db) : {};
  } catch {
    return {};
  }
}

function save(db: Db) {
  mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(db, null, 2));
  renameSync(tmp, FILE);
}

function parseValue(raw: string): unknown {
  if (raw === 'null') return null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return raw;
}

function compare(a: unknown, b: unknown) {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  const numA = Number(a);
  const numB = Number(b);
  if (typeof a === 'number' || (!Number.isNaN(numA) && !Number.isNaN(numB) && String(a).trim() !== '' && String(b).trim() !== '')) {
    return numA < numB ? -1 : numA > numB ? 1 : 0;
  }
  return String(a) < String(b) ? -1 : 1;
}

const RESERVED = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns']);

function matches(row: Row, params: URLSearchParams) {
  for (const [column, expression] of params) {
    if (RESERVED.has(column)) continue;
    const dot = expression.indexOf('.');
    const op = expression.slice(0, dot);
    const raw = expression.slice(dot + 1);
    const value = row[column];
    switch (op) {
      case 'eq':
        if (String(value) !== raw) return false;
        break;
      case 'neq':
        if (String(value) === raw) return false;
        break;
      case 'gt':
        if (!(compare(value, raw) > 0)) return false;
        break;
      case 'gte':
        if (!(compare(value, raw) >= 0)) return false;
        break;
      case 'lt':
        if (!(compare(value, raw) < 0)) return false;
        break;
      case 'lte':
        if (!(compare(value, raw) <= 0)) return false;
        break;
      case 'in': {
        const list = raw.replace(/^\(|\)$/g, '').split(',').map((item) => item.replace(/^"|"$/g, ''));
        if (!list.includes(String(value))) return false;
        break;
      }
      case 'is':
        if (value !== parseValue(raw) && !(raw === 'null' && value === undefined)) return false;
        break;
      default:
        // Unsupported operators are ignored rather than silently matching nothing.
        break;
    }
  }
  return true;
}

function applyOrder(rows: Row[], order: string | null) {
  if (!order) return rows;
  const keys = order.split(',').map((part) => {
    const [column, ...modifiers] = part.split('.');
    return { column, desc: modifiers.includes('desc') };
  });
  return [...rows].sort((a, b) => {
    for (const key of keys) {
      const result = compare(a[key.column], b[key.column]);
      if (result !== 0) return key.desc ? -result : result;
    }
    return 0;
  });
}

function findConflict(table: string, rows: Row[], row: Row, onConflict: string | null) {
  const keySets = onConflict ? [onConflict.split(',')] : (UNIQUE_KEYS[table] ?? []);
  for (const keys of keySets) {
    const index = rows.findIndex((existing) => keys.every((key) => existing[key] === row[key]));
    if (index >= 0) return index;
  }
  return -1;
}

function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

export async function localDemoFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  const prefer = headers.get('prefer') ?? '';

  if (!url.pathname.startsWith('/rest/v1/')) return json(404, { message: 'Local demo DB only serves /rest/v1.' });

  const table = decodeURIComponent(url.pathname.slice('/rest/v1/'.length));
  const db = load();
  const rows = (db[table] ??= []);
  const params = url.searchParams;
  const wantsRows = prefer.includes('return=representation');
  const single = (headers.get('accept') ?? '').includes('vnd.pgrst.object+json');

  if (method === 'GET' || method === 'HEAD') {
    const matched = applyOrder(rows.filter((row) => matches(row, params)), params.get('order'));
    const offset = Number(params.get('offset') ?? 0);
    const limit = params.has('limit') ? Number(params.get('limit')) : matched.length;
    const page = matched.slice(offset, offset + limit);
    const range = { 'content-range': `${page.length ? `${offset}-${offset + page.length - 1}` : '*'}/${matched.length}` };
    if (method === 'HEAD') return new Response(null, { status: 200, headers: range });
    if (single) {
      return page.length === 1
        ? json(200, page[0], range)
        : json(406, { code: 'PGRST116', message: `JSON object requested, ${page.length} rows returned`, details: null, hint: null });
    }
    return json(200, page, range);
  }

  const body = init.body ? JSON.parse(String(init.body)) : null;

  if (method === 'POST') {
    const items: Row[] = Array.isArray(body) ? body : [body];
    const upsert = prefer.includes('resolution=merge-duplicates');
    const written: Row[] = [];
    for (const item of items) {
      const index = findConflict(table, rows, item, params.get('on_conflict'));
      if (index >= 0 && !upsert) {
        return json(409, { code: '23505', message: `duplicate key value violates unique constraint on ${table}`, details: null, hint: null });
      }
      if (index >= 0) {
        rows[index] = { ...rows[index], ...item };
        written.push(rows[index]);
      } else {
        const row = { ...defaults(table), ...item };
        rows.push(row);
        written.push(row);
      }
    }
    save(db);
    if (!wantsRows) return new Response(null, { status: 201 });
    return single ? json(201, written[0]) : json(201, written);
  }

  if (method === 'PATCH') {
    const changed = rows.filter((row) => matches(row, params));
    for (const row of changed) Object.assign(row, body);
    save(db);
    return wantsRows ? json(200, single ? changed[0] : changed) : new Response(null, { status: 204 });
  }

  if (method === 'DELETE') {
    const removed = rows.filter((row) => matches(row, params));
    db[table] = rows.filter((row) => !matches(row, params));
    // Mirror "on delete cascade" from the order triage foreign key.
    if (table === 'farmz3d_orders' && db.farmz3d_order_triage) {
      const gone = new Set(removed.map((row) => row.order_number));
      db.farmz3d_order_triage = db.farmz3d_order_triage.filter((row) => !gone.has(row.order_number));
    }
    save(db);
    return wantsRows ? json(200, removed) : new Response(null, { status: 204 });
  }

  return json(405, { message: `Method ${method} not supported by the local demo DB.` });
}
