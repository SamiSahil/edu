import { Card } from '../ui/Card.jsx';

export function AuthLayout({ children, title, description }) {
  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-900/70 shadow-2xl shadow-black/50 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative flex flex-col justify-between overflow-hidden border-b border-zinc-800 bg-[radial-gradient(circle_at_top_left,_rgba(52,211,153,0.16),_transparent_45%),linear-gradient(160deg,rgba(9,9,11,0.96),rgba(24,24,27,0.9))] p-8 lg:border-b-0 lg:border-r lg:p-12">
          <div className="space-y-4">
            <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">School Management System</p>
            <h1 className="font-brand max-w-md text-4xl font-semibold leading-tight text-white sm:text-5xl">{title}</h1>
            <p className="max-w-lg text-sm leading-6 text-zinc-400 sm:text-base">{description}</p>
          </div>
          <div className="mt-12 grid gap-4 text-sm text-zinc-300 sm:grid-cols-2">
            <Card className="bg-zinc-950/60 p-5">
              <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">Realtime</p>
              <p className="mt-2 text-white">Local persistence with role-aware access and responsive workflows.</p>
            </Card>
            <Card className="bg-zinc-950/60 p-5">
              <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">Premium</p>
              <p className="mt-2 text-white">Dark glass surfaces, refined motion, and production-ready layout foundations.</p>
            </Card>
          </div>
        </div>
        <div className="flex items-center justify-center p-4 sm:p-6 lg:p-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}