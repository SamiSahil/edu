import { useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Table } from '../../components/ui/Table.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { DropdownMenu } from '../../components/ui/DropdownMenu.jsx';
import { RecordFormSheet } from '../../components/layout/RecordFormSheet.jsx';

import { useUI } from '../../context/UIContext.jsx';
import { getStudents } from '../../services/students.service.js';
import {
  archiveTransportAssignment,
  getAssignments,
  getRoutes,
  getVehicles,
  saveTransportAssignment,
  setTransportAssignmentActive,
} from '../../services/transport.service.js';

function occupancyForVehicle(assignments, vehicleId) {
  return (assignments || []).filter((a) => a.vehicleId === vehicleId && a.active !== false && a.isArchived !== true).length;
}

export default function TransportRoutes() {
  const { toast } = useUI();

  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [assignments, setAssignmentsList] = useState([]);
  const [students, setStudentsList] = useState([]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  // Tracks route selection inside form to build stop options
  const [draftRouteId, setDraftRouteId] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [r, v, a, s] = await Promise.all([
        getRoutes(),
        getVehicles(),
        getAssignments(),
        getStudents({ page: 1, pageSize: 700, status: 'all' }), // slightly > 600 in K12 seed
      ]);

      setRoutes(r || []);
      setVehicles(v || []);
      setAssignmentsList((a || []).filter((x) => x.isArchived !== true));
      setStudentsList((s?.items || []).filter((x) => x.status !== 'archived'));
    } catch (e) {
      toast.error(e.message || 'Unable to load transport data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const routeCards = useMemo(() => {
    return (routes || []).map((route) => {
      const vehicleId = route.assignedVehicleId || vehicles.find((v) => v.routeId === route.id)?.id || null;
      const occ = vehicleId ? occupancyForVehicle(assignments, vehicleId) : 0;
      const capacity = vehicleId ? Number(vehicles.find((v) => v.id === vehicleId)?.capacity || 0) : 0;
      return { route, vehicleId, occ, capacity };
    });
  }, [routes, vehicles, assignments]);

  const assignmentRows = useMemo(() => {
    return (assignments || []).slice().sort((a, b) => String(a.routeId).localeCompare(String(b.routeId)));
  }, [assignments]);

  // ✅ FIX: Prefer server-provided relation data first
  const studentLabel = (row) =>
    row?.student?.fullName ||
    students.find((s) => s.id === row.studentId)?.fullName ||
    row.studentId;

  const routeLabel = (id) => routes.find((r) => r.id === id)?.name || id;

  const vehicleLabel = (id) => {
    const v = vehicles.find((x) => x.id === id);
    return v ? `${v.name} (${v.plateNo})` : id;
  };

  // Prevent selecting students who already have an ACTIVE assignment (unless editing)
  const activeAssignedStudentIds = useMemo(() => {
    const set = new Set(
      (assignments || [])
        .filter((a) => a.isArchived !== true && a.active !== false)
        .map((a) => a.studentId)
    );
    if (editing?.studentId) set.delete(editing.studentId);
    return set;
  }, [assignments, editing]);

  const selectableStudents = useMemo(() => {
    return (students || []).filter((s) => !activeAssignedStudentIds.has(s.id));
  }, [students, activeAssignedStudentIds]);

  // Stops for current form route
  const currentRouteStops = useMemo(() => {
    const r = routes.find((x) => x.id === draftRouteId);
    return Array.isArray(r?.stops) ? r.stops : [];
  }, [routes, draftRouteId]);

  const stopOptions = useMemo(() => currentRouteStops.map((s) => ({ value: s, label: s })), [currentRouteStops]);

  const columns = [
    {
      key: 'studentId',
      label: 'Student',
      render: (row) => studentLabel(row), // ✅ FIXED
    },
    { key: 'routeId', label: 'Route', render: (row) => row.route?.name || routeLabel(row.routeId) },
    { key: 'vehicleId', label: 'Vehicle', render: (row) => row.vehicle ? `${row.vehicle.name} (${row.vehicle.plateNo})` : vehicleLabel(row.vehicleId) },
    { key: 'pickupStop', label: 'Pickup stop', render: (row) => row.pickupStop || '—' },
    { key: 'dropStop', label: 'Drop stop', render: (row) => row.dropStop || '—' },
    {
      key: 'active',
      label: 'Active',
      render: (row) => (
        <Badge variant={row.active !== false ? 'success' : 'neutral'}>
          {row.active !== false ? 'active' : 'inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <DropdownMenu
          trigger="Actions"
          items={[
            {
              label: 'Edit',
              onClick: () => {
                setEditing(row);
                setDraftRouteId(row.routeId);
                setOpen(true);
              },
            },
            { label: row.active !== false ? 'Deactivate' : 'Activate', onClick: () => setConfirm({ type: 'toggle', assignment: row }) },
            { label: 'Archive', danger: true, onClick: () => setConfirm({ type: 'archive', assignment: row }) },
          ]}
        />
      ),
    },
  ];

  const openNew = () => {
    setEditing(null);
    setDraftRouteId(routes[0]?.id || '');
    setOpen(true);
  };

  const initialValues = useMemo(() => {
    if (editing) {
      const route = routes.find((r) => r.id === editing.routeId);
      const stops = Array.isArray(route?.stops) ? route.stops : [];

      return {
        id: editing.id,
        studentId: editing.studentId,
        routeId: editing.routeId,
        vehicleId: editing.vehicleId,
        pickupStop: editing.pickupStop || stops[0] || '',
        dropStop: editing.dropStop || '',
        active: editing.active !== false,
      };
    }

    const defaultRouteId = routes[0]?.id || '';
    const defaultStops = Array.isArray(routes[0]?.stops) ? routes[0].stops : [];

    return {
      studentId: selectableStudents[0]?.id || students[0]?.id || '',
      routeId: defaultRouteId,
      vehicleId: vehicles[0]?.id || '',
      pickupStop: defaultStops[0] || '',
      dropStop: '',
      active: true,
    };
  }, [editing, routes, vehicles, selectableStudents, students]);

  const sections = useMemo(() => {
    const pickupField =
      stopOptions.length > 0
        ? {
            name: 'pickupStop',
            label: 'Pickup stop',
            type: 'select',
            required: true,
            options: stopOptions,
            helperText: 'Pick from route stops (matches backend validation).',
            validate: (v, values) => {
              if (values.routeId !== draftRouteId) return '';
              if (!v) return 'Pickup stop is required.';
              return stopOptions.some((o) => o.value === v) ? '' : 'Pickup stop must be one of the route stops.';
            },
          }
        : {
            name: 'pickupStop',
            label: 'Pickup stop',
            required: true,
            helperText: 'No stops configured for this route. Enter a pickup stop.',
          };

    return [
      {
        title: 'Assignment',
        fields: [
          {
            name: 'studentId',
            label: 'Student',
            type: 'select',
            required: true,
            options: selectableStudents.map((s) => ({ value: s.id, label: s.fullName })),
          },
          {
            name: 'routeId',
            label: 'Route',
            type: 'select',
            required: true,
            options: routes.map((r) => ({ value: r.id, label: r.name })),
          },
          {
            name: 'vehicleId',
            label: 'Vehicle',
            type: 'select',
            required: true,
            options: vehicles.map((v) => ({ value: v.id, label: `${v.name} (${v.plateNo})` })),
          },
          pickupField,
          { name: 'dropStop', label: 'Drop stop' },
          {
            name: 'active',
            label: 'Active',
            type: 'checkbox',
            helperText: 'Inactive assignments are kept for history but not counted in occupancy.',
          },
        ],
      },
    ];
  }, [routes, vehicles, selectableStudents, stopOptions, draftRouteId]);

  const submit = async (values) => {
    // extra safety check before hitting backend
    if (stopOptions.length > 0 && !stopOptions.some((o) => o.value === values.pickupStop)) {
      return {
        success: false,
        message: 'Validation error.',
        errors: { pickupStop: 'Pickup stop must be one of the route stops.' },
      };
    }

    const result = await saveTransportAssignment(values);
    if (!result.success) {
      toast.error(result.message || result.errors?._form || 'Unable to save assignment.');
      return result;
    }

    toast.success(editing ? 'Assignment updated.' : 'Assignment created.');
    setOpen(false);
    setEditing(null);
    setDraftRouteId('');
    load();
    return result;
  };

  const doConfirm = async () => {
    if (!confirm) return;
    const a = confirm.assignment;

    if (confirm.type === 'archive') {
      const result = await archiveTransportAssignment(a.id);
      if (result.success) toast.success('Assignment archived.');
      else toast.error(result.message || 'Unable to archive assignment.');
    }

    if (confirm.type === 'toggle') {
      const result = await setTransportAssignmentActive(a.id, a.active === false);
      if (result.success) toast.success('Assignment updated.');
      else toast.error(result.message || 'Unable to update assignment.');
    }

    setConfirm(null);
    load();
  };

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Transport Routes"
          description="Manage route coverage, stops, vehicle assignments, and student allocations."
          actions={<Button onClick={openNew}>Assign student</Button>}
        />

        {loading ? <p className="text-sm text-zinc-400">Loading...</p> : null}

        <div className="grid gap-4 lg:grid-cols-2">
          {routeCards.map(({ route, vehicleId, occ, capacity }) => {
            const pct = capacity ? Math.round((occ / capacity) * 100) : 0;
            const tone = pct >= 90 ? 'danger' : pct >= 70 ? 'warning' : 'success';

            return (
              <Card key={route.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-white">{route.name}</p>
                    <p className="text-sm text-zinc-400">{route.startPoint} · {route.distanceKm} km</p>
                  </div>
                  <Badge variant={route.status}>{route.status}</Badge>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(Array.isArray(route.stops) ? route.stops : []).map((stop) => (
                    <Badge key={stop} variant="neutral">{stop}</Badge>
                  ))}
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-sm text-zinc-400">Vehicle: {vehicleId ? vehicleLabel(vehicleId) : '—'}</p>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">Occupancy</span>
                      <span className="text-white">{occ}/{capacity || '—'}</span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-zinc-800">
                      <div
                        className={`h-2 rounded-full ${tone === 'danger' ? 'bg-rose-400' : tone === 'warning' ? 'bg-amber-400' : 'bg-emerald-400'}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Student allocations</h2>
          <Table rows={assignmentRows} columns={columns} />
        </Card>
      </div>

      <RecordFormSheet
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
          setDraftRouteId('');
        }}
        title={editing ? 'Edit allocation' : 'Assign student to route'}
        description="Server enforces capacity and one active assignment per student."
        initialValues={initialValues}
        sections={sections}
        submitLabel={editing ? 'Update allocation' : 'Save allocation'}
        onValuesChange={(vals) => {
          if (vals?.routeId && vals.routeId !== draftRouteId) setDraftRouteId(vals.routeId);
        }}
        onSubmit={submit}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.type === 'archive' ? 'Archive allocation' : 'Update allocation'}
        description={confirm?.type === 'archive' ? 'Archive this transport assignment?' : 'Toggle active state for this assignment?'}
        confirmLabel="Continue"
        onConfirm={doConfirm}
      />
    </>
  );
}