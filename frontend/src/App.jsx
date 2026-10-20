import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout.jsx";
import { Spinner } from "./components/Spinner.jsx";

const Dashboard = lazy(() => import("./pages/Dashboard.jsx").then((mod) => ({ default: mod.Dashboard })));
const WeeklyAssignments = lazy(() =>
  import("./pages/WeeklyAssignments.jsx").then((mod) => ({ default: mod.WeeklyAssignments }))
);
const Roommates = lazy(() => import("./pages/Roommates.jsx").then((mod) => ({ default: mod.Roommates })));
const Chores = lazy(() => import("./pages/Chores.jsx").then((mod) => ({ default: mod.Chores })));
const History = lazy(() => import("./pages/History.jsx").then((mod) => ({ default: mod.History })));

export default function App() {
  return (
    <Suspense fallback={<Spinner label="Loading page" />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="weekly" element={<WeeklyAssignments />} />
          <Route path="roommates" element={<Roommates />} />
          <Route path="chores" element={<Chores />} />
          <Route path="history" element={<History />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
