import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { DropdownMenu } from '../../components/ui/DropdownMenu.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { ListPageTemplate } from '../../components/layout/ListPageTemplate.jsx';
import { Select } from '../../components/ui/Select.jsx';

import StaffForm from './StaffForm.jsx';
import { useUI } from '../../context/UIContext.jsx';
import { archiveStaff, getStaff, getStaffById } from '../../services/staff.service.js';
import { formatDate } from '../../lib/utils.js';

export default function StaffList() {
  const { toast } = useUI();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [roleLabel, setRoleLabel] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  const [confirm, setConfirm] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, totalItems: 0, pageSize: 8 });

  const openForm = Boolean(searchParams.get('form'));
  const formMode = searchParams.get('form'); // new | edit
  const editId = searchParams.get('id');

  const [editing, setEditing] = useState(null);

  useEffect(() => setPage(1), [search, roleLabel, status]);

  const load = () => {
    setLoading(true);
    setError('');

    getStaff({
      page,
      pageSize: 8,
      search,
      role: roleLabel,
      status,
    })
      .then((res) => {
        setRows(res.items || []);
        setMeta(res.meta || {});
      })
      .catch((e) => setError(e.message || 'Unable to load staff.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, roleLabel, status]);

  useEffect(() => {
    if (!openForm) {
      setEditing(null);
      return;
    }

    if (formMode === 'edit' && editId) {
      getStaffById(editId)
        .then((data) => setEditing(data))
        .catch((e) => toast.error(e.message || 'Unable to load staff record.'));
      return;
    }

    setEditing(null);
  }, [openForm, formMode, editId, toast]);

  const stats = useMemo(() => {
    const teachers = rows.filter((r) => r.roleLabel === 'Teacher').length;
    const leadership = rows.filter((r) => r.roleLabel === 'Principal' || r.roleLabel === 'Admin').length;
    const support = rows.filter((r) => ['Accountant', 'Librarian'].includes(r.roleLabel)).length;
    const active = rows.filter((r) => r.status === 'active').length;
    return [
      { label: 'Teachers', value: teachers, note: 'page scope' },
      { label: 'Leadership', value: leadership, note: 'page scope' },
      { label: 'Support', value: support, note: 'page scope' },
      { label: 'Active', value: active, note: 'page scope' },
    ];
  }, [rows]);

  const columns = [
    {
      key: 'name',
      label: 'Staff',
      render: (row) => (
        <button className="text-left font-medium text-white" onClick={() => navigate(`/staff/${row.id}`)}>
          {row.name}
          <span className="mt-1 block text-xs text-zinc-500">{row.email}</span>
        </button>
      ),
    },
    { key: 'roleLabel', label: 'Role', render: (row) => row.roleLabel },
    { key: 'department', label: 'Department', render: (row) => row.department },
    { key: 'joinDate', label: 'Join date', render: (row) => formatDate(row.joinDate) },
    { key: 'status', label: 'Status', render: (row) => <Badge variant={row.status}>{row.status}</Badge> },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <DropdownMenu
          trigger="Actions"
          items={[
            { label: 'View detail', onClick: () => navigate(`/staff/${row.id}`) },
            { label: 'Edit', onClick: () => setSearchParams({ form: 'edit', id: row.id }) },
            { label: 'Archive', danger: true, onClick: () => setConfirm(row) },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <ListPageTemplate
        title="Staff"
        description="Maintain staff profiles, roles, and departments."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Select value={roleLabel} onChange={(e) => setRoleLabel(e.target.value)} className="h-10 rounded-full bg-zinc-900 text-sm">
              <option value="all">All roles</option>
              <option value="Teacher">Teacher</option>
              <option value="Principal">Principal</option>
              <option value="Accountant">Accountant</option>
              <option value="Librarian">Librarian</option>
              <option value="Admin">Admin</option>
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-full bg-zinc-900 text-sm">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
            <Button onClick={() => setSearchParams({ form: 'new' })}>Add staff</Button>
          </div>
        }
        stats={stats}
        search={search}
        onSearch={setSearch}
        rows={rows}
        columns={columns}
        loading={loading}
        error={error}
        page={meta.page || page}
        totalPages={meta.totalPages || 1}
        onPageChange={setPage}
      />

      <StaffForm
        open={openForm}
        onClose={() => setSearchParams({})}
        staff={formMode === 'edit' ? editing : null}
        onSaved={(record) => {
          setSearchParams({});
          navigate(`/staff/${record.id}`);
        }}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title="Archive staff"
        description={confirm ? `Archive ${confirm.name}?` : ''}
        confirmLabel="Archive"
        onConfirm={async () => {
          if (!confirm) return;
          const result = await archiveStaff(confirm.id);
          if (result.success) toast.success('Staff archived.');
          else toast.error(result.message || 'Unable to archive staff.');
          setConfirm(null);
          load();
        }}
      />
    </>
  );
}