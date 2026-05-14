import { useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { useUI } from '../../context/UIContext.jsx';

import { getExams, saveMarksBatch, calculateReportCard } from '../../services/exams.service.js';
import { getStudents } from '../../services/students.service.js';
import { getSubjects } from '../../services/academics.service.js';

export default function Grades() {
  const { toast } = useUI();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState('');
  const selectedExam = useMemo(() => exams.find((e) => e.id === examId) || null, [exams, examId]);

  const [subjects, setSubjectsList] = useState([]);
  const subjectNameById = useMemo(() => new Map(subjects.map((s) => [s.id, s.name])), [subjects]);

  const [students, setStudentsList] = useState([]);

  // draft marks keyed by studentId-subjectId
  const [draft, setDraft] = useState({});

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    Promise.all([getExams({ page: 1, pageSize: 100, status: 'all' }), getSubjects()])
      .then(([exRes, subs]) => {
        if (!mounted) return;
        const list = exRes.items || [];
        setExams(list);
        setSubjectsList(subs || []);
        if (list[0]?.id) setExamId(list[0].id);
      })
      .catch((e) => mounted && setError(e.message || 'Unable to load exams.'))
      .finally(() => mounted && setLoading(false));

    return () => { mounted = false; };
  }, []);

  // Load students + existing marks when exam changes
  useEffect(() => {
    if (!selectedExam?.id) return;

    let mounted = true;
    setError('');

    Promise.all([
      getStudents({ page: 1, pageSize: 500, status: 'all', classId: selectedExam.classId }),
      calculateReportCard(selectedExam.id), // includes results array for existing marks
    ])
      .then(([stuRes, cards]) => {
        if (!mounted) return;

        const stu = (stuRes.items || []).filter((s) => s.status !== 'archived');
        setStudentsList(stu);

        // prefill draft from existing marks
        const nextDraft = {};
        (cards || []).forEach((card) => {
          (card.results || []).forEach((r) => {
            const key = `${card.studentId}-${r.subjectId}`;
            nextDraft[key] = {
              examId: selectedExam.id,
              studentId: card.studentId,
              subjectId: r.subjectId,
              marks: Number(r.marks || 0),
              grade: r.grade || '',
              remarks: r.remarks || '',
            };
          });
        });
        setDraft(nextDraft);
      })
      .catch((e) => mounted && setError(e.message || 'Unable to load exam data.'));

    return () => { mounted = false; };
  }, [selectedExam?.id]);

  const save = async () => {
    const entries = Object.values(draft).filter((e) => e && e.examId && e.studentId && e.subjectId);
    if (!entries.length) return toast.warning('No marks to save.');

    setSaving(true);
    const result = await saveMarksBatch(entries);
    setSaving(false);

    if (result.success) toast.success('Marks saved.');
    else toast.error(result.message || 'Unable to save marks.');
  };

  if (loading) return <Card className="p-8 text-center"><p className="text-zinc-400">Loading...</p></Card>;
  if (error) return <Card className="p-8 text-center"><p className="text-rose-300">{error}</p></Card>;
  if (!selectedExam) return <Card className="p-8 text-center"><p className="text-zinc-400">No exams available.</p></Card>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grades"
        description="Enter subject marks, then publish results when ready."
        actions={<Button onClick={save} loading={saving} disabled={saving}>Save marks</Button>}
      />

      <Select label="Exam" value={examId} onChange={(event) => setExamId(event.target.value)}>
        {exams.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} ({item.status})
          </option>
        ))}
      </Select>

      <Card className="p-5">
        <p className="mb-4 text-sm text-zinc-400">
          {selectedExam.name} · {selectedExam.class?.name || selectedExam.classId}
        </p>

        <div className="space-y-3">
          {students.map((student) => (
            <div key={student.id} className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="font-medium text-white">{student.fullName}</p>
                <Badge variant="neutral">{student.admissionNo}</Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {(selectedExam.subjectIds || []).map((subjectId) => {
                  const key = `${student.id}-${subjectId}`;
                  const current = draft[key]?.marks ?? '';

                  return (
                    <label key={key} className="block space-y-2 text-sm text-zinc-200">
                      <span className="font-medium text-zinc-200">
                        {subjectNameById.get(subjectId) || subjectId}
                      </span>
                      <input
                        type="number"
                        value={current}
                        onChange={(event) => {
                          const val = event.target.value;
                          setDraft((cur) => ({
                            ...cur,
                            [key]: {
                              examId: selectedExam.id,
                              studentId: student.id,
                              subjectId,
                              marks: val === '' ? 0 : Number(val),
                              grade: '',
                              remarks: '',
                            },
                          }));
                        }}
                        className="h-11 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 text-sm text-white outline-none"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {!students.length ? <p className="mt-4 text-sm text-zinc-500">No students found for this class.</p> : null}
      </Card>
    </div>
  );
}