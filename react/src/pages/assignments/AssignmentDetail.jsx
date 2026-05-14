import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { useUI } from '../../context/UIContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

import { DetailPageTemplate } from '../../components/layout/DetailPageTemplate.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';

import AssignmentForm from './AssignmentForm.jsx';
import { archiveAssignment, getAssignmentById } from '../../services/assignments.service.js';
import { formatDate } from '../../lib/utils.js';

const MANAGE_ROLES = new Set(['Admin', 'Principal', 'Teacher']);

export default function AssignmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { toast } = useUI();
  const { role } = useAuth();

  const canManage = MANAGE_ROLES.has(role);

  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [confirm, setConfirm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    getAssignmentById(id)
      .then((data) => setAssignment(data))
      .catch((e) => setError(e.message || 'Assignment not found.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const timeline = useMemo(() => {
    if (!assignment) return [];
    return [
      { id: 'created', title: 'Assignment created', description: assignment.instructions, createdAt: assignment.createdAt },
      { id: 'due', title: 'Due date', description: formatDate(assignment.dueDate), createdAt: assignment.dueDate },
    ];
  }, [assignment]);

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <p className="text-zinc-400">Loading assignment...</p>
      </Card>
    );
  }

  if (error || !assignment) {
    return (
      <Card className="p-8 text-center">
        <p className="text-zinc-400">{error || 'Assignment not found.'}</p>
        <Button className="mt-4" onClick={() => navigate('/assignments')}>
          Back to assignments
        </Button>
      </Card>
    );
  }

  const tabContent = {
    overview: (
      <Card className="p-5">
        <p className="text-sm text-zinc-400">{assignment.instructions}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Class</p>
            <p className="mt-2 text-white">
              {assignment.class?.name || '—'} / {assignment.section?.name || '—'}
            </p>
          </div>
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Subject</p>
            <p className="mt-2 text-white">{assignment.subject?.name || '—'}</p>
          </div>
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Due</p>
            <p className="mt-2 text-white">{formatDate(assignment.dueDate)}</p>
          </div>
        </div>
      </Card>
    ),
    submissions: (
      <Card className="p-5">
        <p className="text-sm text-zinc-400">
          Submissions: {assignment.submissions || 0}. Late submissions: {assignment.lateSubmissions || 0}.
        </p>
      </Card>
    ),
    notes: (
      <Card className="p-5">
        <p className="text-sm text-zinc-400">Feedback and submission remarks can be attached here.</p>
      </Card>
    ),
  }[activeTab];

  const archive = async () => {
    const result = await archiveAssignment(assignment.id);
    if (result.success) {
      toast.success('Assignment archived.');
      navigate('/assignments');
    } else toast.error(result.message || 'Unable to archive assignment.');
    setConfirm(false);
  };

  return (
    <>
      <DetailPageTemplate
        title={assignment.title}
        description={`${assignment.class?.name || '—'} / ${assignment.section?.name || '—'} · ${assignment.subject?.name || '—'}`}
        status={assignment.status}
        subTitle={`Due ${formatDate(assignment.dueDate)}`}
        stats={[
          { label: 'Submissions', value: assignment.submissions || 0, note: 'received' },
          { label: 'Late', value: assignment.lateSubmissions || 0, note: 'past due' },
          { label: 'Class', value: assignment.class?.name || '—', note: 'target class' },
          { label: 'Status', value: assignment.status, note: 'current state' },
        ]}
        actions={
          canManage ? (
            <>
              <Button variant="secondary" onClick={() => setSearchParams({ edit: '1' })}>Edit</Button>
              <Button variant="danger" onClick={() => setConfirm(true)}>Archive</Button>
            </>
          ) : null
        }
        tabs={[
          { key: 'overview', label: 'Overview' },
          { key: 'submissions', label: 'Submissions' },
          { key: 'notes', label: 'Notes' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabContent={tabContent}
        timeline={timeline}
      />

      <AssignmentForm
        open={canManage && searchParams.get('edit') === '1'}
        onClose={() => setSearchParams({})}
        assignment={assignment}
        onSaved={() => {
          setSearchParams({});
          load();
        }}
      />

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Archive assignment"
        description={`Archive ${assignment.title}?`}
        confirmLabel="Archive"
        onConfirm={archive}
      />
    </>
  );
}