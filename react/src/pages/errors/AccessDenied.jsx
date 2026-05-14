import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/layout/AuthLayout.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AccessDenied() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-10 text-white">
      <Card className="max-w-xl space-y-5 p-8 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">Access denied</p>
        <h1 className="font-brand text-3xl font-semibold text-white">You do not have permission to view this page.</h1>
        <p className="text-sm text-zinc-400">Your current role cannot access this section. Return to a safe area or sign in with another account.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={() => navigate('/dashboard')}>Go to dashboard</Button>
          <Button variant="secondary" onClick={() => navigate(isAuthenticated ? '/profile' : '/login')}>{isAuthenticated ? 'Open profile' : 'Sign in'}</Button>
        </div>
      </Card>
    </div>
  );
}