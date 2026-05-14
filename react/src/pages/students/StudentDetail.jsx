import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext.jsx';
import { useUI } from '../../context/UIContext.jsx';

import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { DetailPageTemplate } from '../../components/layout/DetailPageTemplate.jsx';
import AccessDenied from '../errors/AccessDenied.jsx';

import StudentForm from './StudentForm.jsx';

import { getStudentById, archiveStudent, promoteStudent, transferStudent } from '../../services/students.service.js';
import { getInvoices } from '../../services/fees.service.js';
import { getAttendanceMonthReport } from '../../services/attendance.service.js';

import { formatDate, formatCurrency, formatMonth } from '../../lib/utils.js';

const MANAGE_ROLES = new Set(['Admin', 'Principal', 'Teacher']);

function pickLinks(student) {
  const links = Array.isArray(student?.links) ? student.links : [];
  const parentLinks = links.filter((l) => l.role === 'Parent');
  const studentLinks = links.filter((l) => l.role === 'Student');
  return { links, parentLinks, studentLinks };
}

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, selectedMonth } = useUI();
  const { user, role } = useAuth();

  const canManage = MANAGE_ROLES.has(role);
  const linked = user?.linkedStudentIds || [];

  if ((role === 'Student' || role === 'Parent') && !linked.includes(id)) {
    return <AccessDenied />;
  }

  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [confirm, setConfirm] = useState(null);

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [error, setError] = useState('');

  const [invoiceStats, setInvoiceStats] = useState({ count: 0, due: 0 });
  const [attendanceRate, setAttendanceRate] = useState(null);

  const load = () => {
    setLoading(true);
    setError('');
    getStudentById(id)
      .then((data) => setStudent(data))
      .catch((e) => setError(e.message || 'Student not found.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!student) return;

    getInvoices({ page: 1, pageSize: 200, status: 'all' })
      .then((res) => {
        const items = res.items || [];
        const mine = items.filter((inv) => inv.studentId === student.id);
        const due = mine.reduce((sum, inv) => sum + Number(inv.balance || 0), 0);
        setInvoiceStats({ count: mine.length, due });
      })
      .catch(() => {});

    getAttendanceMonthReport(selectedMonth)
      .then((report) => {
        const records = (report.records || []).filter((r) => r.studentId === student.id);
        if (!records.length) return setAttendanceRate(0);
        const presentLike = records.filter((r) => r.status === 'present' || r.status === 'late').length;
        setAttendanceRate(Math.round((presentLike / records.length) * 100));
      })
      .catch(() => {});
  }, [student, selectedMonth]);

  const { links, parentLinks, studentLinks } = useMemo(() => pickLinks(student), [student]);

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <p className="text-zinc-400">Loading student...</p>
      </Card>
    );
  }

  if (error || !student) {
    return (
      <Card className="p-8 text-center">
        <p className="text-zinc-400">{error || 'Student record not found.'}</p>
        <Button className="mt-4" onClick={() => navigate('/students')}>Back to students</Button>
      </Card>
    );
  }

  const timeline = [
    {
      id: 'created',
      title: 'Profile created',
      description: `Admission ${student.admissionNo}`,
      createdAt: student.createdAt || student.admissionDate,
    },
  ];

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'accounts', label: 'Accounts' },
    { key: 'academic', label: 'Academic History' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'fees', label: 'Fees' },
    { key: 'documents', label: 'Documents' },
  ];

  const accountsTab = (
    <Card className="p-5 space-y-4">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Parent accounts</p>
        {parentLinks.length ? (
          <div className="mt-3 space-y-2">
            {parentLinks.map((l) => (
              <div key={l.id} className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                <p className="text-sm text-white">{l.user?.email || '—'}</p>
                <p className="text-xs text-zinc-400">@{l.user?.username || '—'}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-400">No parent login linked.</p>
        )}
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Student accounts</p>
        {studentLinks.length ? (
          <div className="mt-3 space-y-2">
            {studentLinks.map((l) => (
              <div key={l.id} className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                <p className="text-sm text-white">{l.user?.email || '—'}</p>
                <p className="text-xs text-zinc-400">@{l.user?.username || '—'}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-400">No student login linked.</p>
        )}
      </div>

      {canManage ? (
        <p className="text-xs text-zinc-500">
          To create accounts, use “Edit” and re-create via the student create form (or we can add an Admin “Create/Reset login” action next).
        </p>
      ) : null}
    </Card>
  );

  const tabContent = {
    overview: (
      <Card className="p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Guardian</p>
            <p className="mt-2 text-white">{student.guardian?.name || '—'}</p>
            <p className="mt-1 text-sm text-zinc-400">{student.guardian?.phone || student.phone}</p>
            {student.guardian?.email ? <p className="mt-1 text-sm text-zinc-400">{student.guardian.email}</p> : null}
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Class</p>
            <p className="mt-2 text-white">{student.class?.name || '—'} / {student.section?.name || '—'}</p>
            <p className="mt-1 text-sm text-zinc-400">Admission year {student.admissionYear}</p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Birth date</p>
            <p className="mt-2 text-white">{formatDate(student.dob)}</p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Admission date</p>
            <p className="mt-2 text-white">{formatDate(student.admissionDate)}</p>
          </div>
        </div>

        {/* ✅ Quick account preview on overview */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
          <p className="text-xs uppercase tracking-widest text-zinc-500">Parent login (preview)</p>
          {parentLinks.length ? (
            <div className="mt-2">
              <p className="text-sm text-white">{parentLinks[0].user?.email}</p>
              <p className="text-xs text-zinc-400">@{parentLinks[0].user?.username}</p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-400">No parent login linked.</p>
          )}
        </div>
      </Card>
    ),
    accounts: accountsTab,
    academic: (
      <Card className="p-5">
        <p className="text-sm text-zinc-400">Academic movement and marks are available in Exams module.</p>
      </Card>
    ),
    attendance: (
      <Card className="p-5">
        <p className="text-sm text-zinc-400">
          Attendance rate for {formatMonth(selectedMonth)} is {attendanceRate ?? '—'}%.
        </p>
      </Card>
    ),
    fees: (
      <Card className="p-5">
        <p className="text-sm text-zinc-400">
          Outstanding dues: {formatCurrency(invoiceStats.due)} across {invoiceStats.count} invoice(s).
        </p>
      </Card>
    ),
    documents: (
      <Card className="p-5">
        <p className="text-sm text-zinc-400">Document references: {student.documents || 'No documents captured.'}</p>
      </Card>
    ),
  }[activeTab];

  const handleAction = async (type) => {
    if (!canManage) return toast.error('You do not have permission to perform this action.');

    let result;
    if (type === 'archive') result = await archiveStudent(student.id);
    if (type === 'promote') result = await promoteStudent(student.id);
    if (type === 'transfer') result = await transferStudent(student.id, 'Transferred from detail view');

    if (result?.success) toast.success(`${student.fullName} updated.`);
    else toast.error(result?.message || 'Action failed.');

    setConfirm(null);
    if (type === 'archive') navigate('/students');
    else load();
  };

  return (
    <>
      <DetailPageTemplate
        title={student.fullName}
        description={`Admission ${student.admissionNo} · ${student.class?.name || '—'} / ${student.section?.name || '—'} · ${role}`}
        avatarName={student.fullName}
        status={student.status}
        subTitle={`Guardian: ${student.guardian?.name || '—'} · Added ${formatDate(student.createdAt || student.admissionDate)}`}
        stats={[
          { label: 'Attendance', value: attendanceRate == null ? '—' : `${attendanceRate}%`, note: formatMonth(selectedMonth) },
          { label: 'Invoices', value: invoiceStats.count, note: 'fee records' },
          { label: 'Dues', value: formatCurrency(invoiceStats.due), note: 'outstanding balance' },
          { label: 'Parent login', value: parentLinks.length ? 'Yes' : 'No', note: 'account linked' },
        ]}
        actions={
          canManage ? (
            <>
              <Button variant="secondary" onClick={() => setSearchParams({ edit: '1' })}>Edit</Button>
              <Button variant="secondary" onClick={() => setConfirm({ type: 'promote' })}>Promote</Button>
              <Button variant="secondary" onClick={() => setConfirm({ type: 'transfer' })}>Transfer</Button>
              <Button variant="danger" onClick={() => setConfirm({ type: 'archive' })}>Archive</Button>
            </>
          ) : null
        }
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabContent={tabContent}
        timeline={timeline}
      />

      <StudentForm
        open={canManage && searchParams.get('edit') === '1'}
        studentId={student.id}
        onClose={() => setSearchParams({})}
        onSaved={() => {
          setSearchParams({});
          load();
        }}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={`Confirm ${confirm?.type || 'action'}`}
        description={`Apply ${confirm?.type} to ${student.fullName}.`}
        confirmLabel="Continue"
        onConfirm={() => handleAction(confirm?.type)}
      />
    </>
  );
}