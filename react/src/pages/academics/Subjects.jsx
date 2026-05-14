import { useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Table } from '../../components/ui/Table.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { DropdownMenu } from '../../components/ui/DropdownMenu.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { RecordFormSheet } from '../../components/layout/RecordFormSheet.jsx';
import { useUI } from '../../context/UIContext.jsx';

import { archiveSubject, getClassesSections, getSubjects, saveSubject } from '../../services/academics.service.js';

const MANAGE_ROLES = new Set(['Admin', 'Principal', 'Teacher']);

export default function Subjects() {
  const { toast } = useUI();
  const canManage = true; // route guards already; keep enabled for staff

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [staff, setStaff] = useState([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [subs, cs] = await Promise.all([getSubjects(), getClassesSections()]);
      setSubjects(subs || []);
      setClasses(cs?.classes || []);
      setStaff(cs?.staff || []);
    } catch (e) {
      setError(e.message || 'Unable to load subjects.');
      toast.error(e.message || 'Unable to load subjects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  const classNameById = useMemo(() => new Map(classes.map((c) => [c.id, c.name])), [classes]);

  const teacherOptions = useMemo(() => {
    // Prefer Teachers/Principal for assignments
    const filtered = (staff || []).filter((s) => ['Teacher', 'Principal', 'Admin'].includes(s.roleLabel));
    return filtered.map((s) => ({ value: s.id, label: `${s.name} (${s.roleLabel})` }));
  }, [staff]);

  const classOptions = useMemo(() => classes.map((c) => ({ value: c.id, label: c.name })), [classes]);

  const columns = [
    { key: 'name', label: 'Subject', render: (row) => row.name },
    { key: 'code', label: 'Code', render: (row) => row.code },
    {
      key: 'type',
      label: 'Type',
      render: (row) => <Badge variant={row.type === 'core' ? 'success' : 'info'}>{row.type}</Badge>,
    },
    {
      key: 'teacher',
      label: 'Assigned teacher',
      render: (row) => row.teacher?.name || '—',
    },
    {
      key: 'classes',
      label: 'Active classes',
      render: (row) => {
        const mapped = (row.classes || [])
          .map((x) => x.class?.name || classNameById.get(x.classId) || '')
          .filter(Boolean);
        return mapped.length ? mapped.join(', ') : '—';
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <DropdownMenu
          trigger="Actions"
          items={[
            {
              label: 'Edit',
              onClick: () => {
                setEditing(row);
                setFormOpen(true);
              },
            },
            {
              label: 'Archive',
              danger: true,
              onClick: () => setConfirm(row),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Subjects"
          description="Track subject codes, teacher assignments, and the classes each subject supports."
          actions={
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
              Add subject
            </Button>
          }
        />

        <Card className="p-5">
          {loading ? (
            <p className="text-sm text-zinc-400">Loading...</p>
          ) : error ? (
            <p className="text-sm text-rose-300">{error}</p>
          ) : (
            <Table rows={subjects} columns={columns} />
          )}
        </Card>
      </div>

      <RecordFormSheet
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        title={editing ? 'Edit subject' : 'Add subject'}
        description="Subject code must be unique. Choose teacher and optionally map to classes."
        initialValues={{
          id: editing?.id,
          name: editing?.name || '',
          code: editing?.code || '',
          type: editing?.type || 'core',
          teacherStaffId: editing?.teacherStaffId || editing?.teacher?.id || '',
          classIds: editing?.classes?.map((x) => x.classId) || [],
        }}
        sections={[
          {
            title: 'Subject',
            fields: [
              { name: 'name', label: 'Name', required: true },
              { name: 'code', label: 'Code', required: true },
              {
                name: 'type',
                label: 'Type',
                type: 'select',
                required: true,
                options: [
                  { value: 'core', label: 'Core' },
                  { value: 'elective', label: 'Elective' },
                ],
              },
              {
                name: 'teacherStaffId',
                label: 'Teacher',
                type: 'select',
                required: true,
                options: teacherOptions,
                helperText: 'Must be an active staff member.',
              },
              {
                name: 'classIds',
                label: 'Classes (optional)',
                type: 'multicheck',
                options: classOptions,
                helperText: 'Select classes where this subject is offered.',
              },
            ],
          },
        ]}
        submitLabel="Save subject"
        onSubmit={async (values) => {
          const payload = {
            ...values,
            classIds: Array.isArray(values.classIds) ? values.classIds : [],
          };

          const result = await saveSubject(payload);
          if (!result.success) {
            toast.error(result.message || 'Unable to save subject.');
            return result;
          }

          toast.success(editing ? 'Subject updated.' : 'Subject created.');
          setFormOpen(false);
          setEditing(null);
          load();
          return result;
        }}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title="Archive subject"
        description={confirm ? `Archive "${confirm.name}"?` : ''}
        confirmLabel="Archive"
        onConfirm={async () => {
          if (!confirm) return;
          const result = await archiveSubject(confirm.id);
          if (!result.success) toast.error(result.message || 'Unable to archive subject.');
          else toast.success('Subject archived.');
          setConfirm(null);
          load();
        }}
      />
    </>
  );
}