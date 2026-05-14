import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { roleCapabilities } from '../../data/permissions.js';
import { ROLES } from '../../lib/constants.js';

export default function RolesPermissions() {
  const modules = [
    'dashboard', 'admissions', 'students', 'staff', 'academics', 'attendance', 'exams',
    'assignments', 'communication', 'reports', 'settings', 'finance', 'library', 'transport', 'profile',
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Roles & Permissions" description="Review the role matrix that drives menu visibility and route protection." />
      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-950/70 text-xs uppercase tracking-widest text-zinc-500">
            <tr>
              <th className="px-4 py-3">Role</th>
              {modules.map((module) => (
                <th key={module} className="px-4 py-3">{module}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROLES.map((role) => (
              <tr key={role} className="border-b border-zinc-800">
                <td className="px-4 py-3 font-medium text-white">{role}</td>
                {modules.map((module) => {
                  const allowed = roleCapabilities[role]?.includes('*') || roleCapabilities[role]?.includes(module);
                  return (
                    <td key={module} className="px-4 py-3">
                      <Badge variant={allowed ? 'success' : 'neutral'}>
                        {allowed ? 'allowed' : 'blocked'}
                      </Badge>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}