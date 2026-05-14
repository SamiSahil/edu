import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUI } from '../../context/UIContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { DetailPageTemplate } from '../../components/layout/DetailPageTemplate.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';

import { getExamById, lockExam, publishExam } from '../../services/exams.service.js';
import { getSubjects, getClassesSections } from '../../services/academics.service.js';
import { formatDate } from '../../lib/utils.js';

const MANAGE_ROLES = new Set(['Admin', 'Principal', 'Teacher']);

export default function ExamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useUI();
  const { role } = useAuth();

  const canManage = MANAGE_ROLES.has(role);
  const [activeTab, setActiveTab] = useState('overview');
  const [confirm, setConfirm] = useState(null);

  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState(null);
  const [error, setError] = useState('');

  const [subjects, setSubjectsList] = useState([]);
  const [classes, setClasses] = useState([]);

  const subjectNameById = useMemo(() => new Map(subjects.map((s) => [s.id, s.name])), [subjects]);
  const classNameById = useMemo(() => new Map(classes.map((c) => [c.id, c.name])), [classes]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    Promise.all([getExamById(id), getSubjects(), getClassesSections()])
      .then(([e, subs, cs]) => {
        if (!mounted) return;
        setExam(e);
        setSubjectsList(subs || []);
        setClasses(cs?.classes || []);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e.message || 'Exam not found.');
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [id]);

  const timeline = useMemo(() => {
    if (!exam) return [];
    return [
      { id: 'created', title: 'Exam scheduled', description: exam.term, createdAt: exam.createdAt || exam.scheduledFor },
      { id: 'status', title: `Status: ${exam.status}`, description: 'Assessment lifecycle updated.', createdAt: exam.updatedAt || exam.scheduledFor },
    ];
  }, [exam]);

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <p className="text-zinc-400">Loading exam...</p>
      </Card>
    );
  }

  if (error || !exam) {
    return (
      <Card className="p-8 text-center">
        <p className="text-zinc-400">{error || 'Exam not found.'}</p>
        <Button className="mt-4" onClick={() => navigate('/exams')}>Back to exams</Button>
      </Card>
    );
  }

  const subjectLabels = (exam.subjectIds || []).map((sid) => subjectNameById.get(sid) || sid).join(', ');

  const tabContent = {
    overview: (
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Class</p>
            <p className="mt-2 text-white">{exam.class?.name || classNameById.get(exam.classId) || '—'}</p>
          </div>
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Schedule</p>
            <p className="mt-2 text-white">{formatDate(exam.scheduledFor)}</p>
          </div>
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Max marks</p>
            <p className="mt-2 text-white">{exam.maxMarks}</p>
          </div>
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Subjects</p>
            <p className="mt-2 text-white">{subjectLabels || '—'}</p>
          </div>
        </div>
      </Card>
    ),
    papers: (
      <Card className="p-5">
        <div className="space-y-3">
          {(exam.subjectIds || []).map((subjectId) => (
            <div key={subjectId} className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="font-medium text-white">{subjectNameById.get(subjectId) || subjectId}</p>
              <p className="text-sm text-zinc-400">Paper opens for {exam.class?.name || classNameById.get(exam.classId) || 'Class'}</p>
            </div>
          ))}
        </div>
      </Card>
    ),
    marks: (
      <Card className="p-5">
        <p className="text-sm text-zinc-400">
          Marks entry is available in the Grades page for authorized staff.
        </p>
      </Card>
    ),
  }[activeTab];

  const applyAction = async () => {
    if (!confirm) return;
    const result = confirm.type === 'publish' ? await publishExam(exam.id) : await lockExam(exam.id);
    if (result.success) toast.success(confirm.type === 'publish' ? 'Exam published.' : 'Exam locked.');
    else toast.error(result.message || 'Action failed.');
    setConfirm(null);
  };

  return (
    <>
      <DetailPageTemplate
        title={exam.name}
        description={`${exam.term} · ${exam.class?.name || classNameById.get(exam.classId) || '—'}`}
        status={exam.status}
        subTitle={`Scheduled ${formatDate(exam.scheduledFor)}`}
        stats={[
          { label: 'Max marks', value: exam.maxMarks, note: 'per subject' },
          { label: 'Subjects', value: (exam.subjectIds || []).length, note: 'papers' },
          { label: 'Published', value: exam.status === 'published' ? 'Yes' : 'No', note: 'results visibility' },
          { label: 'Locked', value: exam.status === 'locked' ? 'Yes' : 'No', note: 'editing closed' },
        ]}
        actions={
          canManage ? (
            <>
              <Button variant="secondary" onClick={() => navigate(`/exams?form=edit&id=${exam.id}`)}>Edit</Button>
              <Button variant="secondary" disabled={exam.status === 'locked'} onClick={() => setConfirm({ type: 'publish' })}>
                Publish
              </Button>
              <Button variant="danger" disabled={exam.status === 'locked'} onClick={() => setConfirm({ type: 'lock' })}>
                Lock
              </Button>
            </>
          ) : null
        }
        tabs={[
          { key: 'overview', label: 'Overview' },
          { key: 'papers', label: 'Papers' },
          { key: 'marks', label: 'Marks' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabContent={tabContent}
        timeline={timeline}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.type === 'lock' ? 'Lock exam' : 'Publish exam'}
        description={`Apply this action to ${exam.name}.`}
        confirmLabel="Continue"
        onConfirm={applyAction}
      />
    </>
  );
}