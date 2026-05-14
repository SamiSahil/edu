import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Textarea } from '../../components/ui/Textarea.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { useUI } from '../../context/UIContext.jsx';
import { getSchoolSettings, updateSchoolSettings } from '../../services/settings.service.js';

export default function SchoolSettings() {
  const { toast } = useUI();

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    motto: '',
    address: '',
    logoUrl: '',
  });

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    getSchoolSettings()
      .then((school) => {
        if (!mounted) return;
        setForm({
          name: school?.name || '',
          phone: school?.phone || '',
          email: school?.email || '',
          motto: school?.motto || '',
          address: school?.address || '',
          logoUrl: school?.logoUrl || '',
        });
      })
      .catch((e) => toast.error(e.message || 'Unable to load school settings.'))
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [toast]);

  const save = async (event) => {
    event.preventDefault();
    const result = await updateSchoolSettings(form);

    if (result.success) toast.success('School settings saved.');
    else toast.error(result.message || 'Unable to save settings.');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="School Settings" description="Update the school identity, contact data, and core profile information." />
      <Card className="p-5">
        {loading ? (
          <p className="text-sm text-zinc-400">Loading...</p>
        ) : (
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={save}>
            <Input label="School name" value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))} />
            <Input label="Email" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} />
            <Input label="Motto" value={form.motto} onChange={(e) => setForm((c) => ({ ...c, motto: e.target.value }))} />
            <Input label="Logo URL" value={form.logoUrl} onChange={(e) => setForm((c) => ({ ...c, logoUrl: e.target.value }))} />
            <Textarea className="sm:col-span-2" label="Address" value={form.address} onChange={(e) => setForm((c) => ({ ...c, address: e.target.value }))} />
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit">Save settings</Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}