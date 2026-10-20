import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api/client.js";
import { DifficultyBadge } from "../components/DifficultyBadge.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { Spinner } from "../components/Spinner.jsx";

export function History() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [history, setHistory] = useState({ assignments: [], fairness: [] });
  const [roommates, setRoommates] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [filters, setFilters] = useState({ roommateId: "all", weekStart: "all" });

  useEffect(() => {
    async function load() {
      try {
        const [hist, people, weekRows] = await Promise.all([api.history(), api.listRoommates(), api.weeks()]);
        setHistory(hist);
        setRoommates(people);
        setWeeks(weekRows);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const rows = useMemo(() => {
    return history.assignments.filter((row) => {
      if (filters.roommateId !== "all" && row.roommateId !== filters.roommateId) return false;
      if (filters.weekStart !== "all" && row.weekStart !== filters.weekStart) return false;
      return true;
    });
  }, [history, filters]);

  if (loading) return <Spinner label="Loading history" />;
  if (error) return <EmptyState title="History unavailable" body={error} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">History</h1>
        <p className="text-sm text-stone-600">Every saved assignment from the database, including deactivated people and chores.</p>
      </div>

      <div className="card p-4">
        <h2 className="font-display text-2xl">Cumulative difficulty</h2>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={history.fairness.map((row) => ({ name: row.name?.split(" ")[0] || "?", total: row.difficulty }))}>
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" fill="#7c3aed" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          className="rounded-full border border-stone-300 bg-white px-3 py-2 text-sm"
          value={filters.roommateId}
          onChange={(event) => setFilters({ ...filters, roommateId: event.target.value })}
        >
          <option value="all">All roommates</option>
          {roommates.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-full border border-stone-300 bg-white px-3 py-2 text-sm"
          value={filters.weekStart}
          onChange={(event) => setFilters({ ...filters, weekStart: event.target.value })}
        >
          <option value="all">All weeks</option>
          {weeks.map((week) => {
            const val = week.week_start ?? week.weekStart;
            return (
              <option key={week.id ?? val} value={val}>
                {val}
              </option>
            );
          })}
        </select>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No historical assignments" body="Generate a weekly spin to start building a fairness record." />
      ) : (
        <div className="overflow-x-auto card">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-200 text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">Week start</th>
                <th className="px-4 py-3 font-medium">Roommate</th>
                <th className="px-4 py-3 font-medium">Chore</th>
                <th className="px-4 py-3 font-medium">Difficulty</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-stone-100">
                  <td className="px-4 py-3">{row.weekStart}</td>
                  <td className="px-4 py-3">{row.roommateName}</td>
                  <td className="px-4 py-3">{row.choreName}</td>
                  <td className="px-4 py-3">
                    <DifficultyBadge value={row.difficulty} />
                  </td>
                  <td className="px-4 py-3">
                    {row.isCompleted ? (
                      <span className="font-medium text-emerald-700">Completed</span>
                    ) : (
                      <span className="font-medium text-amber-700">Incomplete</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
