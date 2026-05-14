import { useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { useUI } from '../../context/UIContext.jsx';
import { getRoutes, getVehicles } from '../../services/transport.service.js';

export default function Vehicles() {
  const { toast } = useUI();
  const [loading, setLoading] = useState(true);

  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.all([getVehicles(), getRoutes()])
      .then(([v, r]) => {
        if (!mounted) return;
        setVehicles(v || []);
        setRoutes(r || []);
      })
      .catch((e) => toast.error(e.message || 'Unable to load vehicles.'))
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [toast]);

  const routeNameById = useMemo(() => new Map(routes.map((r) => [r.id, r.name])), [routes]);

  return (
    <div className="space-y-6">
      <PageHeader title="Vehicles" description="Track fleet capacity, occupancy, health, and route assignments." />
      {loading ? <p className="text-sm text-zinc-400">Loading...</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {vehicles.map((vehicle) => (
          <Card key={vehicle.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-white">{vehicle.name}</p>
                <p className="text-sm text-zinc-400">{vehicle.plateNo} · {vehicle.driverName || '—'}</p>
              </div>
              <Badge variant={vehicle.status}>{vehicle.status}</Badge>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-zinc-300">
              <div>
                <p className="text-xs uppercase tracking-widest text-zinc-500">Capacity</p>
                <p className="mt-1">{vehicle.capacity}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-zinc-500">Occupancy</p>
                <p className="mt-1">{vehicle.occupancy ?? 0}/{vehicle.capacity}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-zinc-500">Route</p>
                <p className="mt-1">{vehicle.routeId ? (routeNameById.get(vehicle.routeId) || vehicle.routeId) : '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-zinc-500">Health</p>
                <p className="mt-1">{vehicle.health || '—'}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}