import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "./nav";

export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-slate-100 bg-white/95 px-1 py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/95">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `flex min-w-[4.25rem] flex-1 shrink-0 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium transition ${
              isActive ? "text-[var(--accent)]" : "text-slate-400"
            }`
          }
        >
          <item.icon className="h-5 w-5" />
          <span className="truncate">{item.label.split(" ")[0]}</span>
        </NavLink>
      ))}
    </nav>
  );
}
