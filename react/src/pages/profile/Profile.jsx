import { useState } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Avatar } from '../../components/ui/Avatar.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useUI } from '../../context/UIContext.jsx';

export default function Profile() {
  const { user, updateProfile, changePassword } = useAuth();
  const { toast } = useUI();

  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);

  const saveProfile = async (event) => {
    event.preventDefault();
    try {
      const result = await updateProfile(form);
      if (result.success) toast.success('Profile updated.');
    } catch (e) {
      toast.error(e.message || 'Unable to update profile.');
    }
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    if (!passwords.next || passwords.next !== passwords.confirm) return toast.error('Passwords do not match.');

    setSavingPw(true);
    try {
      const result = await changePassword({ currentPassword: passwords.current, nextPassword: passwords.next });
      if (result.success) {
        toast.success('Password updated.');
        setPasswords({ current: '', next: '', confirm: '' });
      }
    } catch (e) {
      toast.error(e.message || 'Unable to change password.');
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Review the current session and update personal preferences." />

      <Card className="space-y-5 p-5">
        <div className="flex items-center gap-4">
          <Avatar name={user?.name} size="xl" />
          <div>
            <p className="text-2xl font-semibold text-white">{user?.name}</p>
            <p className="text-sm text-zinc-400">{user?.role}</p>
          </div>
        </div>

        <form className="grid gap-4 sm:grid-cols-2" onSubmit={saveProfile}>
          <Input label="Display name" value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} />
          <Input label="Email" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} />
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit">Save profile</Button>
          </div>
        </form>
      </Card>

      <Card className="space-y-5 p-5">
        <h2 className="text-lg font-semibold text-white">Change password</h2>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitPassword}>
          <Input label="Current password" type="password" value={passwords.current} onChange={(e) => setPasswords((c) => ({ ...c, current: e.target.value }))} />
          <Input label="New password" type="password" value={passwords.next} onChange={(e) => setPasswords((c) => ({ ...c, next: e.target.value }))} />
          <Input label="Confirm password" type="password" value={passwords.confirm} onChange={(e) => setPasswords((c) => ({ ...c, confirm: e.target.value }))} />
          <div className="flex items-end justify-end">
            <Button type="submit" loading={savingPw}>Update password</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}