import { Card, CardBody } from './Card.jsx';
import { Badge } from './Badge.jsx';
import { cn } from '../../lib/utils.js';

export function StatCard({ label, value, note, trend, variant = 'neutral', className }) {
  return (
    <Card className={cn('p-5', className)}>
      <CardBody className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
          </div>
          {trend ? <Badge variant={trend > 0 ? 'success' : trend < 0 ? 'danger' : 'neutral'}>{trend > 0 ? `+${trend}%` : `${trend}%`}</Badge> : null}
        </div>
        {note ? <p className="text-sm text-zinc-400">{note}</p> : null}
        {variant !== 'neutral' ? <div className="h-1.5 w-full rounded-full bg-zinc-800"><div className={cn('h-full w-full rounded-full', variant === 'success' ? 'bg-emerald-400' : variant === 'warning' ? 'bg-amber-400' : variant === 'danger' ? 'bg-rose-400' : 'bg-sky-400')} /></div> : null}
      </CardBody>
    </Card>
  );
}