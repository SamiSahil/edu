import { useState } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Checkbox } from '../../components/ui/Checkbox.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';

export default function NotificationSettings() {
  const [form, setForm] = useState({ email: true, sms: true, push: false, parentUpdates: true, staffUpdates: true });
  return (
    <div className="space-y-6">
      <PageHeader title="Notification Settings" description="Control communication preferences for the local demo environment." />
      <Card className="space-y-4 p-5">
        <Checkbox label="Email notifications" checked={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.checked }))} />
        <Checkbox label="SMS notifications" checked={form.sms} onChange={(event) => setForm((current) => ({ ...current, sms: event.target.checked }))} />
        <Checkbox label="Push notifications" checked={form.push} onChange={(event) => setForm((current) => ({ ...current, push: event.target.checked }))} />
        <Checkbox label="Parent updates" checked={form.parentUpdates} onChange={(event) => setForm((current) => ({ ...current, parentUpdates: event.target.checked }))} />
        <Checkbox label="Staff updates" checked={form.staffUpdates} onChange={(event) => setForm((current) => ({ ...current, staffUpdates: event.target.checked }))} />
        <div className="flex justify-end"><Button type="button">Save notification settings</Button></div>
      </Card>
    </div>
  );
}