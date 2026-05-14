import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { DropdownMenu } from '../../components/ui/DropdownMenu.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { ListPageTemplate } from '../../components/layout/ListPageTemplate.jsx';
import { RecordFormSheet } from '../../components/layout/RecordFormSheet.jsx';

import { useUI } from '../../context/UIContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

import { getExams, lockExam, publishExam, saveExam } from '../../services/exams.service.js';
import { getClassesSections, getSubjects } from '../../services/academics.service.js';
import { formatDate } from '../../lib/utils.js';

const MANAGE_ROLES = new Set(['Admin', 'Principal', 'Teacher']);

async function countExams(status, canManage) {
  const s = status === 'all' ? 'all' : status;
  const res = await getExams({ page: 1, pageSize: 1, status: canManage ? s : s === 'draft' ? 'all' : s });
  return res?.meta?.totalItems || 0;
}

export default function ExamsList() {
  const { toast } = useUI();
  const { role } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const canManage = MANAGE_ROLES.has(role);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [exams, setExams] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, totalItems: 0, pageSize: 8 });

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjectsList] = useState([]);

  const [stats, setStats] = useState([
    { label: 'Draft', value: '—', note: canManage ? 'planning' : 'restricted' },
    { label: 'Scheduled', value: '—', note: 'upcoming' },
    { label: 'Published', value: '—', note: 'results ready' },
    { label: 'Locked', value: '—', note: 'protected' },
  ]);

  const openForm = canManage && Boolean(searchParams.get('form'));
  const editId = canManage && searchParams.get('form') === 'edit' ? searchParams.get('id') : null;
  const active = editId ? exams.find((e) => e.id === editId) : null;

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  useEffect(() => {
    let mounted = true;
    Promise.all([getClassesSections(), getSubjects()])
      .then(([cs, subs]) => {
        if (!mounted) return;
        setClasses(cs?.classes || []);
        setSubjectsList(subs || []);
      })
      .catch(() => {})
      .finally(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const load = () => {
    setLoading(true);
    setError('');

    getExams({
      page,
      pageSize: 8,
      search,
      status,
    })
      .then((res) => {
        setExams(res.items || []);
        setMeta(res.meta || {});
      })
      .catch((e) => setError(e.message || 'Unable to load exams.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, status]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      canManage ? countExams('draft', canManage) : Promise.resolve('—'),
      countExams('scheduled', canManage),
      countExams('published', canManage),
      countExams('locked', canManage),
    ])
      .then(([draft, scheduled, published, locked]) => {
        if (!mounted) return;
        setStats([
          { label: 'Draft', value: draft, note: canManage ? 'planning' : 'restricted' },
          { label: 'Scheduled', value: scheduled, note: 'upcoming' },
          { label: 'Published', value: published, note: 'results ready' },
          { label: 'Locked', value: locked, note: 'protected' },
        ]);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [canManage]);

  const columns = [
    {
      key: 'name',
      label: 'Exam',
      render: (row) => (
        <button className="text-left font-medium text-white" onClick={() => navigate(`/exams/${row.id}`)}>
          {row.name}
          <span className="mt-1 block text-xs text-zinc-500">{row.term}</span>
        </button>
      ),
    },
    { key: 'classId', label: 'Class', render: (row) => row.class?.name || classes.find((c) => c.id === row.classId)?.name || '—' },
    { key: 'scheduledFor', label: 'Schedule', render: (row) => formatDate(row.scheduledFor) },
    { key: 'status', label: 'Status', render: (row) => <Badge variant={row.status}>{row.status}</Badge> },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <DropdownMenu
          trigger="Actions"
          items={[
            { label: 'View detail', onClick: () => navigate(`/exams/${row.id}`) },
            ...(canManage
              ? [
                  { label: 'Edit', onClick: () => setSearchParams({ form: 'edit', id: row.id }) },
                  { label: 'Publish', disabled: row.status === 'locked', onClick: () => setConfirm({ type: 'publish', exam: row }) },
                  { label: 'Lock', disabled: row.status === 'locked', onClick: () => setConfirm({ type: 'lock', exam: row }) },
                ]
              : []),
          ]}
        />
      ),
    },
  ];

  const statusChips = [
    { key: 'all', label: 'All' },
    ...(canManage ? [{ key: 'draft', label: 'Draft' }] : []),
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'ongoing', label: 'Ongoing' },
    { key: 'published', label: 'Published' },
    { key: 'locked', label: 'Locked' },
  ];

  return (
    <>
      <ListPageTemplate
        title="Exams"
        description="Schedule assessments, publish results, and lock editing after release."
        actions={canManage ? <Button onClick={() => setSearchParams({ form: 'new' })}>New exam</Button> : null}
        stats={stats}
        search={search}
        onSearch={setSearch}
        filterChips={statusChips}
        activeFilter={status}
        onFilterChange={setStatus}
        rows={exams}
        columns={columns}
        loading={loading}
        error={error}
        emptyActionLabel={canManage ? 'Create exam' : 'Clear filters'}
        onEmptyAction={() => {
          if (canManage) setSearchParams({ form: 'new' });
          else {
            setSearch('');
            setStatus('all');
          }
        }}
        page={meta.page || page}
        totalPages={meta.totalPages || 1}
        onPageChange={setPage}
      />

      <RecordFormSheet
        open={openForm}
        onClose={() => setSearchParams({})}
        title={active ? 'Edit exam' : 'New exam'}
        description="Set term, class, schedule, subjects, and maximum marks."
        initialValues={
          active
            ? { ...active, subjectIdsText: (active.subjectIds || []).join(', ') }
            : {
                name: '',
                term: 'Term 1',
                classId: classes[0]?.id || '',
                scheduledFor: new Date().toISOString().slice(0, 10),
                status: 'draft',
                maxMarks: 100,
                subjectIdsText: '',
              }
        }
        sections={[
          {
            title: 'Exam',
            fields: [
              { name: 'name', label: 'Name', required: true },
              { name: 'term', label: 'Term', required: true },
              {
                name: 'classId',
                label: 'Class',
                type: 'select',
                required: true,
                options: classes.map((c) => ({ value: c.id, label: c.name })),
              },
              {
                name: 'subjectIdsText',
                label: 'Subject IDs',
                type: 'textarea',
                helperText:
                  subjects.length
                    ? `Comma separated subject UUIDs. Available subjects: ${subjects.map((s) => `${s.name} (${s.id})`).slice(0, 3).join(', ')} ...`
                    : 'Comma separated subject UUIDs.',
              },
              { name: 'scheduledFor', label: 'Scheduled for', type: 'date', required: true },
              { name: 'maxMarks', label: 'Max marks', type: 'number', required: true },
              {
                name: 'status',
                label: 'Status',
                type: 'select',
                required: true,
                options: [
                  { value: 'draft', label: 'Draft' },
                  { value: 'scheduled', label: 'Scheduled' },
                  { value: 'ongoing', label: 'Ongoing' },
                  { value: 'published', label: 'Published' },
                  { value: 'locked', label: 'Locked' },
                ],
              },
            ],
          },
        ]}
        submitLabel="Save exam"
        onSubmit={async (values) => {
          const subjectIds = String(values.subjectIdsText || '')
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean);

          const result = await saveExam({
            id: values.id,
            name: values.name,
            term: values.term,
            classId: values.classId,
            scheduledFor: values.scheduledFor,
            status: values.status,
            maxMarks: Number(values.maxMarks || 0),
            subjectIds,
          });

          if (!result.success) return toast.error(result.message || 'Unable to save exam.');
          toast.success('Exam saved.');
          setSearchParams({});
          load();
        }}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.type === 'lock' ? 'Lock exam' : 'Publish exam'}
        description={confirm ? `Apply ${confirm.type} to ${confirm.exam.name}.` : ''}
        confirmLabel="Continue"
        onConfirm={async () => {
          if (!confirm) return;
          const result = confirm.type === 'lock' ? await lockExam(confirm.exam.id) : await publishExam(confirm.exam.id);
          if (result.success) toast.success(confirm.type === 'lock' ? 'Exam locked.' : 'Exam published.');
          else toast.error(result.message || 'Action failed.');
          setConfirm(null);
          load();
        }}
      />
    </>
  );
}