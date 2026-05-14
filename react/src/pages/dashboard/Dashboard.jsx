import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button.jsx';
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card.jsx';
import { StatCard } from '../../components/ui/StatCard.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Timeline } from '../../components/ui/Timeline.jsx';

import { useAuth } from '../../context/AuthContext.jsx';
import { useUI } from '../../context/UIContext.jsx';
import { getDashboardSummary } from '../../services/dashboard.service.js';
import { formatCurrency, formatMonth } from '../../lib/utils.js';

export default function Dashboard() {
  const { user, role } = useAuth();
  const { selectedMonth, selectedMonthLabel } = useUI();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    getDashboardSummary(selectedMonth)
      .then((data) => {
        if (!mounted) return;
        setSummary(data);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e.message || 'Unable to load dashboard.');
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [selectedMonth]);

  const quickActions = useMemo(
    () =>
      ({
        Admin: [
          { label: 'Open admissions', path: '/admissions' },
          { label: 'School settings', path: '/settings/school' },
        ],
        Teacher: [
          { label: 'Mark attendance', path: '/attendance/mark' },
          { label: 'Review assignments', path: '/assignments' },
        ],
        Accountant: [
          { label: 'Open invoices', path: '/fees/invoices' },
          { label: 'Record payment', path: '/fees/payments' },
        ],
        Librarian: [
          { label: 'Issue book', path: '/library/issue-return' },
          { label: 'Open catalog', path: '/library/books' },
        ],
        Student: [
          { label: 'View timetable', path: '/academics/timetable' },
          { label: 'See grades', path: '/exams/report-cards' },
        ],
        Parent: [
          { label: 'Child attendance', path: '/attendance/reports' },
          { label: 'Pay fees', path: '/fees/invoices' },
        ],
      }[role] || [{ label: 'Open students', path: '/students' }]),
    [role]
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Dashboard" description="Loading school overview..." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <StatCard key={index} label="Loading" value="--" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Unable to load dashboard." />
        <EmptyState
          title="Dashboard unavailable"
          description={error || 'Try again later.'}
          actionLabel="Retry"
          onAction={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={selectedMonthLabel}
        title={`Welcome back, ${user?.name || 'Guest'}`}
        description="A live view of school operations, performance, and pending work for the selected month."
        actions={quickActions.map((item) => (
          <Button key={item.label} variant="secondary" onClick={() => navigate(item.path)}>
            {item.label}
          </Button>
        ))}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(summary.cards || []).map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} note={card.note} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Audit trail and updates from the active month.</CardDescription>
            </div>
          </CardHeader>
          <CardBody>
            {summary.activity?.length ? (
              <Timeline
                items={summary.activity.map((item) => ({
                  id: item.id,
                  title: item.message || item.title || 'Update',
                  description: item.entityType || item.action || '',
                  createdAt: item.createdAt,
                }))}
              />
            ) : (
              <EmptyState
                title="No activity yet"
                description={`There are no notable updates in ${formatMonth(selectedMonth)}.`}
                actionLabel="Open admissions"
                onAction={() => navigate('/admissions')}
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Month snapshot</CardTitle>
              <CardDescription>Attendance and finance signals for the selected month.</CardDescription>
            </div>
            <Badge variant="info">{selectedMonthLabel}</Badge>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">Attendance rate</p>
              <p className="mt-2 text-3xl font-semibold text-white">{summary.attendanceRate}%</p>
              <p className="mt-1 text-sm text-zinc-400">Based on records logged for the selected month.</p>
            </div>
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">Fee due</p>
              <p className="mt-2 text-3xl font-semibold text-white">{formatCurrency(summary.dueAmount)}</p>
              <p className="mt-1 text-sm text-zinc-400">Outstanding balance for the selected month.</p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}