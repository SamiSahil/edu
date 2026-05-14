import { useEffect, useMemo, useState } from 'react';
import { RecordFormSheet } from '../../components/layout/RecordFormSheet.jsx';
import { saveAdmission } from '../../services/admissions.service.js';
import { useUI } from '../../context/UIContext.jsx';
import { getClassesSections } from '../../services/academics.service.js';

export default function AdmissionForm({ open, onClose, admission, defaults = {}, onSaved }) {
  const { toast } = useUI();
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    getClassesSections()
      .then((data) => mounted && setClasses(data?.classes || []))
      .catch(() => {})
      .finally(() => {});
    return () => {
      mounted = false;
    };
  }, [open]);

  const initialValues = useMemo(
    () => ({
      id: admission?.id,
      applicantName: admission?.applicantName || defaults.applicantName || '',
      parentName: admission?.parentName || defaults.parentName || '',
      phone: admission?.phone || defaults.phone || '',
      email: admission?.email || defaults.email || '',
      requestedClassId: admission?.requestedClassId || admission?.requestedClass?.id || defaults.requestedClassId || '',
      source: admission?.source || defaults.source || '',
      previousSchool: admission?.previousSchool || defaults.previousSchool || '',
      notes: admission?.notes || defaults.notes || '',
      status: admission?.status || defaults.status || 'new',
    }),
    [admission, defaults]
  );

  const sections = [
    {
      title: 'Applicant',
      fields: [
        { name: 'applicantName', label: 'Applicant name', required: true },
        { name: 'parentName', label: 'Parent name', required: true },
        { name: 'phone', label: 'Phone', type: 'tel', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
      ],
    },
    {
      title: 'Admission',
      fields: [
        {
          name: 'requestedClassId',
          label: 'Requested class',
          type: 'select',
          required: true,
          options: classes.map((item) => ({ value: item.id, label: item.name })),
        },
        { name: 'source', label: 'Source', required: true },
        { name: 'previousSchool', label: 'Previous school' },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { value: 'new', label: 'New' },
            { value: 'contacted', label: 'Contacted' },
            { value: 'shortlisted', label: 'Shortlisted' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'converted', label: 'Converted' },
          ],
        },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ],
    },
  ];

  return (
    <RecordFormSheet
      open={open}
      onClose={onClose}
      title={admission ? 'Edit admission' : 'Add admission'}
      description="Track applicants through the admissions pipeline."
      initialValues={initialValues}
      sections={sections}
      submitLabel={admission ? 'Update admission' : 'Create admission'}
      onSubmit={async (values) => {
        const result = await saveAdmission(values);
        if (!result.success) {
          toast.error(result.message || 'Unable to save admission.');
          return;
        }
        toast.success(admission ? 'Admission updated.' : 'Admission created.');
        onSaved?.(result.data);
        onClose?.();
      }}
    />
  );
}