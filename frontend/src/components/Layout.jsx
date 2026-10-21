import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { History, Home, Menu, Sparkles, Users, X, ListChecks } from "lucide-react";

const links = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/weekly", label: "Weekly Assignments", icon: Sparkles },
  { to: "/roommates", label: "Roommates", icon: Users },
  { to: "/chores", label: "Chores", icon: ListChecks },
  { to: "/history", label: "History", icon: History },
];

function BrandLogo({ className = "" }) {
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-2xl bg-white ${className}`}>
      <img src="/logo.png" alt="SpinChore logo" className="h-full w-full scale-[2.35] object-contain" />
    </span>
  );
}

function NavItems({ onNavigate }) {
  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                isActive ? "bg-white/10 text-white" : "text-stone-300 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {link.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

export function Layout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16.5rem_1fr]">
      <aside className="hidden bg-[#1c1917] p-5 text-white lg:flex lg:flex-col">
        <div className="mb-8 flex items-center gap-3">
          <BrandLogo className="h-11 w-11" />
          <div>
            <p className="font-display text-2xl leading-none">SpinChore</p>
            <p className="text-xs text-stone-400">Fair weekly household spins</p>
          </div>
        </div>
        <NavItems />
        <p className="mt-auto pt-8 text-xs leading-5 text-stone-500">
          Weeks run Monday–Sunday in UTC. Assignments are decided on the server, not by the wheel.
        </p>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-stone-200 bg-white/70 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center gap-2">
            <BrandLogo className="h-9 w-9 rounded-xl" />
            <span className="font-display text-xl">SpinChore</span>
          </div>
          <button
            type="button"
            className="rounded-xl p-2 hover:bg-stone-100"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        {open ? (
          <div className="fixed inset-0 z-40 bg-stone-900/50 lg:hidden">
            <div className="h-full w-72 bg-[#1c1917] p-4 text-white">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BrandLogo className="h-9 w-9 rounded-xl" />
                  <span className="font-display text-xl">SpinChore</span>
                </div>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close navigation">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <NavItems onNavigate={() => setOpen(false)} />
            </div>
          </div>
        ) : null}

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
