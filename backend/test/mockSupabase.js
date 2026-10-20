import { randomUUID } from "node:crypto";

function clone(value) {
  return structuredClone(value);
}

function nowIso() {
  return new Date().toISOString();
}

function matchesFilters(row, filters) {
  return filters.every((filter) => {
    if (filter.type === "eq") return String(row[filter.key]) === String(filter.value);
    if (filter.type === "lt") return row[filter.key] < filter.value;
    if (filter.type === "in") return filter.value.includes(row[filter.key]);
    if (filter.type === "is") {
      if (filter.value === null) return row[filter.key] == null;
      return row[filter.key] === filter.value;
    }
    return true;
  });
}

function expandRow(db, table, row) {
  const next = { ...row };
  if (table === "assignments") {
    next.roommates = db.roommates.find((item) => item.id === row.roommate_id) ?? null;
    next.chores = db.chores.find((item) => item.id === row.chore_id) ?? null;
    next.weeks = db.weeks.find((item) => item.id === row.week_id) ?? null;
  }
  return next;
}

class Query {
  constructor(db, table) {
    this.db = db;
    this.table = table;
    this.filters = [];
    this.op = "select";
    this.payload = null;
    this.orderKey = null;
    this.ascending = true;
    this.limitCount = null;
    this.mode = "many";
  }

  select() {
    return this;
  }

  insert(payload) {
    this.op = "insert";
    this.payload = payload;
    return this;
  }

  update(payload) {
    this.op = "update";
    this.payload = payload;
    return this;
  }

  eq(key, value) {
    this.filters.push({ type: "eq", key, value });
    return this;
  }

  lt(key, value) {
    this.filters.push({ type: "lt", key, value });
    return this;
  }

  in(key, value) {
    this.filters.push({ type: "in", key, value });
    return this;
  }

  is(key, value) {
    this.filters.push({ type: "is", key, value });
    return this;
  }

  order(key, options = {}) {
    this.orderKey = key;
    this.ascending = options.ascending !== false;
    return this;
  }

  limit(count) {
    this.limitCount = count;
    return this;
  }

  maybeSingle() {
    this.mode = "maybe";
    return this;
  }

  single() {
    this.mode = "single";
    return this;
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }

  async execute() {
    try {
      const result = this.run();
      return result;
    } catch (error) {
      return { data: null, error };
    }
  }

  run() {
    const table = this.db[this.table];
    if (this.op === "insert") {
      const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
      const inserted = [];
      for (const row of rows) {
        if (this.table === "weeks" && table.some((item) => item.week_start === row.week_start)) {
          return { data: null, error: { code: "23505", message: "duplicate" } };
        }
        if (
          this.table === "assignments" &&
          table.some((item) => item.week_id === row.week_id && item.chore_id === row.chore_id)
        ) {
          return { data: null, error: { code: "23505", message: "duplicate" } };
        }
        const record = {
          id: randomUUID(),
          created_at: nowIso(),
          updated_at: nowIso(),
          assigned_at: nowIso(),
          completed_at: null,
          is_active: true,
          ...row,
        };
        table.push(record);
        inserted.push(expandRow(this.db, this.table, record));
      }
      const data = Array.isArray(this.payload) ? inserted : inserted[0];
      return { data, error: null };
    }

    let rows = table.filter((row) => matchesFilters(row, this.filters));
    if (this.op === "update") {
      if (this.payload.completed_at && this.filters.some((f) => f.type === "is" && f.key === "completed_at")) {
        rows = rows.filter((row) => row.completed_at == null);
      }
      for (const row of rows) {
        Object.assign(row, this.payload, { updated_at: nowIso() });
      }
    }

    if (this.orderKey) {
      rows.sort((a, b) => {
        if (a[this.orderKey] < b[this.orderKey]) return this.ascending ? -1 : 1;
        if (a[this.orderKey] > b[this.orderKey]) return this.ascending ? 1 : -1;
        return 0;
      });
    }
    if (this.limitCount != null) rows = rows.slice(0, this.limitCount);

    const expanded = rows.map((row) => expandRow(this.db, this.table, clone(row)));
    if (this.mode === "single") {
      if (expanded.length !== 1) {
        return { data: null, error: { code: "PGRST116", message: "not single" } };
      }
      return { data: expanded[0], error: null };
    }
    if (this.mode === "maybe") {
      return { data: expanded[0] ?? null, error: null };
    }
    return { data: expanded, error: null };
  }
}

export function createMemoryDb() {
  const db = {
    roommates: [],
    chores: [],
    weeks: [],
    assignments: [],
  };

  return {
    store: db,
    from(table) {
      return new Query(db, table);
    },
    async rpc(name, args) {
      if (name === "ensure_week") {
        const existing = db.weeks.find((week) => week.week_start === args.p_week_start);
        if (existing) return { data: existing.id, error: null };
        const row = {
          id: randomUUID(),
          week_start: args.p_week_start,
          created_at: nowIso(),
        };
        db.weeks.push(row);
        return { data: row.id, error: null };
      }
      if (name === "replace_week_assignments") {
        const hasCompletion = db.assignments.some(
          (row) => row.week_id === args.p_week_id && row.completed_at
        );
        if (hasCompletion) {
          return {
            data: null,
            error: { message: "cannot regenerate a week that already has completions" },
          };
        }
        db.assignments = db.assignments.filter((row) => row.week_id !== args.p_week_id);
        for (const item of args.p_rows) {
          db.assignments.push({
            id: randomUUID(),
            week_id: args.p_week_id,
            roommate_id: item.roommate_id,
            chore_id: item.chore_id,
            assigned_at: nowIso(),
            completed_at: null,
          });
        }
        return { data: null, error: null };
      }
      return { data: null, error: { message: `Unknown rpc ${name}` } };
    },
  };
}
