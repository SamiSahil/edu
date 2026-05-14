import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { SearchBar } from '../../components/ui/SearchBar.jsx';
import { FilterChips } from '../../components/ui/FilterChips.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Table } from '../../components/ui/Table.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { StatCard } from '../../components/ui/StatCard.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { DropdownMenu } from '../../components/ui/DropdownMenu.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';

import StudentForm from './StudentForm.jsx';
import { useUI } from '../../context/UIContext.jsx';

import { getStudents, archiveStudent, promoteStudent, transferStudent, getStudentById } from '../../services/students.service.js';
import { getClassesSections } from '../../services/academics.service.js';

function uniqueSortedYears(items) {
  const years = Array.from(new Set((items || []).map((s) => String(s.admissionYear)).filter(Boolean)));
  years.sort((a, b) => Number(b) - Number(a));
  return years;
}

async function fetchCountByStatus(status) {
  const result = await getStudents({ page: 1, pageSize: 1, status });
  return result?.meta?.totalItems || 0;
}

export default function StudentsList() {
  const { toast } = useUI();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, totalItems: 0, pageSize: 8 });

  const [lookups, setLookups] = useState({ classes: [], sections: [] });

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    classId: 'all',
    sectionId: 'all',
    gender: 'all',
    admissionYear: 'all',
  });
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState(null);

  const [stats, setStats] = useState([
    { label: 'Active', value: '—', note: 'currently enrolled' },
    { label: 'Promoted', value: '—', note: 'this cycle' },
    { label: 'Transferred', value: '—', note: 'historical records' },
    { label: 'Archived', value: '—', note: 'preserved history' },
  ]);

  const queryForm = searchParams.get('form');
  const editId = searchParams.get('id');
  const openForm = Boolean(queryForm);

  const [editRecord, setEditRecord] = useState(null);

  useEffect(() => {
    let mounted = true;
    getClassesSections()
      .then((data) => {
        if (!mounted) return;
        setLookups({ classes: data.classes || [], sections: data.sections || [] });
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, filters]);

  const load = () => {
    setLoading(true);
    setError('');

    getStudents({
      page,
      pageSize: 8,
      search,
      status: filters.status,
      classId: filters.classId,
      sectionId: filters.sectionId,
      gender: filters.gender,
      admissionYear: filters.admissionYear,
    })
      .then((result) => {
        setRows(result.items || []);
        setMeta(result.meta || {});
      })
      .catch((e) => setError(e.message || 'Unable to load students.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, filters]);

  useEffect(() => {
    let mounted = true;
    // Stats ignore filters (school-wide), similar to local DB behavior
    Promise.all([
      fetchCountByStatus('active'),
      fetchCountByStatus('promoted'),
      fetchCountByStatus('transferred'),
      fetchCountByStatus('archived'),
    ])
      .then(([active, promoted, transferred, archived]) => {
        if (!mounted) return;
        setStats([
          { label: 'Active', value: active, note: 'currently enrolled' },
          { label: 'Promoted', value: promoted, note: 'this cycle' },
          { label: 'Transferred', value: transferred, note: 'historical records' },
          { label: 'Archived', value: archived, note: 'preserved history' },
        ]);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!openForm) {
      setEditRecord(null);
      return;
    }
    if (queryForm !== 'edit' || !editId) {
      setEditRecord(null);
      return;
    }

    let mounted = true;
    getStudentById(editId)
      .then((data) => mounted && setEditRecord(data))
      .catch((e) => toast.error(e.message || 'Unable to load student for edit.'));
    return () => {
      mounted = false;
    };
  }, [openForm, queryForm, editId, toast]);

  const admissionYearOptions = uniqueSortedYears(rows);
  const visibleSections =
    filters.classId === 'all'
      ? lookups.sections
      : lookups.sections.filter((s) => s.classId === filters.classId);

  const columns = [
    {
      key: 'fullName',
      label: 'Student',
      render: (row) => (
        <button
          className="text-left font-medium text-white transition hover:text-emerald-300"
          onClick={() => navigate(`/students/${row.id}`)}
        >
          {row.fullName}
          <span className="mt-1 block text-xs text-zinc-500">{row.admissionNo}</span>
        </button>
      ),
    },
    {
      key: 'class',
      label: 'Class',
      render: (row) => `${row.class?.name || '—'} / ${row.section?.name || '—'}`,
    },
    {
      key: 'guardian',
      label: 'Guardian',
      render: (row) => row.guardian?.name || '—',
    },
    { key: 'phone', label: 'Contact', render: (row) => row.phone },
    { key: 'status', label: 'Status', render: (row) => <Badge variant={row.status}>{row.status}</Badge> },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <DropdownMenu
          trigger="Actions"
          items={[
            { label: 'View profile', onClick: () => navigate(`/students/${row.id}`) },
            { label: 'Edit', onClick: () => setSearchParams({ form: 'edit', id: row.id }) },
            { label: 'Promote', onClick: () => setConfirm({ type: 'promote', student: row }) },
            { label: 'Transfer', onClick: () => setConfirm({ type: 'transfer', student: row }) },
            { label: 'Archive', danger: true, onClick: () => setConfirm({ type: 'archive', student: row }) },
          ]}
        />
      ),
    },
  ];

  const handleConfirm = async () => {
    if (!confirm) return;

    let result;
    if (confirm.type === 'archive') result = await archiveStudent(confirm.student.id);
    if (confirm.type === 'promote') result = await promoteStudent(confirm.student.id);
    if (confirm.type === 'transfer') result = await transferStudent(confirm.student.id, 'Transferred from list action');

    if (result?.success) {
      toast.success(`${confirm.student.fullName} updated.`);
      load();
    } else toast.error(result?.message || 'Action failed.');

    setConfirm(null);
  };

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Students"
          description="Search by name, admission number, guardian name, or contact. Filter by class/section, status, gender, and admission year."
          actions={<Button onClick={() => setSearchParams({ form: 'new' })}>Add student</Button>}
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <StatCard key={item.label} label={item.label} value={item.value} note={item.note} />
          ))}
        </div>

        <Card className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <SearchBar value={search} onChange={setSearch} placeholder="Search students..." />
            <FilterChips
              items={[
                { key: 'all', label: 'All statuses' },
                { key: 'active', label: 'Active' },
                { key: 'promoted', label: 'Promoted' },
                { key: 'transferred', label: 'Transferred' },
                { key: 'archived', label: 'Archived' },
              ]}
              active={filters.status}
              onChange={(key) => setFilters((current) => ({ ...current, status: key }))}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Class"
              value={filters.classId}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  classId: event.target.value,
                  sectionId: 'all',
                }))
              }
            >
              <option value="all">All classes</option>
              {(lookups.classes || []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>

            <Select
              label="Section"
              value={filters.sectionId}
              onChange={(event) => setFilters((current) => ({ ...current, sectionId: event.target.value }))}
            >
              <option value="all">All sections</option>
              {visibleSections.map((item) => (
                <option key={item.id} value={item.id}>
                  {(lookups.classes || []).find((c) => c.id === item.classId)?.name || 'Class'} / {item.name}
                </option>
              ))}
            </Select>

            <Select
              label="Gender"
              value={filters.gender}
              onChange={(event) => setFilters((current) => ({ ...current, gender: event.target.value }))}
            >
              <option value="all">All</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>

            <Select
              label="Admission year"
              value={filters.admissionYear}
              onChange={(event) => setFilters((current) => ({ ...current, admissionYear: event.target.value }))}
            >
              <option value="all">All years</option>
              {admissionYearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>
          </div>

          {loading ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-400">Loading students...</p>
            </div>
          ) : error ? (
            <EmptyState title="Unable to load students" description={error} actionLabel="Retry" onAction={load} />
          ) : rows.length ? (
            <>
              <Table rows={rows} columns={columns} />
              <Pagination page={meta.page || page} totalPages={meta.totalPages || 1} onPageChange={setPage} />
            </>
          ) : (
            <EmptyState
              title="No students found"
              description="Try adjusting search terms or filters, or add a new student record."
              actionLabel="Clear filters"
              onAction={() => {
                setSearch('');
                setFilters({ status: 'all', classId: 'all', sectionId: 'all', gender: 'all', admissionYear: 'all' });
              }}
            />
          )}
        </Card>
      </div>

      <StudentForm
        open={openForm}
        student={queryForm === 'edit' ? editRecord : null}
        studentId={queryForm === 'edit' ? editId : null}
        onClose={() => setSearchParams({})}
        onSaved={(record) => navigate(`/students/${record.id}`)}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={
          confirm?.type === 'archive'
            ? 'Archive student'
            : confirm?.type === 'transfer'
            ? 'Transfer student'
            : 'Promote student'
        }
        description={confirm ? `Apply this action to ${confirm.student.fullName}.` : ''}
        confirmLabel="Continue"
        onConfirm={handleConfirm}
      />
    </>
  );
}