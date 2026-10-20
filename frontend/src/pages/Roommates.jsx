import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { api } from "../api/client.js";
import { ConfirmDialog } from "../components/ConfirmDialog.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { Modal } from "../components/Modal.jsx";
import { Spinner } from "../components/Spinner.jsx";
import { useToast } from "../components/Toast.jsx";

export function Roommates() {
  const { push } = useToast();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setPeople(await api.listRoommates());
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

  async function save(event) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setForm({ ...form, issue: "Name is required" });
      return;
    }
    setSaving(true);
    try {
      if (form.id) {
        await api.updateRoommate(form.id, { name });
        push("Roommate updated");
      } else {
        await api.createRoommate({ name });
        push("Roommate added");
      }
      setForm(null);
      await load();
    } catch (err) {
      setForm({ ...form, issue: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function toggle(person) {
    try {
      await api.updateRoommate(person.id, { isActive: !person.is_active });
      push(person.is_active ? "Roommate deactivated" : "Roommate reactivated");
      await load();
    } catch (err) {
      push(err.message, "error");
    }
  }

  if (loading) return <Spinner label="Loading roommates" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl">Roommates</h1>
          <p className="text-sm text-stone-600">Deactivating keeps history. Nobody is hard-deleted.</p>
        </div>
        <button
          type="button"
          onClick={() => setForm({ name: "" })}
          className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Add roommate
        </button>
      </div>
      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}
      {people.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No roommates yet"
          body="Add the people who share this household. Assignments can only be generated for active roommates."
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {people.map((person) => (
            <li key={person.id} className="card flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-display text-xl">{person.name}</p>
                <p className={`text-sm ${person.is_active ? "text-emerald-700" : "text-stone-500"}`}>
                  {person.is_active ? "Active" : "Inactive"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-full px-3 py-1.5 text-sm font-medium hover:bg-stone-100"
                  onClick={() => setForm({ id: person.id, name: person.name })}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="rounded-full px-3 py-1.5 text-sm font-medium hover:bg-stone-100"
                  onClick={() =>
                    person.is_active
                      ? setConfirm(person)
                      : toggle(person)
                  }
                >
                  {person.is_active ? "Deactivate" : "Reactivate"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {form ? (
        <Modal title={form.id ? "Edit roommate" : "Add roommate"} onClose={() => setForm(null)}>
          <form onSubmit={save} className="space-y-4">
            <label className="block text-sm font-medium">
              Name
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value, issue: "" })}
                className="mt-1 w-full rounded-2xl border border-stone-300 px-3 py-2"
                autoFocus
              />
            </label>
            {form.issue ? <p className="text-sm text-rose-700">{form.issue}</p> : null}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setForm(null)} className="rounded-full px-4 py-2 text-sm">
                Cancel
              </button>
              <button disabled={saving} className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
                Save
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {confirm ? (
        <ConfirmDialog
          title={`Deactivate ${confirm.name}?`}
          body="They will be skipped in future spins, but past assignments stay in history."
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
