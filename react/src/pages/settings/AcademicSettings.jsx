import { useState } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';

export default function AcademicSettings() {
  const [form, setForm] = useState({ gradingScale: 'A-F', termCount: 3, academicYear: new Date().getFullYear() });
  return (
    <div className="space-y-6">
      <PageHeader title="Academic Settings" description="Configure terms, grading defaults, and school year preferences." />
      <Card className="p-5">
        <form className="grid gap-4 sm:grid-cols-2">
          <Input label="Grading scale" value={form.gradingScale} onChange={(event) => setForm((current) => ({ ...current, gradingScale: event.target.value }))} />
          <Input label="Terms" type="number" value={form.termCount} onChange={(event) => setForm((current) => ({ ...current, termCount: Number(event.target.value) }))} />
          <Input label="Academic year" type="number" value={form.academicYear} onChange={(event) => setForm((current) => ({ ...current, academicYear: Number(event.target.value) }))} />
          <div className="flex items-end justify-end"><Button type="button">Save academic settings</Button></div>
        </form>
      </Card>
    </div>
  );
}