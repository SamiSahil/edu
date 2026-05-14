import { useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { RecordFormSheet } from '../../components/layout/RecordFormSheet.jsx';

import { useUI } from '../../context/UIContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

import { WEEK_DAYS } from '../../lib/constants.js';

import { getClassesSections, getSubjects, getTimetable, saveTimetableEntry } from '../../services/academics.service.js';
import { getStudentById } from '../../services/students.service.js';

const MANAGE_ROLES = new Set(['Admin', 'Principal', 'Teacher']);

function buildPeriods() {
  return Array.from({ length: 6 }, (_, index) => index + 1);
}

export default function Timetable() {
  const { toast } = useUI();
  const { user, role } = useAuth();

  const canManage = MANAGE_ROLES.has(role);
  const isStudentLike = role === 'Student' || role === 'Parent';

  const periods = useMemo(buildPeriods, []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjectsList] = useState([]); // staff only

  // Allowed class/section pairs for Student/Parent derived from linked students
  const [allowedPairs, setAllowedPairs] = useState([]);

  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');

  const [entries, setEntries] = useState([]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const classNameById = useMemo(() => new Map(classes.map((c) => [c.id, c.name])), [classes]);
  const sectionNameById = useMemo(() => new Map(sections.map((s) => [s.id, s.name])), [sections]);

  // Teacher options are only needed for staff edit form
  const teacherOptions = useMemo(() => {
    const seen = new Map();
    (subjects || []).forEach((s) => {
      const t = s.teacher;
      if (t?.id && !seen.has(t.id)) {
        seen.set(t.id, { value: t.id, label: `${t.name} (${t.roleLabel || 'Staff'})` });
      }
    });
    return Array.from(seen.values());
  }, [subjects]);

  const visibleClasses = useMemo(() => {
    if (!isStudentLike) return classes;
    const ids = new Set(allowedPairs.map((p) => p.classId));
    return classes.filter((c) => ids.has(c.id));
  }, [allowedPairs, classes, isStudentLike]);

  const visibleSections = useMemo(() => {
    if (!isStudentLike) return sections;
    const ids = new Set(allowedPairs.map((p) => p.sectionId));
    return sections.filter((s) => ids.has(s.id));
  }, [allowedPairs, isStudentLike, sections]);

  /**
   * Load lookups:
   * - Staff: can call /classes-sections and /subjects
   * - Parent/Student: must NOT call those endpoints (they are staff-only => 403).
   *   Instead, derive allowedPairs + minimal class/section options from linked student details.
   */
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    async function loadForStaff() {
      const [cs, subs] = await Promise.all([getClassesSections(), getSubjects()]);
      if (!mounted) return;

      setClasses(cs?.classes || []);
      setSections(cs?.sections || []);
      setSubjectsList(subs || []);

      const pairs = (cs?.sections || []).map((s) => ({ classId: s.classId, sectionId: s.id }));
      setAllowedPairs(pairs);

      const first = cs?.sections?.[0];
      if (first?.classId && first?.id) {
        setClassId(first.classId);
        setSectionId(first.id);
      }
    }

    async function loadForStudentParent() {
      const linkedIds = user?.linkedStudentIds || [];
      const details = await Promise.all(linkedIds.map((sid) => getStudentById(sid).catch(() => null)));
      if (!mounted) return;

      const okStudents = details.filter(Boolean);

      const seen = new Set();
      const pairs = [];
      const clsMap = new Map();
      const secMap = new Map();

      for (const st of okStudents) {
        const cId = st.classId || st.class?.id;
        const sId = st.sectionId || st.section?.id;
        if (!cId || !sId) continue;

        const key = `${cId}::${sId}`;
        if (!seen.has(key)) {
          seen.add(key);
          pairs.push({ classId: cId, sectionId: sId });
        }

        // minimal options for selects
        if (st.class?.id) clsMap.set(st.class.id, { id: st.class.id, name: st.class.name });
        if (st.section?.id) secMap.set(st.section.id, { id: st.section.id, name: st.section.name, classId: cId });
      }

      setAllowedPairs(pairs);
      setClasses(Array.from(clsMap.values()));
      setSections(Array.from(secMap.values()));

      // Do not load subjects list for parents/students (staff-only endpoint)
      setSubjectsList([]);

      // default selection
      if (pairs[0]?.classId && pairs[0]?.sectionId) {
        setClassId(pairs[0].classId);
        setSectionId(pairs[0].sectionId);
      }
    }

    (async () => {
      try {
        if (isStudentLike) await loadForStudentParent();
        else await loadForStaff();
      } catch (e) {
        if (!mounted) return;
        setError(e.message || 'Unable to load timetable lookups.');
        // NOTE: avoid toast.error here to prevent loops if your toast reference is unstable
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isStudentLike, role, user?.linkedStudentIds]);

  // Load timetable entries when selection changes
  useEffect(() => {
    if (!classId || !sectionId) return;

    let mounted = true;
    setError('');

    getTimetable({ classId, sectionId })
      .then((data) => {
        if (!mounted) return;
        setEntries(data || []);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e.message || 'Unable to load timetable entries.');
      });

    return () => {
      mounted = false;
    };
  }, [classId, sectionId]);

  const getSlot = (day, period) =>
    entries.find((e) => e.day === day && Number(e.period) === Number(period)) || null;

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (entry) => {
    setEditing(entry);
    setOpen(true);
  };

  // Staff form schema (parents/students never open this because canManage=false)
  const sectionsSchema = [
    {
      title: 'Timetable Entry',
      fields: [
        {
          name: 'classId',
          label: 'Class',
          type: 'select',
          required: true,
          options: visibleClasses.map((c) => ({ value: c.id, label: c.name })),
        },
        {
          name: 'sectionId',
          label: 'Section',
          type: 'select',
          required: true,
          options: visibleSections.map((s) => ({
            value: s.id,
            label: `${classNameById.get(s.classId) || 'Class'} / ${s.name}`,
          })),
        },
        { name: 'day', label: 'Day', type: 'select', required: true, options: WEEK_DAYS.map((d) => ({ value: d, label: d })) },
        { name: 'period', label: 'Period', type: 'select', required: true, options: periods.map((p) => ({ value: String(p), label: `Period ${p}` })) },
        { name: 'subjectId', label: 'Subject', type: 'select', required: true, options: (subjects || []).map((s) => ({ value: s.id, label: s.name })) },
        { name: 'teacherStaffId', label: 'Teacher', type: 'select', required: true, options: teacherOptions },
        { name: 'room', label: 'Room', helperText: 'Optional room label (conflict checked if supplied).' },
      ],
    },
  ];

  const submit = async (values) => {
    if (!canManage) {
      toast.error('You do not have permission to edit the timetable.');
      return;
    }

    const payload = {
      ...values,
      period: Number(values.period),
      room: values.room || '',
    };

    const result = await saveTimetableEntry(payload);
    if (!result.success) {
      toast.error(result.message || result.errors?._form || 'Unable to save timetable entry.');
      return;
    }

    toast.success(editing ? 'Timetable entry updated.' : 'Timetable entry created.');
    setOpen(false);
    setEditing(null);

    // refresh entries
    const refreshed = await getTimetable({ classId: payload.classId, sectionId: payload.sectionId }).catch(() => null);
    if (refreshed) setEntries(refreshed);
  };

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Timetable"
          description="Review schedules by class/section. Parents and students only see linked sections."
          actions={canManage ? <Button onClick={openNew}>Add entry</Button> : null}
        />

        {loading ? <p className="text-sm text-zinc-400">Loading...</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Class"
            value={classId}
            onChange={(event) => {
              const nextClassId = event.target.value;
              setClassId(nextClassId);

              const firstSection =
                visibleSections.find((s) => s.classId === nextClassId) || visibleSections[0];

              if (firstSection) setSectionId(firstSection.id);
            }}
            disabled={loading || visibleClasses.length <= 1}
          >
            {visibleClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>

          <Select
            label="Section"
            value={sectionId}
            onChange={(event) => setSectionId(event.target.value)}
            disabled={loading || visibleSections.filter((s) => s.classId === classId).length <= 1}
          >
            {visibleSections
              .filter((s) => s.classId === classId)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </Select>
        </div>

        <Card className="p-4 sm:p-5">
          {entries.length ? (
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-[120px_repeat(6,minmax(0,1fr))] gap-2 text-xs uppercase tracking-widest text-zinc-500">
                  <div className="p-2">Day</div>
                  {periods.map((period) => (
                    <div key={period} className="p-2">
                      Period {period}
                    </div>
                  ))}
                </div>

                {WEEK_DAYS.map((day) => (
                  <div key={day} className="mt-2 grid grid-cols-[120px_repeat(6,minmax(0,1fr))] gap-2">
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3 text-sm font-medium text-white">
                      {day}
                    </div>

                    {periods.map((period) => {
                      const slot = getSlot(day, period);

                      return (
                        <div
                          key={`${day}-${period}`}
                          className="min-h-24 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3 text-sm text-zinc-300"
                        >
                          {slot ? (
                            <div className="space-y-2">
                              <p className="font-medium text-white">
                                {slot.subject?.name || 'Subject'}
                              </p>

                              <p className="text-xs text-zinc-500">
                                {slot.class?.name || classNameById.get(slot.classId) || 'Class'} /{' '}
                                {slot.section?.name || sectionNameById.get(slot.sectionId) || '—'}
                              </p>

                              <Badge variant="info">
                                {slot.teacher?.name
                                  ? `${slot.teacher.name} (${slot.teacher.roleLabel || 'Staff'})`
                                  : 'Teacher'}
                              </Badge>

                              {slot.room ? <p className="text-xs text-zinc-500">Room {slot.room}</p> : null}

                              {canManage ? (
                                <Button size="sm" variant="secondary" onClick={() => openEdit(slot)}>
                                  Edit
                                </Button>
                              ) : null}
                            </div>
                          ) : canManage ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                openEdit({
                                  classId,
                                  sectionId,
                                  day,
                                  period,
                                  subjectId: subjects?.[0]?.id || '',
                                  teacherStaffId: teacherOptions?.[0]?.value || '',
                                  room: '',
                                })
                              }
                            >
                              Add
                            </Button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              title="No timetable entries"
              description="No entries exist for this class/section."
              actionLabel={canManage ? 'Add entry' : undefined}
              onAction={canManage ? openNew : undefined}
            />
          )}
        </Card>
      </div>

      {canManage ? (
        <RecordFormSheet
          open={open}
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
          title={editing?.id ? 'Edit timetable entry' : 'Add timetable entry'}
          description="Conflicts are prevented (class slot, teacher slot, and optional room)."
          initialValues={{
            id: editing?.id,
            classId: editing?.classId || classId,
            sectionId: editing?.sectionId || sectionId,
            day: editing?.day || WEEK_DAYS[0],
            period: String(editing?.period || 1),
            subjectId: editing?.subjectId || subjects?.[0]?.id || '',
            teacherStaffId: editing?.teacherStaffId || teacherOptions?.[0]?.value || '',
            room: editing?.room || '',
          }}
          sections={sectionsSchema}
          submitLabel="Save entry"
          onSubmit={submit}
        />
      ) : null}
    </>
  );
}