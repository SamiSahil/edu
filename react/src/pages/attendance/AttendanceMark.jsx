import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { useUI } from '../../context/UIContext.jsx';

import { getClassesSections } from '../../services/academics.service.js';
import { getStudents } from '../../services/students.service.js';
import { getAttendanceForDateSection, markAttendanceBatch } from '../../services/attendance.service.js';

const statuses = ['present', 'absent', 'late', 'half_day', 'excused'];

async function fetchAllStudentsForSection({ classId, sectionId }) {
  // Pull up to 500 for marking (adjust if needed)
  const res = await getStudents({
    page: 1,
    pageSize: 500,
    status: 'all',
    classId,
    sectionId,
  });
  return res.items || [];
}

export default function AttendanceMark() {
  const { toast } = useUI();

  const [lookupsLoading, setLookupsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);

  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]); // {studentId,status,note}

  const classNameById = useMemo(() => new Map(classes.map((c) => [c.id, c.name])), [classes]);

  useEffect(() => {
    let mounted = true;
    setLookupsLoading(true);
    setError('');

    getClassesSections()
      .then((data) => {
        if (!mounted) return;
        const cls = data?.classes || [];
        const sec = data?.sections || [];
        setClasses(cls);
        setSections(sec);

        // default class/section
        const firstClass = cls[0];
        const firstSection = firstClass ? sec.find((s) => s.classId === firstClass.id) : sec[0];

        if (firstClass?.id) setClassId(firstClass.id);
        if (firstSection?.id) setSectionId(firstSection.id);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e.message || 'Unable to load classes/sections.');
      })
      .finally(() => mounted && setLookupsLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  const visibleSections = useMemo(() => {
    if (!classId) return [];
    return sections.filter((s) => s.classId === classId);
  }, [sections, classId]);

  // When class changes, ensure section belongs to class
  useEffect(() => {
    if (!classId) return;
    if (!sectionId) {
      const first = visibleSections[0];
      if (first) setSectionId(first.id);
      return;
    }
    const ok = visibleSections.some((s) => s.id === sectionId);
    if (!ok) {
      const first = visibleSections[0];
      if (first) setSectionId(first.id);
    }
  }, [classId, sectionId, visibleSections]);

  // Load students for selected class/section
  useEffect(() => {
    if (!classId || !sectionId) return;

    let mounted = true;
    setError('');

    fetchAllStudentsForSection({ classId, sectionId })
      .then((items) => {
        if (!mounted) return;
        setStudents(items.filter((s) => s.status !== 'archived'));
      })
      .catch((e) => mounted && setError(e.message || 'Unable to load students for section.'));

    return () => {
      mounted = false;
    };
  }, [classId, sectionId]);

  // Load existing attendance, or create default present list
  useEffect(() => {
    if (!sectionId || !date) return;

    let mounted = true;
    setError('');

    getAttendanceForDateSection(date, sectionId)
      .then((existing) => {
        if (!mounted) return;

        if (existing?.length) {
          setRecords(
            existing.map((item) => ({
              studentId: item.studentId,
              status: item.status,
              note: item.note || '',
            }))
          );
        } else {
          // default: everyone present
          setRecords(students.map((s) => ({ studentId: s.id, status: 'present', note: '' })));
        }
      })
      .catch((e) => mounted && setError(e.message || 'Unable to load attendance records.'));

    return () => {
      mounted = false;
    };
  }, [date, sectionId, students]);

  const updateStatus = (studentId, status) => {
    setRecords((current) =>
      current.map((item) => (item.studentId === studentId ? { ...item, status } : item))
    );
  };

  const bulkMark = (status) => setRecords((current) => current.map((item) => ({ ...item, status })));

  const save = async () => {
    if (!classId || !sectionId) return;

    setSaving(true);
    const payload = records.map((item) => ({
      ...item,
      classId,
      sectionId,
      date,
    }));

    const result = await markAttendanceBatch(payload);
    setSaving(false);

    if (result.success) toast.success('Attendance saved.');
    else toast.error(result.message || 'Unable to save attendance.');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Marking"
        description="Select a class, section, and date. Existing records are updated in place to avoid duplicates."
        actions={
          <Button onClick={save} loading={saving} disabled={saving || lookupsLoading}>
            Save attendance
          </Button>
        }
      />

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
        <Select
          label="Class"
          value={classId}
          onChange={(event) => {
            const nextClass = event.target.value;
            setClassId(nextClass);
            const firstSection = sections.find((s) => s.classId === nextClass);
            setSectionId(firstSection?.id || '');
          }}
        >
          {classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>

        <Select label="Section" value={sectionId} onChange={(event) => setSectionId(event.target.value)}>
          {visibleSections.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>

        <Input label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </div>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          {statuses.map((status) => (
            <Button
              key={status}
              variant="secondary"
              size="sm"
              onClick={() => bulkMark(status)}
              disabled={!students.length}
            >
              {status.replace('_', ' ')}
            </Button>
          ))}
        </div>

        <div className="space-y-3">
          {students.map((student) => {
            const entry = records.find((item) => item.studentId === student.id) || { status: 'present' };

            return (
              <div key={student.id} className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-white">{student.fullName}</p>
                    <p className="text-sm text-zinc-500">
                      {classNameById.get(student.classId) || 'Class'} / {student.section?.name || 'Section'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {statuses.map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => updateStatus(student.id, status)}
                        className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
                          entry.status === status
                            ? 'border-emerald-400 bg-emerald-400/10 text-emerald-300'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                        }`}
                      >
                        {status.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!students.length && !lookupsLoading ? (
          <p className="mt-4 text-sm text-zinc-500">No students found for the selected section.</p>
        ) : null}
      </Card>
    </div>
  );
}