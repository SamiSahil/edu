import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { RecordFormSheet } from '../../components/layout/RecordFormSheet.jsx';
import { useUI } from '../../context/UIContext.jsx';

import { getPaymentHistory, recordPayment, getInvoices } from '../../services/fees.service.js';
import { getStudents } from '../../services/students.service.js';
import { formatCurrency, formatDate } from '../../lib/utils.js';

export default function Payments() {
  const { toast } = useUI();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [invoices, setInvoicesList] = useState([]);

  const open = searchParams.get('form') === 'new';

  const load = () => {
    setLoading(true);
    setError('');

    Promise.all([
      getPaymentHistory({ page: 1, pageSize: 200 }),
      getStudents({ page: 1, pageSize: 500, status: 'all' }),
      getInvoices({ page: 1, pageSize: 500, status: 'all' }),
    ])
      .then(([payRes, stuRes, invRes]) => {
        setPayments(payRes.items || []);
        setStudents(stuRes.items || []);
        setInvoicesList(invRes.items || []);
      })
      .catch((e) => setError(e.message || 'Unable to load payments.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalCollected = useMemo(
    () => payments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
    [payments]
  );

  const modeCount = useMemo(() => new Set(payments.map((p) => p.mode)).size, [payments]);

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Payments"
          description="Record receipts, view payment history, and keep invoice balances current."
          actions={<Button onClick={() => setSearchParams({ form: 'new' })}>Record payment</Button>}
        />

        {loading ? <p className="text-sm text-zinc-400">Loading...</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Payments', value: payments.length },
            { label: 'Collected', value: formatCurrency(totalCollected) },
            { label: 'Modes', value: modeCount },
            { label: 'Invoices', value: invoices.length },
          ].map((item) => (
            <Card key={item.label} className="p-5">
              <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">{item.label}</p>
              <p className="mt-2 text-3xl font-semibold text-white">{item.value}</p>
            </Card>
          ))}
        </div>

        <div className="grid gap-3">
          {payments.map((payment) => (
            <Card key={payment.id} className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-white">{payment.receiptRef || payment.id}</p>
                  <p className="text-xs text-zinc-500">
  Invoice: {payment.invoice?.invoiceNo || payment.invoiceId}
</p>
                  <p className="text-sm text-zinc-400">
                    {payment.student?.fullName || payment.studentId} · {formatDate(payment.paidAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="success">{payment.mode}</Badge>
                  <span className="text-white">{formatCurrency(payment.amount)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <RecordFormSheet
        open={open}
        onClose={() => setSearchParams({})}
        title="Record payment"
        description="Apply a payment against an invoice and receipt reference."
        initialValues={{
          invoiceId: invoices[0]?.id || '',
          studentId: students[0]?.id || '',
          amount: 0,
          paidAt: new Date().toISOString().slice(0, 10),
          mode: 'cash',
          receiptRef: '',
        }}
        sections={[
          {
            title: 'Payment',
            fields: [
              {
                name: 'invoiceId',
                label: 'Invoice',
                type: 'select',
                required: true,
                options: invoices.map((inv) => ({ value: inv.id, label: inv.invoiceNo || inv.id })),
              },
              {
                name: 'studentId',
                label: 'Student',
                type: 'select',
                required: true,
                options: students.map((s) => ({ value: s.id, label: s.fullName })),
              },
              { name: 'amount', label: 'Amount', type: 'number', required: true },
              { name: 'paidAt', label: 'Payment date', type: 'date', required: true },
              {
                name: 'mode',
                label: 'Mode',
                type: 'select',
                required: true,
                options: [
                  { value: 'cash', label: 'Cash' },
                  { value: 'card', label: 'Card' },
                  { value: 'bank', label: 'Bank transfer' },
                ],
              },
              { name: 'receiptRef', label: 'Receipt reference' },
            ],
          },
        ]}
        submitLabel="Save payment"
        onSubmit={async (values) => {
          const result = await recordPayment({
            invoiceId: values.invoiceId,
            studentId: values.studentId,
            amount: Number(values.amount || 0),
            paidAt: values.paidAt,
            mode: values.mode,
            receiptRef: values.receiptRef || '',
          });

          if (!result.success) return toast.error(result.message || 'Unable to record payment.');
          toast.success('Payment recorded.');
          setSearchParams({});
          load();
        }}
      />
    </>
  );
}