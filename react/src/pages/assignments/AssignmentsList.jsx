import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { DropdownMenu } from '../../components/ui/DropdownMenu.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { ListPageTemplate } from '../../components/layout/ListPageTemplate.jsx';

import AssignmentForm from './AssignmentForm.jsx';
import { useUI } from '../../context/UIContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

import { getAssignments, archiveAssignment, getAssignmentById } from '../../services/assignments.service.js';
import { formatDate } from '../../lib/utils.js';

const MANAGE_ROLES = new Set(['Admin', 'Principal', 'Teacher']);

export default function AssignmentsList() {
  const { toast } = useUI();
  const { role } = useAuth();
  const canManage = MANAGE_ROLES.has(role);

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

  const [editing, setEditing] = useState(null);

  const openForm = canManage && Boolean(searchParams.get('form'));
  const formMode = searchParams.get('form'); // new | edit
  const editId = searchParams.get('id');

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const load = () => {
    setLoading(true);
    setError('');

    getAssignments({
      page,
      pageSize: 8,
      search,
      status,
    })
      .then((res) => {
        setRows(res.items || []);
        setMeta(res.meta || {});
      })
      .catch((e) => setError(e.message || 'Unable to load assignments.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, status]);

  useEffect(() => {
    if (!openForm) {
      setEditing(null);
      return;
    }

    if (formMode === 'edit' && editId) {
      getAssignmentById(editId)
        .then((data) => setEditing(data))
        .catch((e) => toast.error(e.message || 'Unable to load assignment.'));
      return;
    }

    setEditing(null);
  }, [openForm, formMode, editId, toast]);

  const stats = useMemo(() => {
    // Page-based stats (fast, no extra API)
    const published = rows.filter((r) => r.status === 'published').length;
    const drafts = rows.filter((r) => r.status === 'draft').length;
    const closed = rows.filter((r) => r.status === 'closed').length;
    const late = rows.reduce((sum, r) => sum + Number(r.lateSubmissions || 0), 0);

    return [
      { label: 'Published', value: published, note: 'page scope' },
      { label: 'Drafts', value: canManage ? drafts : '—', note: canManage ? 'page scope' : 'restricted' },
      { label: 'Closed', value: closed, note: 'page scope' },
      { label: 'Late submissions', value: late, note: 'as tracked' },
    ];
  }, [rows, canManage]);

  const columns = [
    {
      key: 'title',
      label: 'Assignment',
      render: (row) => (
        <button className="text-left font-medium text-white" onClick={() => navigate(`/assignments/${row.id}`)}>
          {row.title}
          <span className="mt-1 block text-xs text-zinc-500">Due {formatDate(row.dueDate)}</span>
        </button>
      ),
    },
    {
      key: 'classId',
      label: 'Class',
      render: (row) => `${row.class?.name || '—'} / ${row.section?.name || '—'}`,
    },
    {
      key: 'subjectId',
      label: 'Subject',
      render: (row) => row.subject?.name || '—',
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge variant={row.status}>{row.status}</Badge>,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <DropdownMenu
          trigger="Actions"
          items={[
            { label: 'View detail', onClick: () => navigate(`/assignments/${row.id}`) },
            ...(canManage
              ? [
                  { label: 'Edit', onClick: () => setSearchParams({ form: 'edit', id: row.id }) },
                  { label: 'Archive', danger: true, onClick: () => setConfirm({ assignment: row }) },
                ]
              : []),
          ]}
        />
      ),
    },
  ];

  const mobileRender = (row) => (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <button className="text-left" onClick={() => navigate(`/assignments/${row.id}`)}>
          <p className="font-medium text-white">{row.title}</p>
          <p className="text-xs text-zinc-500">{row.subject?.name || '—'}</p>
        </button>
        <Badge variant={row.status}>{row.status}</Badge>
      </div>
      <p className="text-sm text-zinc-400">
        {row.class?.name || '—'} / {row.section?.name || '—'}
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => navigate(`/assignments/${row.id}`)}>
          View
        </Button>
        {canManage ? (
          <DropdownMenu
            trigger="More"
            items={[
              { label: 'Edit', onClick: () => setSearchParams({ form: 'edit', id: row.id }) },
              { label: 'Archive', danger: true, onClick: () => setConfirm({ assignment: row }) },
            ]}
          />
        ) : null}
      </div>
    </div>
  );

  const handleConfirm = async () => {
    if (!confirm) return;
    const result = await archiveAssignment(confirm.assignment.id);
    if (result.success) toast.success('Assignment archived.');
    else toast.error(result.message || 'Unable to archive assignment.');
    setConfirm(null);
    load();
  };

  return (
    <>
      <ListPageTemplate
        title="Assignments"
        description="Publish classwork, track submissions, and keep due dates visible for students and parents."
        actions={canManage ? <Button onClick={() => setSearchParams({ form: 'new' })}>New assignment</Button> : null}
        stats={stats}
        search={search}
        onSearch={setSearch}
        filterChips={[
          { key: 'all', label: 'All' },
          ...(canManage ? [{ key: 'draft', label: 'Draft' }] : []),
          { key: 'published', label: 'Published' },
          { key: 'closed', label: 'Closed' },
        ]}
        activeFilter={status}
        onFilterChange={setStatus}
        rows={rows}
        columns={columns}
        mobileRender={mobileRender}
        loading={loading}
        error={error}
        emptyActionLabel={canManage ? 'Create assignment' : 'Clear filters'}
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

      <AssignmentForm
        open={openForm}
        onClose={() => setSearchParams({})}
        assignment={formMode === 'edit' ? editing : null}
        onSaved={() => {
          setSearchParams({});
          load();
        }}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title="Archive assignment"
        description={confirm ? `Archive ${confirm.assignment.title}?` : ''}
        confirmLabel="Archive"
        onConfirm={handleConfirm}
      />
    </>
  );
}