import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { DetailPageTemplate } from '../../components/layout/DetailPageTemplate.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';

import StaffForm from './StaffForm.jsx';
import { useUI } from '../../context/UIContext.jsx';
import { archiveStaff, getStaffById } from '../../services/staff.service.js';
import { formatDate } from '../../lib/utils.js';

export default function StaffDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useUI();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState(null);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const load = () => {
    setLoading(true);
    setError('');
    getStaffById(id)
      .then((data) => setStaff(data))
      .catch((e) => setError(e.message || 'Staff record not found.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const timeline = useMemo(
    () =>
      staff
        ? [{ id: 'created', title: 'Staff record created', description: staff.department, createdAt: staff.createdAt || staff.joinDate }]
        : [],
    [staff]
  );

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <p className="text-zinc-400">Loading staff...</p>
      </Card>
    );
  }

  if (error || !staff) {
    return (
      <Card className="p-8 text-center">
        <p className="text-zinc-400">{error || 'Staff record not found.'}</p>
        <Button className="mt-4" onClick={() => navigate('/staff')}>Back to staff</Button>
      </Card>
    );
  }

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'assignments', label: 'Assignments' },
  ];

  const tabContent = {
    overview: (
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Contact</p>
            <p className="mt-2 text-white">{staff.email}</p>
            <p className="mt-1 text-sm text-zinc-400">{staff.phone}</p>
          </div>
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
  <p className="text-xs uppercase tracking-widest text-zinc-500">Login account</p>
  {staff.user ? (
    <>
      <p className="mt-2 text-white">{staff.user.email}</p>
      <p className="mt-1 text-sm text-zinc-400">@{staff.user.username}</p>
    </>
  ) : (
    <p className="mt-2 text-sm text-zinc-400">No login account linked.</p>
  )}
</div>
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Join date</p>
            <p className="mt-2 text-white">{formatDate(staff.joinDate)}</p>
          </div>
        </div>
      </Card>
    ),
    assignments: (
      <Card className="p-5">
        <p className="text-sm text-zinc-400">
          Class teacher/subject/timetable assignments are managed under Academics (and can be expanded here later).
        </p>
      </Card>
    ),
  }[activeTab];

  return (
    <>
      <DetailPageTemplate
        title={staff.name}
        description={`${staff.roleLabel} · ${staff.department}`}
        status={staff.status}
        subTitle={`${staff.email} · ${staff.phone}`}
        stats={[
          { label: 'Role', value: staff.roleLabel, note: 'employment' },
          { label: 'Department', value: staff.department, note: 'assignment' },
          { label: 'Join date', value: formatDate(staff.joinDate), note: 'on record' },
          { label: 'Status', value: staff.status, note: 'current' },
        ]}
        actions={
          <>
            <Button variant="secondary" onClick={() => setSearchParams({ edit: '1' })}>Edit</Button>
            <Button variant="danger" onClick={() => setConfirm(true)}>Archive</Button>
          </>
        }
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabContent={tabContent}
        timeline={timeline}
      />

      <StaffForm
        open={searchParams.get('edit') === '1'}
        onClose={() => setSearchParams({})}
        staff={staff}
        onSaved={() => {
          setSearchParams({});
          load();
        }}
      />

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Archive staff"
        description={`Archive ${staff.name}?`}
        confirmLabel="Archive"
        onConfirm={async () => {
          const result = await archiveStaff(staff.id);
          if (result.success) {
            toast.success('Staff archived.');
            navigate('/staff');
          } else {
            toast.error(result.message || 'Unable to archive staff.');
          }
        }}
      />
    </>
  );
}