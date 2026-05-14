import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { RecordFormSheet } from '../../components/layout/RecordFormSheet.jsx';
import { useUI } from '../../context/UIContext.jsx';

import { getClassesSections } from '../../services/academics.service.js';
import { getFeeStructures, saveFeeStructure } from '../../services/fees.service.js';

export default function FeeStructure() {
  const { toast } = useUI();
  const [open, setOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [classes, setClasses] = useState([]);
  const [structures, setStructures] = useState([]);

  const load = () => {
    setLoading(true);
    setError('');

    Promise.all([getClassesSections(), getFeeStructures()])
      .then(([cs, fs]) => {
        setClasses(cs?.classes || []);
        setStructures(fs || []);
      })
      .catch((e) => setError(e.message || 'Unable to load fee structures.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sections = useMemo(
    () => [
      {
        title: 'Structure',
        fields: [
          { name: 'name', label: 'Structure name', required: true },
          {
            name: 'classId',
            label: 'Class',
            type: 'select',
            required: true,
            options: classes.map((c) => ({ value: c.id, label: c.name })),
          },
          {
            name: 'period',
            label: 'Period',
            type: 'select',
            required: true,
            options: [
              { value: 'monthly', label: 'Monthly' },
              { value: 'annual', label: 'Annual' },
            ],
          },
          {
            name: 'feeHeadsText',
            label: 'Fee heads',
            type: 'textarea',
            helperText: 'Format each line as Label:Amount, for example Tuition:180',
          },
          {
            name: 'active',
            label: 'Active',
            type: 'checkbox',
            helperText: 'Keep available for invoice generation.',
          },
        ],
      },
    ],
    [classes]
  );

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Fee Structure"
          description="Define fee heads, periods, and defaults for each class."
          actions={<Button onClick={() => setOpen(true)}>New structure</Button>}
        />

        {loading ? <p className="text-sm text-zinc-400">Loading...</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <div className="grid gap-4 lg:grid-cols-2">
          {structures.map((structure) => (
            <Card key={structure.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-white">{structure.name}</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {structure.class?.name || classes.find((c) => c.id === structure.classId)?.name || '—'} · {structure.period}
                  </p>
                </div>
                <Badge variant={structure.active ? 'success' : 'neutral'}>
                  {structure.active ? 'active' : 'inactive'}
                </Badge>
              </div>

              <div className="mt-4 space-y-2">
                {(structure.feeHeads || []).map((head) => (
                  <div
                    key={head.id || head.label}
                    className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm"
                  >
                    <span className="text-zinc-300">{head.label}</span>
                    <span className="text-white">{head.amount}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <RecordFormSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Add fee structure"
        description="Use a compact form to seed monthly or annual fee heads."
        initialValues={{ active: true, period: 'monthly', feeHeadsText: '' }}
        sections={sections}
        submitLabel="Save structure"
        onSubmit={async (values) => {
          const feeHeads = String(values.feeHeadsText || '')
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
              const [label, amount] = line.split(':');
              return { label: label?.trim() || 'Fee', amount: Number(amount || 0) };
            });

          const result = await saveFeeStructure({
            name: values.name,
            classId: values.classId,
            period: values.period,
            active: Boolean(values.active),
            feeHeads,
          });

          if (!result.success) {
            toast.error(result.message || 'Unable to save structure.');
            return;
          }

          toast.success('Fee structure saved.');
          setOpen(false);
          load();
        }}
      />
    </>
  );
}