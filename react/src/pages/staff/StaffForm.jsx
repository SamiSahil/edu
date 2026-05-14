import { useMemo, useState } from 'react';
import { RecordFormSheet } from '../../components/layout/RecordFormSheet.jsx';
import { saveStaff } from '../../services/staff.service.js';
import { useUI } from '../../context/UIContext.jsx';

export default function StaffForm({ open, onClose, staff, defaults = {}, onSaved }) {
  const { toast } = useUI();
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(staff?.id);

  const initialValues = useMemo(
    () => ({
      id: staff?.id,
      name: staff?.name || defaults.name || '',
      roleLabel: staff?.roleLabel || defaults.roleLabel || 'Teacher',
      department: staff?.department || defaults.department || '',
      email: staff?.email || defaults.email || '',
      phone: staff?.phone || defaults.phone || '',
      joinDate: staff?.joinDate ? String(staff.joinDate).slice(0, 10) : defaults.joinDate || new Date().toISOString().slice(0, 10),
      status: staff?.status || defaults.status || 'active',

      // ✅ create only
      createLogin: false,
      loginPassword: '',
    }),
    [defaults, staff]
  );

  const sections = [
    {
      title: 'Staff profile',
      fields: [
        { name: 'name', label: 'Name', required: true },
        {
          name: 'roleLabel',
          label: 'Role',
          type: 'select',
          required: true,
          options: [
            { value: 'Teacher', label: 'Teacher' },
            { value: 'Principal', label: 'Principal' },
            { value: 'Accountant', label: 'Accountant' },
            { value: 'Librarian', label: 'Librarian' },
            { value: 'Admin', label: 'Admin' },
          ],
        },
        { name: 'department', label: 'Department', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'phone', label: 'Phone', type: 'tel', required: true },
        { name: 'joinDate', label: 'Join date', type: 'date', required: true },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'archived', label: 'Archived' },
          ],
        },
      ],
    },
    ...(isEdit
      ? []
      : [
          {
            title: 'Login account (optional)',
            fields: [
              {
                name: 'createLogin',
                label: 'Create login account for this staff member',
                type: 'checkbox',
                helperText: 'Username will be auto-generated from the email (and made unique).',
              },
              {
                name: 'loginPassword',
                label: 'Password',
                type: 'password',
                helperText: 'Min 8 characters.',
                validate: (v, values) => {
                  if (!values.createLogin) return '';
                  return String(v || '').trim().length >= 8 ? '' : 'Password is required (min 8).';
                },
              },
            ],
          },
        ]),
  ];

  return (
    <RecordFormSheet
      open={open}
      onClose={onClose}
      title={staff ? 'Edit staff' : 'Add staff'}
      description="Create staff records. Optionally create a login account."
      initialValues={initialValues}
      sections={sections}
      submitLabel={staff ? 'Update staff' : 'Create staff'}
      loading={saving}
      onSubmit={async (values) => {
        setSaving(true);
        const result = await saveStaff(values);
        setSaving(false);

        if (!result.success) return toast.error(result.message || 'Unable to save staff.');
        toast.success(staff ? 'Staff updated.' : 'Staff created.');
        onSaved?.(result.data);
        onClose?.();
      }}
    />
  );
}