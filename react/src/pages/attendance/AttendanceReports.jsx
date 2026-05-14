import { useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Table } from '../../components/ui/Table.jsx';

import { useUI } from '../../context/UIContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

import { getAttendanceMonthReport } from '../../services/attendance.service.js';
import { formatMonth } from '../../lib/utils.js';

const STAFF_NOTIFY_ROLES = new Set(['Admin', 'Principal', 'Teacher']);

function monthOptions() {
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - index);
    const value = date.toISOString().slice(0, 7);
    return { value, label: formatMonth(value) };
  });
}

export default function AttendanceReports() {
  const { selectedMonth, setSelectedMonth, toast } = useUI();
  const { role } = useAuth();

  const canNotify = STAFF_NOTIFY_ROLES.has(role);
  const scopedToLinked = role === 'Parent' || role === 'Student';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [report, setReport] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    getAttendanceMonthReport(selectedMonth)
      .then((rep) => {
        if (!mounted) return;
        setReport(rep);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e.message || 'Unable to load attendance report.');
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [selectedMonth]);

  const absenteeList = useMemo(() => report?.absentees || [], [report]);

  const columns = [
    {
      key: 'student',
      label: 'Student',
      render: (row) => row.student?.fullName || row.studentId,
    },
    {
      key: 'class',
      label: 'Class',
      render: (row) => {
        const classLabel = row.student?.class?.name || '—';
        const secLabel = row.student?.section?.name || row.section?.name || '—';
        return `${classLabel} / ${secLabel}`;
      },
    },
    { key: 'date', label: 'Date', render: (row) => row.date },
    { key: 'status', label: 'Status', render: () => <Badge variant="danger">absent</Badge> },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) =>
        canNotify ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => toast.info(`Simulated notification queued for ${row.student?.fullName || row.studentId}.`)}
          >
            Notify
          </Button>
        ) : (
          <span className="text-xs text-zinc-500">—</span>
        ),
    },
  ];

  const options = monthOptions();
  const counts = report?.counts || { present: 0, absent: 0, late: 0, half_day: 0, excused: 0 };
  const attendanceRate = report?.attendanceRate ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Reports"
        description={
          scopedToLinked
            ? 'Attendance summaries for linked students in the selected month.'
            : 'Summaries and absentee lists for the selected month.'
        }
      />

      <Select label="Month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>

      {loading ? <p className="text-sm text-zinc-400">Loading...</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Present', value: counts.present },
          { label: 'Absent', value: counts.absent },
          { label: 'Late', value: counts.late },
          { label: 'Half day', value: counts.half_day },
          { label: 'Excused', value: counts.excused },
        ].map((item) => (
          <Card key={item.label} className="p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">{item.label}</p>
            <p className="mt-2 text-3xl font-semibold text-white">{item.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <p className="text-sm text-zinc-400">
          Attendance rate for {formatMonth(selectedMonth)} is{' '}
          <span className="font-semibold text-white">{attendanceRate}%</span>.
        </p>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Absentee list</h2>
        {absenteeList.length ? (
          <Table rows={absenteeList} columns={columns} />
        ) : (
          <EmptyState title="No absences recorded" description="There are no absent entries for the selected month and scope." />
        )}
      </Card>
    </div>
  );
}