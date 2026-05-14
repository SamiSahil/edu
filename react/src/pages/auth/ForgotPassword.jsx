import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/layout/AuthLayout.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { forgotPasswordRequest } from '../../services/auth.service.js';
import { useUI } from '../../context/UIContext.jsx';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { toast } = useUI();
  const [form, setForm] = useState({ identity: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    const result = await forgotPasswordRequest(form);
    setLoading(false);

    if (!result.success) {
      setMessage(result.message);
      toast.error(result.message);
      return;
    }
    setMessage(result.message);
    toast.success(result.message);
  };

  return (
    <AuthLayout
      title="Reset access"
      description="Request a password reset for your account. Email delivery depends on SendGrid configuration."
    >
      <Card className="space-y-5 p-6 sm:p-8">
        <form className="space-y-4" onSubmit={submit}>
          <Input
            label="Email or username"
            name="identity"
            value={form.identity}
            onChange={(event) => setForm({ identity: event.target.value })}
            placeholder="admin@school.test"
          />
          <Button type="submit" className="w-full" loading={loading}>
            Send request
          </Button>
        </form>

        {message ? (
          <p className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-sm text-zinc-300">
            {message}
          </p>
        ) : null}

        <Button variant="secondary" className="w-full" onClick={() => navigate('/login')}>
          Back to sign in
        </Button>
      </Card>
    </AuthLayout>
  );
}