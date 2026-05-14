import { useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Select } from '../../components/ui/Select.jsx';

import { useAuth } from '../../context/AuthContext.jsx';
import { useUI } from '../../context/UIContext.jsx';

import { getExams, calculateReportCard } from '../../services/exams.service.js';
import { getSubjects, getClassesSections } from '../../services/academics.service.js';

const MANAGE_ROLES = new Set(['Admin', 'Principal', 'Teacher']);

export default function ReportCards() {
  const { user, role } = useAuth();
  const { toast } = useUI();

  const canManage = MANAGE_ROLES.has(role);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [exams, setExamsList] = useState([]);
  const [examId, setExamId] = useState('');

  const [cards, setCards] = useState([]);

  const [subjects, setSubjectsList] = useState([]);
  const [classes, setClasses] = useState([]);

  const subjectNameById = useMemo(() => new Map(subjects.map((s) => [s.id, s.name])), [subjects]);
  const classNameById = useMemo(() => new Map(classes.map((c) => [c.id, c.name])), [classes]);

  const selectedExam = useMemo(() => exams.find((e) => e.id === examId) || null, [exams, examId]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    Promise.all([
      getExams({ page: 1, pageSize: 100, status: 'all' }),
      getSubjects(),
      getClassesSections(),
    ])
      .then(([exRes, subs, cs]) => {
        if (!mounted) return;

        let list = exRes.items || [];

        // Student/Parent should only see published/locked in this screen
        if (role === 'Student' || role === 'Parent') {
          list = list.filter((e) => e.status === 'published' || e.status === 'locked');
        }

        setExamsList(list);
        setSubjectsList(subs || []);
        setClasses(cs?.classes || []);

        if (list[0]?.id) setExamId(list[0].id);
      })
      .catch((e) => mounted && setError(e.message || 'Unable to load report cards.'))
      .finally(() => mounted && setLoading(false));

    return () => { mounted = false; };
  }, [role]);

  useEffect(() => {
    if (!examId) return;

    let mounted = true;
    setError('');

    calculateReportCard(examId)
      .then((data) => {
        if (!mounted) return;
        setCards(data || []);
      })
      .catch((e) => {
        if (!mounted) return;
        setCards([]);
        setError(e.message || 'Unable to load results for this exam.');
      });

    return () => { mounted = false; };
  }, [examId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report Cards"
        description={
          role === 'Student' || role === 'Parent'
            ? 'Published results for linked students.'
            : 'Review marks, totals, averages, and ranks for the selected exam.'
        }
      />

      {loading ? <p className="text-sm text-zinc-400">Loading...</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {!exams.length ? (
        <Card className="p-5">
          <EmptyState title="No report cards available" description="There are no published exams available for your current scope." />
        </Card>
      ) : (
        <Select label="Exam" value={examId} onChange={(event) => setExamId(event.target.value)}>
          {exams.map((exam) => (
            <option key={exam.id} value={exam.id}>
              {exam.name} ({exam.status})
            </option>
          ))}
        </Select>
      )}

      {selectedExam && !cards.length ? (
        <Card className="p-5">
          <EmptyState
            title="No results for this exam"
            description="Marks have not been entered yet or there are no linked students in this class."
          />
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {cards.map((card) => (
          <Card key={card.studentId} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-white">{card.student?.fullName || 'Student'}</p>
                <p className="text-sm text-zinc-400">
                  {classNameById.get(card.student?.classId) || card.student?.classId || '—'}
                </p>
              </div>
              {canManage ? <Badge variant="info">Rank {card.rank}</Badge> : <Badge variant="info">{card.grade}</Badge>}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(card.results || []).map((result) => (
                <div key={result.id || `${card.studentId}-${result.subjectId}`} className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
                  <p className="text-xs uppercase tracking-widest text-zinc-500">
                    {subjectNameById.get(result.subjectId) || result.subjectId}
                  </p>
                  <p className="mt-2 text-white">{result.marks}</p>
                  <p className="text-sm text-zinc-400">{result.grade || ''}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-300">
              <span>Total {card.total}</span>
              <span>Average {card.average}</span>
              <span>{card.remarks}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}