import { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { useUI } from '../../context/UIContext.jsx';
import { getReports, exportReportLabel } from '../../services/reports.service.js';
import { getClassesSections } from '../../services/academics.service.js';
import { formatCurrency, formatMonth } from '../../lib/utils.js';

export default function ReportsDashboard() {
  const { selectedMonth, setSelectedMonth, toast } = useUI();
  
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  
  const [filters, setFilters] = useState({ 
    month: selectedMonth, 
    classId: '', 
    sectionId: '', 
    role: '', 
    category: '' 
  });

  // Load Lookups (Classes/Sections)
  useEffect(() => {
    getClassesSections().then(data => {
      setClasses(data.classes || []);
      setSections(data.sections || []);
    }).catch(() => toast.error("Failed to load filter options"));
  }, []);

  // Fetch Report Data
  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await getReports(filters);
      setReport(data);
    } catch (err) {
      toast.error(err.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [filters]);

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    if (key === 'month') setSelectedMonth(value);
  };

  const summary = report?.summary || {
    attendanceRate: 0,
    feeDue: 0,
    paymentCount: 0,
    feeCollected: 0
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Reports Dashboard" 
        description="Filter by month, class, section, and role to summarize school performance." 
        actions={<Button onClick={() => window.print()}>Export PDF</Button>} 
      />

      {/* Filters */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Select label="Month" value={filters.month} onChange={(e) => updateFilter('month', e.target.value)}>
          {Array.from({ length: 12 }, (_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const val = d.toISOString().slice(0, 7);
            return <option key={val} value={val}>{formatMonth(val)}</option>;
          })}
        </Select>

        <Select label="Class" value={filters.classId} onChange={(e) => updateFilter('classId', e.target.value)}>
          <option value="">All classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>

        <Select label="Section" value={filters.sectionId} onChange={(e) => updateFilter('sectionId', e.target.value)}>
          <option value="">All sections</option>
          {sections.filter(s => !filters.classId || s.classId === filters.classId).map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>

        <Select label="Role" value={filters.role} onChange={(e) => updateFilter('role', e.target.value)}>
          <option value="">All staff roles</option>
          {['Teacher', 'Accountant', 'Librarian'].map(r => <option key={r} value={r}>{r}</option>)}
        </Select>

        <Select label="Category" value={filters.category} onChange={(e) => updateFilter('category', e.target.value)}>
          <option value="">All categories</option>
          <option value="attendance">Attendance</option>
          <option value="fees">Fees</option>
          <option value="students">Students</option>
          <option value="staff">Staff</option>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
        ) : (
          <>
            <Card className="p-5">
              <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">Attendance rate</p>
              <p className="mt-2 text-3xl font-semibold text-white">{summary.attendanceRate}%</p>
            </Card>
            <Card className="p-5">
              <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">Fee due</p>
              <p className="mt-2 text-3xl font-semibold text-white">{formatCurrency(summary.feeDue)}</p>
            </Card>
            <Card className="p-5">
              <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">Payments</p>
              <p className="mt-2 text-3xl font-semibold text-white">{summary.paymentCount}</p>
            </Card>
            <Card className="p-5">
              <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">Collections</p>
              <p className="mt-2 text-3xl font-semibold text-white">{formatCurrency(summary.feeCollected)}</p>
            </Card>
          </>
        )}
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">{exportReportLabel(filters)}</Badge>
          <span className="text-sm text-zinc-400">Summary for {formatMonth(filters.month)}.</span>
        </div>
      </Card>

      {!loading && report && (
        <Card className="p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-center">
            <div>
              <p className="text-zinc-500 text-xs uppercase">Students</p>
              <p className="text-xl font-bold">{summary.studentCount}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs uppercase">Staff</p>
              <p className="text-xl font-bold">{summary.staffCount}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs uppercase">Invoices</p>
              <p className="text-xl font-bold">{summary.invoiceCount}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs uppercase">Exams</p>
              <p className="text-xl font-bold">{summary.examCount}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}