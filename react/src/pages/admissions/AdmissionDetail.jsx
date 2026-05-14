import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { useUI } from '../../context/UIContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

import { DetailPageTemplate } from '../../components/layout/DetailPageTemplate.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';

import AdmissionForm from './AdmissionForm.jsx';

import { archiveAdmission, convertAdmissionToStudent, getAdmissionById } from '../../services/admissions.service.js';
import { formatDate } from '../../lib/utils.js';

const MANAGE_ROLES = new Set(['Admin', 'Principal']);

export default function AdmissionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useUI();
  const { role } = useAuth();

  const canManage = MANAGE_ROLES.has(role);

  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [confirm, setConfirm] = useState(null);

  const [loading, setLoading] = useState(true);
  const [admission, setAdmission] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    getAdmissionById(id)
      .then((data) => mounted && setAdmission(data))
      .catch((e) => mounted && setError(e.message || 'Admission not found.'))
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [id]);

  const timeline = useMemo(() => {
    if (!admission) return [];
    return [
      {
        id: 'created',
        title: 'Application created',
        description: `Requested ${admission.requestedClass?.name || '—'}`,
        createdAt: admission.createdAt,
      },
      {
        id: 'status',
        title: `Status: ${admission.status}`,
        description: admission.notes || 'Pipeline progress tracked here.',
        createdAt: admission.updatedAt || admission.createdAt,
      },
    ];
  }, [admission]);

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <p className="text-zinc-400">Loading admission...</p>
      </Card>
    );
  }

  if (error || !admission) {
    return (
      <Card className="p-8 text-center">
        <p className="text-zinc-400">{error || 'Admission record not found.'}</p>
        <Button className="mt-4" onClick={() => navigate('/admissions')}>
          Back to admissions
        </Button>
      </Card>
    );
  }

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'documents', label: 'Documents' },
    { key: 'decision', label: 'Decision history' },
  ];

  const tabContent = {
    overview: (
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Applicant</p>
            <p className="mt-2 text-white">{admission.applicantName}</p>
            <p className="mt-1 text-sm text-zinc-400">Parent: {admission.parentName}</p>
          </div>
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Requested class</p>
            <p className="mt-2 text-white">{admission.requestedClass?.name || '—'}</p>
            <p className="mt-1 text-sm text-zinc-400">Source: {admission.source}</p>
          </div>
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Contact</p>
            <p className="mt-2 text-white">{admission.phone}</p>
            <p className="mt-1 text-sm text-zinc-400">{admission.email}</p>
          </div>
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Created</p>
            <p className="mt-2 text-white">{formatDate(admission.createdAt)}</p>
          </div>
        </div>
      </Card>
    ),
    documents: (
      <Card className="p-5">
        <p className="text-sm text-zinc-400">
          Document checklist and comments can be attached here. Previous school: {admission.previousSchool || 'Not captured'}.
        </p>
      </Card>
    ),
    decision: (
      <Card className="p-5">
        <p className="text-sm text-zinc-400">Decision notes: {admission.notes || 'No notes captured.'}</p>
      </Card>
    ),
  }[activeTab];

  const doAction = async () => {
    if (!confirm) return;

    const result =
      confirm.type === 'archive'
        ? await archiveAdmission(admission.id)
        : await convertAdmissionToStudent(admission.id);

    if (result.success) toast.success(confirm.type === 'archive' ? 'Admission archived.' : 'Converted to student.');
    else toast.error(result.message || 'Action failed.');

    setConfirm(null);

    if (confirm.type === 'convert' && result.student) navigate(`/students/${result.student.id}`);
    if (confirm.type === 'archive') navigate('/admissions');
  };

  return (
    <>
      <DetailPageTemplate
        title={admission.applicantName}
        description={`Parent ${admission.parentName} · ${admission.requestedClass?.name || '—'} · ${role}`}
        status={admission.status}
        subTitle={`Source ${admission.source} · Added ${formatDate(admission.createdAt)}`}
        stats={[
          { label: 'Converted', value: admission.status === 'converted' ? 'Yes' : 'No', note: 'student record' },
          { label: 'Requested', value: admission.requestedClass?.name || '—', note: 'class preference' },
          { label: 'Reviewed', value: admission.status !== 'new' ? 'Yes' : 'No', note: 'pipeline progress' },
          { label: 'Role', value: role, note: 'current session' },
        ]}
        actions={
          canManage ? (
            <>
              <Button variant="secondary" onClick={() => setSearchParams({ edit: '1' })}>
                Edit
              </Button>
              <Button
                variant="secondary"
                disabled={admission.status !== 'approved'}
                onClick={() => setConfirm({ type: 'convert' })}
              >
                Convert
              </Button>
              <Button variant="danger" onClick={() => setConfirm({ type: 'archive' })}>
                Archive
              </Button>
            </>
          ) : null
        }
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabContent={tabContent}
        timeline={timeline}
      />

      <AdmissionForm
        open={searchParams.get('edit') === '1'}
        onClose={() => setSearchParams({})}
        admission={admission}
        onSaved={() => navigate(`/admissions/${id}`)}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.type === 'convert' ? 'Convert applicant' : 'Archive applicant'}
        description={`Apply this action to ${admission.applicantName}.`}
        confirmLabel="Continue"
        onConfirm={doAction}
      />
    </>
  );
}