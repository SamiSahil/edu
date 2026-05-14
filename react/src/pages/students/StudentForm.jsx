import { useEffect, useMemo, useState } from 'react';
import { RecordFormSheet } from '../../components/layout/RecordFormSheet.jsx';
import { useUI } from '../../context/UIContext.jsx';
import { saveStudent, getStudentById } from '../../services/students.service.js';
import { getClassesSections } from '../../services/academics.service.js';
import { getGuardians } from '../../services/guardians.service.js';
import { trimValue } from '../../lib/utils.js';

export default function StudentForm({ open, onClose, student, studentId, defaults = {}, onSaved }) {
  const { toast } = useUI();

  const [loading, setLoading] = useState(false);
  const [lookupsLoading, setLookupsLoading] = useState(false);

  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [guardians, setGuardiansList] = useState([]);

  const [record, setRecord] = useState(student || null);

  const isEdit = Boolean(record?.id);

  useEffect(() => {
    if (!open) return;

    let mounted = true;
    setLookupsLoading(true);

    Promise.all([getClassesSections(), getGuardians({ page: 1, pageSize: 500 })])
      .then(([cs, g]) => {
        if (!mounted) return;
        setClasses(cs?.classes || []);
        setSections(cs?.sections || []);
        setGuardiansList(g?.items || []);
      })
      .catch((e) => toast.error(e.message || 'Unable to load form lookups.'))
      .finally(() => mounted && setLookupsLoading(false));

    return () => {
      mounted = false;
    };
  }, [open, toast]);

  useEffect(() => {
    if (!open) return;

    if (student) {
      setRecord(student);
      return;
    }
    if (!studentId) {
      setRecord(null);
      return;
    }

    let mounted = true;
    setLoading(true);
    getStudentById(studentId)
      .then((data) => mounted && setRecord(data))
      .catch((e) => toast.error(e.message || 'Unable to load student.'))
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [open, student, studentId, toast]);

  const initialValues = useMemo(
    () => ({
      id: record?.id,
      fullName: record?.fullName || defaults.fullName || '',
      admissionNo: record?.admissionNo || defaults.admissionNo || '',

      dob: record?.dob ? String(record.dob).slice(0, 10) : defaults.dob || '',
      gender: record?.gender || defaults.gender || '',

      classId: record?.classId || record?.class?.id || defaults.classId || '',
      sectionId: record?.sectionId || record?.section?.id || defaults.sectionId || '',
      guardianId: record?.guardianId || record?.guardian?.id || defaults.guardianId || '',

      admissionDate: record?.admissionDate
        ? String(record.admissionDate).slice(0, 10)
        : defaults.admissionDate || new Date().toISOString().slice(0, 10),
      admissionYear: record?.admissionYear || defaults.admissionYear || new Date().getFullYear(),

      phone: record?.phone || defaults.phone || '',
      email: record?.email || defaults.email || '',

      status: record?.status || 'active',
      notes: record?.notes || defaults.notes || '',
      documents: record?.documents || defaults.documents || '',

      // NEW (create only)
      createStudentLogin: false,
      studentLoginEmail: '',
      studentLoginPassword: '',

      createParentLogin: false,
      parentLoginEmail: '',
      parentLoginPassword: '',
    }),
    [defaults, record]
  );

  const sectionsSchema = [
    {
      title: 'Personal',
      fields: [
        { name: 'fullName', label: 'Full name', required: true },
        { name: 'dob', label: 'Date of birth', type: 'date', required: true },
        {
          name: 'gender',
          label: 'Gender',
          type: 'select',
          required: true,
          options: [
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'other', label: 'Other' },
          ],
        },
        { name: 'phone', label: 'Phone', type: 'tel', required: true },
        { name: 'email', label: 'Email (optional)', type: 'email' },
      ],
    },
    {
      title: 'Academic',
      fields: [
        {
          name: 'admissionNo',
          label: 'Admission number',
          required: isEdit,
          helperText: isEdit ? 'Must be unique.' : 'Optional. Leave blank to auto-generate.',
        },
        { name: 'admissionDate', label: 'Admission date', type: 'date', required: true },
        { name: 'admissionYear', label: 'Admission year', type: 'number', required: true },
        {
          name: 'classId',
          label: 'Class',
          type: 'select',
          required: true,
          options: classes.map((c) => ({ value: c.id, label: c.name })),
        },
        {
          name: 'sectionId',
          label: 'Section',
          type: 'select',
          required: true,
          options: sections.map((s) => ({
            value: s.id,
            label: `${classes.find((c) => c.id === s.classId)?.name || 'Class'} / ${s.name}`,
          })),
        },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'transferred', label: 'Transferred' },
            { value: 'promoted', label: 'Promoted' },
            { value: 'archived', label: 'Archived' },
          ],
        },
      ],
    },
   {
  title: 'Guardian',
  fields: [
    { name: 'guardianName', label: 'Guardian name', required: true },
    { name: 'guardianPhone', label: 'Guardian phone', type: 'tel', required: true },
    { name: 'guardianEmail', label: 'Guardian email', type: 'email' },
    { name: 'guardianRelation', label: 'Relation', helperText: 'e.g., Father / Mother / Guardian' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
},
    ...(isEdit
      ? []
      : [
          {
            title: 'Login accounts (optional)',
            fields: [
              {
                name: 'createStudentLogin',
                label: 'Create student login',
                type: 'checkbox',
                helperText: 'Username will be auto-generated from the email.',
              },
              {
                name: 'studentLoginEmail',
                label: 'Student login email',
                type: 'email',
                validate: (v, values) => {
                  if (!values.createStudentLogin) return '';
                  return String(v || '').trim() ? '' : 'Required.';
                },
              },
              {
                name: 'studentLoginPassword',
                label: 'Student password',
                type: 'password',
                validate: (v, values) => {
                  if (!values.createStudentLogin) return '';
                  return String(v || '').trim().length >= 8 ? '' : 'Min 8 characters.';
                },
              },

              {
                name: 'createParentLogin',
                label: 'Create parent login',
                type: 'checkbox',
                helperText: 'Username will be auto-generated from the email.',
              },
              {
                name: 'parentLoginEmail',
                label: 'Parent login email',
                type: 'email',
                validate: (v, values) => {
                  if (!values.createParentLogin) return '';
                  return String(v || '').trim() ? '' : 'Required.';
                },
              },
              {
                name: 'parentLoginPassword',
                label: 'Parent password',
                type: 'password',
                validate: (v, values) => {
                  if (!values.createParentLogin) return '';
                  return String(v || '').trim().length >= 8 ? '' : 'Min 8 characters.';
                },
              },
            ],
          },
        ]),
    {
      title: 'Documents',
      fields: [
        {
          name: 'documents',
          label: 'Documents reference',
          type: 'textarea',
          helperText: 'Optional notes for admission files, ID proof, and photos.',
        },
      ],
    },
  ];

  return (
    <RecordFormSheet
      open={open}
      onClose={onClose}
      title={record ? 'Edit student' : 'Add student'}
      description="Create student record and optionally create login accounts for student and parent."
      initialValues={initialValues}
      sections={sectionsSchema}
      submitLabel={record ? 'Update student' : 'Create student'}
      loading={loading || lookupsLoading}
      onSubmit={async (values) => {
        setLoading(true);

        const result = await saveStudent({
          ...values,
          fullName: trimValue(values.fullName),
          admissionNo: values.admissionNo || '',
        });

        setLoading(false);

        if (!result.success) {
          toast.error(result.message || 'Unable to save student.');
          return result;
        }

        toast.success(record ? 'Student updated.' : 'Student created.');
        onSaved?.(result.data);
        onClose?.();
        return result;
      }}
    />
  );
}