import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button.jsx';
import { Avatar } from '../ui/Avatar.jsx';
import { Select } from '../ui/Select.jsx';
import { DropdownMenu } from '../ui/DropdownMenu.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useUI } from '../../context/UIContext.jsx';
import { getPrimaryAction } from '../../data/menuConfig.js';
import { useResponsive } from '../../hooks/useResponsive.js';

function buildMonthOptions() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    return {
      value: date.toISOString().slice(0, 7),
      label: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date),
    };
  });
}

export function Topbar() {
  const { user, role, logout, memberships, selectSchool } = useAuth();
  const { selectedMonth, setSelectedMonth, openSidebar, toast } = useUI();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();

  const [switchingSchool, setSwitchingSchool] = useState(false);

  const action = getPrimaryAction(pathname, role);
  const monthOptions = buildMonthOptions();

  const schoolOptions = useMemo(() => {
    return (memberships || []).map((m) => ({
      value: m.schoolId,
      label: `${m.schoolName} (${m.role})`,
    }));
  }, [memberships]);

  const activeSchoolId = user?.activeSchool?.id || '';

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/80 px-3 py-3 backdrop-blur-xl sm:px-5">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={openSidebar}>
            Menu
          </Button>

          <div className="min-w-0 flex-1 sm:max-w-2xl">
            <div className="grid gap-2 sm:grid-cols-2">
              {/* School selector (only if multi-school) */}
              {schoolOptions.length > 1 ? (
                <Select
                  value={activeSchoolId}
                  disabled={switchingSchool}
                  onChange={async (event) => {
                    const nextSchoolId = event.target.value;
                    if (!nextSchoolId || nextSchoolId === activeSchoolId) return;

                    setSwitchingSchool(true);
                    try {
                      await selectSchool(nextSchoolId);
                      toast.success('Switched school.');
                      navigate('/dashboard', { replace: true });
                    } catch (e) {
                      toast.error(e.message || 'Unable to switch school.');
                    } finally {
                      setSwitchingSchool(false);
                    }
                  }}
                  className="h-10 rounded-full bg-zinc-900 text-sm"
                  aria-label="Active school"
                >
                  {schoolOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              ) : (
                <div className="flex h-10 items-center rounded-full border border-zinc-800 bg-zinc-900 px-4 text-sm text-zinc-300">
                  {user?.activeSchool?.name || 'School'}
                </div>
              )}

             
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(action.path)}
            className="hidden sm:inline-flex"
          >
            {action.label}
          </Button>

          <DropdownMenu
            trigger={
              <span className="flex items-center gap-3">
                <Avatar name={user?.name} size="sm" />
               
              </span>
            }
            items={[
              { label: 'Profile', onClick: () => navigate('/profile') },
              {
                label: 'Sign out',
                danger: true,
                onClick: () => {
                  logout();
                  navigate('/login', { replace: true });
                },
              },
            ]}
          />
        </div>
      </div>

      {isMobile ? (
        <div className="mt-3 sm:hidden">
          <Button variant="primary" size="sm" className="w-full" onClick={() => navigate(action.path)}>
            {action.label}
          </Button>
        </div>
      ) : null}
    </header>
  );
}