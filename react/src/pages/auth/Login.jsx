import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/layout/AuthLayout.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useUI } from '../../context/UIContext.jsx';
import { getDemoCredentials } from '../../services/auth.service.js';

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const { toast } = useUI();

  const [demos, setDemos] = useState([]);

  const [form, setForm] = useState({ identity: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    getDemoCredentials().then((items) => mounted && setDemos(items || []));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const submit = async (event) => {
    event.preventDefault();

    const nextErrors = {
      identity: form.identity.trim() ? '' : 'Email or username is required.',
      password: form.password.trim() ? '' : 'Password is required.',
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setLoading(true);
    try {
      await login(form);
      toast.success('Signed in.');
      navigate('/dashboard', { replace: true });
    } catch (e) {
      toast.error(e.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome to Summit School OS"
      description="Sign in to manage admissions, academics, finance, and operations from one secure dashboard."
    >
      <Card className="space-y-5 p-6 sm:p-8">
        <form className="space-y-4" onSubmit={submit}>
          <Input
            label="Email or username"
            name="identity"
            value={form.identity}
            error={errors.identity}
            onChange={(event) => setForm((current) => ({ ...current, identity: event.target.value }))}
            placeholder="admin@school.test"
          />
          <Input
            label="Password"
            name="password"
            type="password"
            value={form.password}
            error={errors.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            placeholder="password123"
          />
          <div className="flex items-center justify-between gap-4 text-sm text-zinc-400">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-emerald-400" /> Remember me
            </label>
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-emerald-300 transition hover:text-emerald-200"
            >
              Forgot password?
            </button>
          </div>
          <Button type="submit" className="w-full" loading={loading}>
            Sign in
          </Button>
        </form>

        {demos.length ? (
          <div className="space-y-3 rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">Demo access</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {demos.map((demo) => (
                <Button
                  key={demo.userId || demo.identity}
                  variant="secondary"
                  size="sm"
                  onClick={() => setForm({ identity: demo.identity, password: demo.password })}
                >
                  {demo.role}
                </Button>
              ))}
            </div>
            <p className="text-xs text-zinc-500">This control is for local testing only.</p>
          </div>
        ) : null}
      </Card>
    </AuthLayout>
  );
}