import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ListChecks, Sparkles, Users, CheckCircle2 } from "lucide-react";
import { api } from "../api/client.js";
import { AssignmentCard } from "../components/AssignmentCard.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { Spinner } from "../components/Spinner.jsx";
import { useToast } from "../components/Toast.jsx";

export function Dashboard() {
  const { push } = useToast();
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [busyId, setBusyId] = useState(null);

  async function load() {
    try {
      const data = await api.dashboard();
      setState({ loading: false, data, error: null });
    } catch (error) {
      setState({ loading: false, data: null, error: error.message });
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function complete(assignment) {
    setBusyId(assignment.id);
    try {
      await api.completeChore(assignment.choreId, assignment.weekStart);
      push("Chore marked complete");
      await load();
    } catch (error) {
      push(error.message, "error");
    } finally {
      setBusyId(null);
    }
  }

  if (state.loading) return <Spinner label="Loading dashboard" />;
  if (state.error) {
    return (
      <EmptyState
        title="Can't reach the API"
        body={`${state.error} Start the backend, set VITE_API_BASE_URL, and apply the Supabase migration.`}
      />
    );
  }

  const { week, stats, fairness } = state.data;
  const incomplete = week.assignments.filter((row) => !row.isCompleted);
  const chartData = fairness.map((row) => ({
    name: row.name.split(" ")[0],
    hard: row.hardCount,
    total: row.difficulty,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-700">This week</p>
          <h1 className="font-display text-4xl">{week.label}</h1>
          <p className="mt-1 text-sm text-stone-600">UTC household week, Monday through Sunday.</p>
        </div>
        <Link
          to="/weekly"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Sparkles className="h-4 w-4" />
          Generate weekly assignments
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Users} label="Active roommates" value={stats.activeRoommates} />
        <Stat icon={ListChecks} label="Active chores" value={stats.activeChores} />
        <Stat icon={CheckCircle2} label="Completed this week" value={stats.completedThisWeek} />
        <Stat icon={Sparkles} label="Weekly completion" value={`${stats.completionPercent}%`} />
      </section>

      {week.assignments.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No spin yet this week"
          body="Add roommates and chores, then generate assignments. The wheel on the Weekly page only presents the server result."
          action={
            <Link to="/weekly" className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
              Go to weekly assignments
            </Link>
          }
        />
      ) : (
        <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-2xl">This week's board</h2>
              <Link to="/weekly" className="text-sm font-semibold text-brand-700">
                Open full view
              </Link>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {week.assignments.map((assignment) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  busy={busyId === assignment.id}
                  onComplete={complete}
                />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="card p-4">
              <h2 className="font-display text-2xl">Still open</h2>
              {incomplete.length === 0 ? (
                <p className="mt-2 text-sm text-emerald-700">Everything for this week is done.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {incomplete.map((row) => (
                    <li key={row.id} className="flex justify-between gap-3">
                      <span>{row.choreName}</span>
                      <span className="text-stone-500">{row.roommateName}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="card p-4">
              <h2 className="font-display text-2xl">Hard-chore share</h2>
              <p className="mb-3 text-sm text-stone-600">Tough and hard tasks (difficulty 4–5) assigned this week.</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="hard" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-sm text-stone-500">
        <Icon className="h-4 w-4 text-brand-600" />
        {label}
      </div>
      <p className="mt-2 font-display text-3xl">{value}</p>
    </div>
  );
}
