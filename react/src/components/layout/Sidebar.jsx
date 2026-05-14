import { NavLink } from 'react-router-dom';
import { getVisibleMenu } from '../../data/menuConfig.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useUI } from '../../context/UIContext.jsx';
import { cn } from '../../lib/utils.js';

export function Sidebar() {
  const { role } = useAuth();
  const { closeSidebar } = useUI();
  const groups = getVisibleMenu(role);

  return (
    <aside className="flex h-full w-[290px] flex-col border-r border-zinc-800 bg-zinc-950/90 px-4 py-5">
      <div className="mb-6 flex items-center gap-3 px-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400 text-sm font-bold text-zinc-950">SS</div>
        <div>
          <p className="font-brand text-lg font-semibold text-white">Summit School OS</p>
          <p className="text-xs text-zinc-500">Premium campus management</p>
        </div>
      </div>
      <nav className="scrollbar-thin flex-1 space-y-5 overflow-y-auto pr-1">
        {groups.map((group) => (
          <div key={group.group} className="space-y-2">
            <p className="px-2 font-mono text-xs uppercase tracking-widest text-zinc-500">{group.group}</p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={closeSidebar}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-between rounded-2xl border px-3 py-2.5 text-sm transition',
                      isActive ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300 shadow-[0_0_0_1px_rgba(52,211,153,0.1)]' : 'border-transparent text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900 hover:text-zinc-100'
                    )
                  }
                >
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}