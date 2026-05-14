import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { ListPageTemplate } from '../../components/layout/ListPageTemplate.jsx';
import { RecordFormSheet } from '../../components/layout/RecordFormSheet.jsx';
import { useUI } from '../../context/UIContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

import { getInvoices, recordPayment, saveInvoice, waiveInvoice } from '../../services/fees.service.js';
import { getStudents, getStudentById } from '../../services/students.service.js';
import { formatCurrency, formatDate } from '../../lib/utils.js';
import { paginate } from '../../lib/utils.js';

const MANAGE_ROLES = new Set(['Admin', 'Accountant']);

async function loadStudentOptionsForRole(role, linkedStudentIds) {
  // Staff can list students (backend allows)
  if (role === 'Admin' || role === 'Accountant' || role === 'Principal' || role === 'Teacher') {
    const res = await getStudents({ page: 1, pageSize: 500, status: 'all' });
    return (res.items || []).map((s) => ({ value: s.id, label: s.fullName }));
  }

  // Parent/Student: only linked, fetch by id
  const items = await Promise.all((linkedStudentIds || []).map((id) => getStudentById(id).catch(() => null)));
  return items.filter(Boolean).map((s) => ({ value: s.id, label: s.fullName }));
}

export default function Invoices() {
  const { toast } = useUI();
  const { user, role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const canManage = MANAGE_ROLES.has(role);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  const [invoices, setInvoices] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, totalItems: 0, pageSize: 8 });

  const [studentOptions, setStudentOptions] = useState([]);

  const [payment, setPayment] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const openCreate = canManage && searchParams.get('form') === 'new';

  const load = () => {
    setLoading(true);
    setError('');

    // Server-side filter for most statuses; for overdue we fetch all and filter client-side
    const serverStatus = status === 'overdue' ? 'all' : status;

    getInvoices({ page, pageSize: 8, search, status: serverStatus })
      .then((res) => {
        let items = res.items || [];

        // Client-side overdue filter if needed (because overdue can be computed)
        if (status === 'overdue') {
          items = items.filter((i) => i.status === 'overdue');
          const local = paginate(items, page, 8);
          setInvoices(local.items);
          setMeta({ page: local.currentPage, totalPages: local.totalPages, totalItems: local.totalItems, pageSize: local.pageSize });
          return;
        }

        setInvoices(items);
        setMeta(res.meta || {});
      })
      .catch((e) => setError(e.message || 'Unable to load invoices.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, status]);

  useEffect(() => {
    let mounted = true;
    loadStudentOptionsForRole(role, user?.linkedStudentIds || [])
      .then((opts) => mounted && setStudentOptions(opts))
      .catch(() => mounted && setStudentOptions([]));
    return () => {
      mounted = false;
    };
  }, [role, user?.linkedStudentIds]);

  const columns = [
    {
      key: 'id',
      label: 'Invoice',
      render: (row) => (
        <div>
          <p className="font-medium text-white">{row.invoiceNo || 'INV—'}</p>
          <p className="text-xs text-zinc-500">{row.student?.fullName || row.studentId}</p>
        </div>
      ),
    },
    { key: 'issuedAt', label: 'Issued', render: (row) => formatDate(row.issuedAt) },
    { key: 'dueDate', label: 'Due', render: (row) => formatDate(row.dueDate) },
    { key: 'balance', label: 'Balance', render: (row) => formatCurrency(row.balance) },
    { key: 'status', label: 'Status', render: (row) => <Badge variant={row.status}>{row.status}</Badge> },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setPayment(row)}>
            Pay
          </Button>
          {canManage ? (
            <Button size="sm" variant="ghost" onClick={() => setConfirm({ type: 'waive', invoice: row })}>
              Waive
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  const doConfirm = async () => {
    if (!confirm) return;

    if (confirm.type === 'waive') {
      const result = await waiveInvoice(confirm.invoice.id, confirm.invoice.balance);
      if (result.success) toast.success('Invoice waived.');
      else toast.error(result.message || 'Unable to waive invoice.');
    }

    setConfirm(null);
    load();
  };

  return (
    <>
      <ListPageTemplate
        title="Invoices"
        description="Generate invoices, collect payments, and clearly track unpaid, partial, overdue, and waived states."
        actions={canManage ? <Button onClick={() => setSearchParams({ form: 'new' })}>Create invoice</Button> : null}
        stats={[
          { label: 'Unpaid', value: invoices.filter((i) => i.status === 'unpaid').length, note: 'no payment made (page)' },
          { label: 'Partial', value: invoices.filter((i) => i.status === 'partial').length, note: 'partially settled (page)' },
          { label: 'Paid', value: invoices.filter((i) => i.status === 'paid').length, note: 'fully settled (page)' },
          { label: 'Overdue', value: invoices.filter((i) => i.status === 'overdue').length, note: 'past due (page)' },
        ]}
        search={search}
        onSearch={setSearch}
        filterChips={[
          { key: 'all', label: 'All' },
          { key: 'unpaid', label: 'Unpaid' },
          { key: 'partial', label: 'Partial' },
          { key: 'paid', label: 'Paid' },
          { key: 'overdue', label: 'Overdue' },
          { key: 'waived', label: 'Waived' },
        ]}
        activeFilter={status}
        onFilterChange={setStatus}
        rows={invoices}
        columns={columns}
        loading={loading}
        error={error}
        emptyActionLabel={canManage ? 'Create invoice' : 'Clear filters'}
        onEmptyAction={() => (canManage ? setSearchParams({ form: 'new' }) : (setSearch(''), setStatus('all')))}
        page={meta.page || page}
        totalPages={meta.totalPages || 1}
        onPageChange={setPage}
      />

      {/* Create invoice */}
      <RecordFormSheet
        open={openCreate}
        onClose={() => setSearchParams({})}
        title="Create invoice"
        description="Use a compact invoice form with fee items and due date."
        initialValues={{
          issuedAt: new Date().toISOString().slice(0, 10),
          dueDate: new Date().toISOString().slice(0, 10),
          studentId: studentOptions[0]?.value || '',
          itemsText: '',
          notes: '',
        }}
        sections={[
          {
            title: 'Invoice',
            fields: [
              {
                name: 'studentId',
                label: 'Student',
                type: 'select',
                required: true,
                options: studentOptions,
              },
              { name: 'issuedAt', label: 'Issued at', type: 'date', required: true },
              { name: 'dueDate', label: 'Due date', type: 'date', required: true },
              { name: 'itemsText', label: 'Items', type: 'textarea', helperText: 'One line per item: Tuition:180', required: true },
              { name: 'notes', label: 'Notes', type: 'textarea' },
            ],
          },
        ]}
        submitLabel="Save invoice"
        onSubmit={async (values) => {
          if (!canManage) return toast.error('You do not have permission to create invoices.');

          const items = String(values.itemsText || '')
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
              const [label, amount] = line.split(':');
              return { label: label?.trim() || 'Fee', amount: Number(amount || 0) };
            });

          const result = await saveInvoice({
            studentId: values.studentId,
            issuedAt: values.issuedAt,
            dueDate: values.dueDate,
            items,
            notes: values.notes || '',
          });

          if (!result.success) return toast.error(result.message || 'Unable to save invoice.');
          toast.success('Invoice saved.');
          setSearchParams({});
          load();
        }}
      />

      {/* Record payment */}
      <RecordFormSheet
        open={Boolean(payment)}
        onClose={() => setPayment(null)}
        title="Record payment"
        description="Apply a payment against the selected invoice."
        initialValues={{
          invoiceId: payment?.id || '',
          studentId: payment?.studentId || '',
          amount: payment?.balance || 0,
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
                options: invoices.map((i) => ({ value: i.id, label: i.invoiceNo || i.id })),
                disabled: true,
              },
              {
                name: 'studentId',
                label: 'Student',
                type: 'select',
                required: true,
                options: studentOptions,
                disabled: true,
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
        submitLabel="Record payment"
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
          setPayment(null);
          load();
        }}
      />

      {/* Waive */}
      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title="Waive invoice"
        description={confirm ? `Waive remaining balance for ${confirm.invoice.id}?` : ''}
        confirmLabel="Waive"
        onConfirm={doConfirm}
      />
    </>
  );
}