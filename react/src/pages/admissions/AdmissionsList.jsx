import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { DropdownMenu } from '../../components/ui/DropdownMenu.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { ListPageTemplate } from '../../components/layout/ListPageTemplate.jsx';
import AdmissionForm from './AdmissionForm.jsx';
import { useUI } from '../../context/UIContext.jsx';
import { archiveAdmission, convertAdmissionToStudent, getAdmissions } from '../../services/admissions.service.js';
import { formatDate } from '../../lib/utils.js';

async function countAdmissions(status) {
  const res = await getAdmissions({ page: 1, pageSize: 1, status });
  return res?.meta?.totalItems || 0;
}

export default function AdmissionsList() {
  const { toast } = useUI();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  const [confirm, setConfirm] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, totalItems: 0, pageSize: 8 });

  const [stats, setStats] = useState([
    { label: 'Pipeline', value: '—', note: 'active applicants' },
    { label: 'Approved', value: '—', note: 'ready to convert' },
    { label: 'Converted', value: '—', note: 'student records' },
    { label: 'Rejected', value: '—', note: 'historical tracking' },
  ]);

  const queryForm = searchParams.get('form');
  const editId = searchParams.get('id');

  const [activeAdmission, setActiveAdmission] = useState(null);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const load = () => {
    setLoading(true);
    setError('');

    getAdmissions({
      page,
      pageSize: 8,
      search,
      status,
    })
      .then((res) => {
        setRows(res.items || []);
        setMeta(res.meta || {});
      })
      .catch((e) => setError(e.message || 'Unable to load admissions.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, status]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      countAdmissions('all'),
      countAdmissions('approved'),
      countAdmissions('converted'),
      countAdmissions('rejected'),
    ])
      .then(([total, approved, converted, rejected]) => {
        if (!mounted) return;
        setStats([
          { label: 'Pipeline', value: Math.max(0, total - converted), note: 'active applicants' },
          { label: 'Approved', value: approved, note: 'ready to convert' },
          { label: 'Converted', value: converted, note: 'student records' },
          { label: 'Rejected', value: rejected, note: 'historical tracking' },
        ]);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (queryForm !== 'edit' || !editId) {
      setActiveAdmission(null);
      return;
    }
    const found = rows.find((r) => r.id === editId) || null;
    setActiveAdmission(found);
  }, [queryForm, editId, rows]);

  const columns = [
    {
      key: 'applicantName',
      label: 'Applicant',
      render: (row) => (
        <button className="text-left font-medium text-white" onClick={() => navigate(`/admissions/${row.id}`)}>
          {row.applicantName}
          <span className="mt-1 block text-xs text-zinc-500">Parent: {row.parentName}</span>
        </button>
      ),
    },
    {
      key: 'requestedClassId',
      label: 'Requested class',
      render: (row) => row.requestedClass?.name || '—',
    },
    { key: 'source', label: 'Source', render: (row) => row.source },
    { key: 'createdAt', label: 'Created', render: (row) => formatDate(row.createdAt) },
    { key: 'status', label: 'Status', render: (row) => <Badge variant={row.status}>{row.status}</Badge> },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <DropdownMenu
          trigger="Actions"
          items={[
            { label: 'View detail', onClick: () => navigate(`/admissions/${row.id}`) },
            { label: 'Edit', onClick: () => setSearchParams({ form: 'edit', id: row.id }) },
            { label: 'Convert to student', disabled: row.status !== 'approved', onClick: () => setConfirm({ type: 'convert', admission: row }) },
            { label: 'Archive', danger: true, onClick: () => setConfirm({ type: 'archive', admission: row }) },
          ]}
        />
      ),
    },
  ];

  const mobileRender = (row) => (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <button className="text-left" onClick={() => navigate(`/admissions/${row.id}`)}>
          <p className="font-medium text-white">{row.applicantName}</p>
          <p className="text-xs text-zinc-500">{row.parentName}</p>
        </button>
        <Badge variant={row.status}>{row.status}</Badge>
      </div>
      <p className="text-sm text-zinc-400">{row.requestedClass?.name || '—'} · {row.source}</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => navigate(`/admissions/${row.id}`)}>View</Button>
        <DropdownMenu
          trigger="More"
          items={[
            { label: 'Edit', onClick: () => setSearchParams({ form: 'edit', id: row.id }) },
            { label: 'Convert to student', disabled: row.status !== 'approved', onClick: () => setConfirm({ type: 'convert', admission: row }) },
            { label: 'Archive', danger: true, onClick: () => setConfirm({ type: 'archive', admission: row }) },
          ]}
        />
      </div>
    </div>
  );

  const handleConfirm = async () => {
    if (!confirm) return;

    const row = confirm.admission;

    const result =
      confirm.type === 'archive'
        ? await archiveAdmission(row.id)
        : await convertAdmissionToStudent(row.id);

    if (result.success) toast.success(confirm.type === 'archive' ? 'Admission archived.' : 'Admission converted to student.');
    else toast.error(result.message || 'Action failed.');

    setConfirm(null);

    if (confirm.type === 'convert' && result.student) navigate(`/students/${result.student.id}`);
    load();
  };

  return (
    <>
      <ListPageTemplate
        title="Admissions"
        description="Manage applicants through new, contacted, shortlisted, approved, rejected, and converted states."
        actions={<Button onClick={() => setSearchParams({ form: 'new' })}>New admission</Button>}
        stats={stats}
        search={search}
        onSearch={setSearch}
        filterChips={[
          { key: 'all', label: 'All' },
          { key: 'new', label: 'New' },
          { key: 'contacted', label: 'Contacted' },
          { key: 'shortlisted', label: 'Shortlisted' },
          { key: 'approved', label: 'Approved' },
          { key: 'rejected', label: 'Rejected' },
          { key: 'converted', label: 'Converted' },
        ]}
        activeFilter={status}
        onFilterChange={setStatus}
        rows={rows}
        columns={columns}
        mobileRender={mobileRender}
        emptyActionLabel="Clear filters"
        onEmptyAction={() => {
          setSearch('');
          setStatus('all');
        }}
        loading={loading}
        error={error}
        page={meta.page || page}
        totalPages={meta.totalPages || 1}
        onPageChange={setPage}
      />

      <AdmissionForm
        open={Boolean(searchParams.get('form'))}
        onClose={() => setSearchParams({})}
        admission={searchParams.get('form') === 'edit' ? activeAdmission : null}
        onSaved={(record) => navigate(`/admissions/${record.id}`)}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.type === 'convert' ? 'Convert applicant' : 'Archive applicant'}
        description={confirm ? `Apply this action to ${confirm.admission.applicantName}.` : ''}
        confirmLabel="Continue"
        onConfirm={handleConfirm}
      />
    </>
  );
}