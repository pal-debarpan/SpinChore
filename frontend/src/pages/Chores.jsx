import { useEffect, useMemo, useState } from "react";
import { ListChecks } from "lucide-react";
import { api } from "../api/client.js";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { DifficultyBadge } from "../components/DifficultyBadge.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { Modal } from "../components/Modal.jsx";
import { Spinner } from "../components/Spinner.jsx";
import { useToast } from "../components/Toast.jsx";
import { DIFFICULTY_LABELS } from "../lib/difficulty.js";

const emptyForm = { name: "", description: "", difficulty: 3 };

export function Chores() {
  const { push } = useToast();
  const [chores, setChores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [filter, setFilter] = useState({ status: "all", difficulty: "all" });

  async function load() {
    try {
      setChores(await api.listChores());
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    return chores.filter((chore) => {
      if (filter.status === "active" && !chore.is_active) return false;
      if (filter.status === "inactive" && chore.is_active) return false;
      if (filter.difficulty !== "all" && String(chore.difficulty) !== filter.difficulty) return false;
      return true;
    });
  }, [chores, filter]);

  async function save(event) {
    event.preventDefault();
    if (!form.name.trim()) {
      setForm({ ...form, issue: "Name is required" });
      return;
    }
    try {
      const payload = {
        name: form.name,
        description: form.description,
        difficulty: Number(form.difficulty),
      };
      if (form.id) {
        await api.updateChore(form.id, payload);
        push("Chore updated");
      } else {
        await api.createChore(payload);
        push("Chore added");
      }
      setForm(null);
      await load();
    } catch (err) {
      setForm({ ...form, issue: err.message });
    }
  }

  async function toggle(chore) {
    try {
      await api.updateChore(chore.id, { isActive: !chore.is_active });
      push(chore.is_active ? "Chore deactivated" : "Chore reactivated");
      await load();
    } catch (err) {
      push(err.message, "error");
    }
  }

  if (loading) return <Spinner label="Loading chores" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl">Chores</h1>
          <p className="text-sm text-stone-600">Difficulty 1 is easy, 5 is hard. The API ignores client-side assignment choices.</p>
        </div>
        <button
          type="button"
          onClick={() => setForm({ ...emptyForm })}
          className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Add chore
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          className="rounded-full border border-stone-300 bg-white px-3 py-2 text-sm"
          value={filter.status}
          onChange={(event) => setFilter({ ...filter, status: event.target.value })}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          className="rounded-full border border-stone-300 bg-white px-3 py-2 text-sm"
          value={filter.difficulty}
          onChange={(event) => setFilter({ ...filter, difficulty: event.target.value })}
        >
          <option value="all">All difficulties</option>
          {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {value} · {label}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}

      {visible.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No chores match"
          body="Create household tasks, or loosen the filters. Inactive chores stay in history but skip new spins."
        />
      ) : (
        <ul className="grid gap-3">
          {visible.map((chore) => (
            <li key={chore.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-2xl">{chore.name}</h2>
                  <DifficultyBadge value={chore.difficulty} />
                  <span className={`text-sm ${chore.is_active ? "text-emerald-700" : "text-stone-500"}`}>
                    {chore.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-stone-600">{chore.description || "No description"}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-full px-3 py-1.5 text-sm font-medium hover:bg-stone-100"
                  onClick={() =>
                    setForm({
                      id: chore.id,
                      name: chore.name,
                      description: chore.description || "",
                      difficulty: chore.difficulty,
                    })
                  }
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="rounded-full px-3 py-1.5 text-sm font-medium hover:bg-stone-100"
                  onClick={() => (chore.is_active ? setConfirm(chore) : toggle(chore))}
                >
                  {chore.is_active ? "Deactivate" : "Reactivate"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {form ? (
        <Modal title={form.id ? "Edit chore" : "Add chore"} onClose={() => setForm(null)}>
          <form onSubmit={save} className="space-y-4">
            <label className="block text-sm font-medium">
              Name
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value, issue: "" })}
                className="mt-1 w-full rounded-2xl border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm font-medium">
              Description
              <textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                className="mt-1 w-full rounded-2xl border border-stone-300 px-3 py-2"
                rows={3}
              />
            </label>
            <label className="block text-sm font-medium">
              Difficulty
              <select
                value={form.difficulty}
                onChange={(event) => setForm({ ...form, difficulty: Number(event.target.value) })}
                className="mt-1 w-full rounded-2xl border border-stone-300 px-3 py-2"
              >
                {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {value} · {label}
                  </option>
                ))}
              </select>
            </label>
            {form.issue ? <p className="text-sm text-rose-700">{form.issue}</p> : null}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setForm(null)} className="rounded-full px-4 py-2 text-sm">
                Cancel
              </button>
              <button className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Save</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {confirm ? (
        <ConfirmDialog
          title={`Deactivate ${confirm.name}?`}
          body="It will not be assigned in future weeks. Existing history stays put."
          confirmLabel="Deactivate"
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            await toggle(confirm);
            setConfirm(null);
          }}
        />
      ) : null}
    </div>
  );
}
