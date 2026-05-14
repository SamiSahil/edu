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

import { getClassesSections, saveClass, saveSection, archiveClass, archiveSection, getSubjects } from '../../services/academics.service.js';
import { getStudents } from '../../services/students.service.js';

const MANAGE_ROLES = new Set(['Admin', 'Principal', 'Teacher']);

export default function ClassesSections() {
  const { toast } = useUI();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [staff, setStaff] = useState([]);

  const [studentTotal, setStudentTotal] = useState('—');
  const [teacherTotal, setTeacherTotal] = useState('—');

  const [strengthMap, setStrengthMap] = useState({}); // classId -> count

  const [classFormOpen, setClassFormOpen] = useState(false);
  const [sectionFormOpen, setSectionFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [editingSection, setEditingSection] = useState(null);

  const [confirm, setConfirm] = useState(null);

  const canManage = MANAGE_ROLES.has('Admin') || MANAGE_ROLES.has('Principal') || MANAGE_ROLES.has('Teacher'); 
  // Route already guards; keep always true for this page.

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getClassesSections();
      const cls = data?.classes || [];
      const sec = data?.sections || [];
      const stf = data?.staff || [];

      setClasses(cls);
      setSections(sec);
      setStaff(stf);

      // students total
      try {
        const res = await getStudents({ page: 1, pageSize: 1, status: 'all' });
        setStudentTotal(res?.meta?.totalItems ?? 0);
      } catch {
        setStudentTotal('—');
      }

      // class strengths
      try {
        const pairs = await Promise.all(
          cls.map(async (c) => {
            const r = await getStudents({ page: 1, pageSize: 1, status: 'all', classId: c.id });
            return [c.id, r?.meta?.totalItems ?? 0];
          })
        );
        setStrengthMap(Object.fromEntries(pairs));
      } catch {
        setStrengthMap({});
      }

      // teacher count approximation from subjects assigned teachers (unique)
      try {
        const subs = await getSubjects();
        const teacherIds = new Set((subs || []).map((s) => s.teacherStaffId).filter(Boolean));
        setTeacherTotal(teacherIds.size);
      } catch {
        setTeacherTotal('—');
      }
    } catch (e) {
      setError(e.message || 'Unable to load classes/sections.');
      toast.error(e.message || 'Unable to load classes/sections.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const classSectionsMap = useMemo(() => {
    const map = new Map();
    (sections || []).forEach((s) => {
      if (!map.has(s.classId)) map.set(s.classId, []);
      map.get(s.classId).push(s);
    });
    return map;
  }, [sections]);

  const teacherOptions = useMemo(() => {
    return (staff || []).map((s) => ({ value: s.id, label: `${s.name} (${s.roleLabel})` }));
  }, [staff]);

  const columns = [
    { key: 'name', label: 'Class', render: (row) => row.name },
    { key: 'code', label: 'Code', render: (row) => row.code },
    {
      key: 'sections',
      label: 'Sections',
      render: (row) => (classSectionsMap.get(row.id) || []).map((s) => s.name).join(', ') || '-',
    },
    {
      key: 'teacher',
      label: 'Class teacher',
      render: (row) => row.classTeacher?.name || '-',
    },
    {
      key: 'strength',
      label: 'Strength',
      render: (row) => strengthMap[row.id] ?? 0,
    },
    { key: 'status', label: 'Status', render: () => <Badge variant="success">active</Badge> },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <DropdownMenu
          trigger="Actions"
          items={[
            {
              label: 'Edit class',
              onClick: () => {
                setEditingClass(row);
                setClassFormOpen(true);
              },
            },
            {
              label: 'Archive class',
              danger: true,
              onClick: () => setConfirm({ type: 'class', record: row }),
            },
          ]}
        />
      ),
    },
  ];

  const sectionCards = useMemo(() => {
    return (sections || []).map((s) => {
      const cls = classes.find((c) => c.id === s.classId);
      return { ...s, className: cls?.name || 'Class' };
    });
  }, [sections, classes]);

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Classes & Sections"
          description="Maintain the class hierarchy, section mapping, and teacher assignment structure."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => { setEditingClass(null); setClassFormOpen(true); }}>
                Add class
              </Button>
              <Button variant="secondary" onClick={() => { setEditingSection(null); setSectionFormOpen(true); }}>
                Add section
              </Button>
            </div>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">Classes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{classes.length}</p>
          </Card>
          <Card className="p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">Sections</p>
            <p className="mt-2 text-3xl font-semibold text-white">{sections.length}</p>
          </Card>
          <Card className="p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">Students</p>
            <p className="mt-2 text-3xl font-semibold text-white">{studentTotal}</p>
          </Card>
          <Card className="p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">Teachers</p>
            <p className="mt-2 text-3xl font-semibold text-white">{teacherTotal}</p>
          </Card>
        </div>

        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Class roster</h2>
          {loading ? (
            <p className="text-sm text-zinc-400">Loading...</p>
          ) : error ? (
            <p className="text-sm text-rose-300">{error}</p>
          ) : (
            <Table rows={classes} columns={columns} />
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Sections</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {sectionCards.map((section) => (
              <div key={section.id} className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">
                      {section.className} / {section.name}
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">Capacity {section.capacity}</p>
                  </div>
                  <DropdownMenu
                    trigger="Actions"
                    items={[
                      {
                        label: 'Edit section',
                        onClick: () => {
                          setEditingSection(section);
                          setSectionFormOpen(true);
                        },
                      },
                      {
                        label: 'Archive section',
                        danger: true,
                        onClick: () => setConfirm({ type: 'section', record: section }),
                      },
                    ]}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Class form */}
      <RecordFormSheet
        open={classFormOpen}
        onClose={() => { setClassFormOpen(false); setEditingClass(null); }}
        title={editingClass ? 'Edit class' : 'Add class'}
        description="Class codes must be unique within the school."
        initialValues={{
          id: editingClass?.id,
          name: editingClass?.name || '',
          code: editingClass?.code || '',
          order: editingClass?.order ?? 1,
          classTeacherStaffId: editingClass?.classTeacherStaffId || '',
        }}
        sections={[
          {
            title: 'Class',
            fields: [
              { name: 'name', label: 'Name', required: true },
              { name: 'code', label: 'Code', required: true, helperText: 'Unique per school, e.g. G1' },
              { name: 'order', label: 'Order', type: 'number', required: true, helperText: 'Sort order (1..)' },
              {
                name: 'classTeacherStaffId',
                label: 'Class teacher',
                type: 'select',
                options: [{ value: '', label: '— Unassigned —' }, ...teacherOptions],
                helperText: 'Optional',
              },
            ],
          },
        ]}
        submitLabel="Save class"
        onSubmit={async (values) => {
          const payload = {
            ...values,
            classTeacherStaffId: values.classTeacherStaffId ? values.classTeacherStaffId : null,
            order: Number(values.order),
          };

          const result = await saveClass(payload);
          if (!result.success) {
            toast.error(result.message || 'Unable to save class.');
            return result;
          }

          toast.success(editingClass ? 'Class updated.' : 'Class created.');
          setClassFormOpen(false);
          setEditingClass(null);
          load();
          return result;
        }}
      />

      {/* Section form */}
      <RecordFormSheet
        open={sectionFormOpen}
        onClose={() => { setSectionFormOpen(false); setEditingSection(null); }}
        title={editingSection ? 'Edit section' : 'Add section'}
        description="Sections are unique per class (e.g. A, B)."
        initialValues={{
          id: editingSection?.id,
          classId: editingSection?.classId || classes[0]?.id || '',
          name: editingSection?.name || '',
          capacity: editingSection?.capacity ?? 30,
        }}
        sections={[
          {
            title: 'Section',
            fields: [
              {
                name: 'classId',
                label: 'Class',
                type: 'select',
                required: true,
                options: classes.map((c) => ({ value: c.id, label: c.name })),
              },
              { name: 'name', label: 'Section name', required: true, helperText: 'e.g. A, B' },
              { name: 'capacity', label: 'Capacity', type: 'number', required: true },
            ],
          },
        ]}
        submitLabel="Save section"
        onSubmit={async (values) => {
          const payload = {
            ...values,
            capacity: Number(values.capacity),
          };

          const result = await saveSection(payload);
          if (!result.success) {
            toast.error(result.message || 'Unable to save section.');
            return result;
          }

          toast.success(editingSection ? 'Section updated.' : 'Section created.');
          setSectionFormOpen(false);
          setEditingSection(null);
          load();
          return result;
        }}
      />

      {/* Confirm archive */}
      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.type === 'class' ? 'Archive class' : 'Archive section'}
        description={confirm?.record ? `Archive "${confirm.record.name}"?` : ''}
        confirmLabel="Archive"
        onConfirm={async () => {
          if (!confirm) return;

          const result =
            confirm.type === 'class'
              ? await archiveClass(confirm.record.id)
              : await archiveSection(confirm.record.id);

          if (!result.success) toast.error(result.message || 'Unable to archive.');
          else toast.success('Archived.');

          setConfirm(null);
          load();
        }}
      />
    </>
  );
}