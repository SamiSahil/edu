import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-10 text-white">
      <Card className="max-w-xl space-y-5 p-8 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">404</p>
        <h1 className="font-brand text-3xl font-semibold text-white">This route is not available.</h1>
        <p className="text-sm text-zinc-400">The page may have moved or the link may be broken.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={() => navigate('/dashboard')}>Return home</Button>
          <Button variant="secondary" onClick={() => navigate(-1)}>Go back</Button>
        </div>
      </Card>
    </div>
  );
}