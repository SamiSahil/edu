import { useEffect, useMemo, useState } from 'react';
import { RecordFormSheet } from '../../components/layout/RecordFormSheet.jsx';
import { useUI } from '../../context/UIContext.jsx';

import { saveAssignment } from '../../services/assignments.service.js';
import { getClassesSections, getSubjects } from '../../services/academics.service.js';

export default function AssignmentForm({ open, onClose, assignment, assignmentId, defaults = {}, onSaved }) {
  const { toast } = useUI();

  const [loading, setLoading] = useState(false);
  const [lookupsLoading, setLookupsLoading] = useState(false);

  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjectsList] = useState([]);

  useEffect(() => {
    if (!open) return;

    let mounted = true;
    setLookupsLoading(true);

    Promise.all([getClassesSections(), getSubjects()])
      .then(([cs, subs]) => {
        if (!mounted) return;
        setClasses(cs?.classes || []);
        setSections(cs?.sections || []);
        setSubjectsList(subs || []);
      })
      .catch((e) => toast.error(e.message || 'Unable to load assignment lookups.'))
      .finally(() => mounted && setLookupsLoading(false));

    return () => {
      mounted = false;
    };
  }, [open, toast]);

  const initialValues = useMemo(
    () => ({
      id: assignment?.id,
      title: assignment?.title || defaults.title || '',
      classId: assignment?.classId || assignment?.class?.id || defaults.classId || classes[0]?.id || '',
      sectionId: assignment?.sectionId || assignment?.section?.id || defaults.sectionId || '',
      subjectId: assignment?.subjectId || assignment?.subject?.id || defaults.subjectId || subjects[0]?.id || '',
      dueDate: assignment?.dueDate ? String(assignment.dueDate).slice(0, 10) : defaults.dueDate || '',
      instructions: assignment?.instructions || defaults.instructions || '',
      status: assignment?.status || defaults.status || 'draft',
    }),
    [assignment, classes, defaults, subjects]
  );

  const sectionOptions = useMemo(() => {
    return sections.map((s) => ({
      value: s.id,
      label: `${classes.find((c) => c.id === s.classId)?.name || 'Class'} / ${s.name}`,
    }));
  }, [classes, sections]);

  const formSections = [
    {
      title: 'Assignment',
      fields: [
        { name: 'title', label: 'Title', required: true },
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
          options: sectionOptions,
        },
        {
          name: 'subjectId',
          label: 'Subject',
          type: 'select',
          required: true,
          options: subjects.map((s) => ({ value: s.id, label: s.name })),
        },
        { name: 'dueDate', label: 'Due date', type: 'date', required: true },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { value: 'draft', label: 'Draft' },
            { value: 'published', label: 'Published' },
            { value: 'closed', label: 'Closed' },
          ],
        },
        { name: 'instructions', label: 'Instructions', type: 'textarea', required: true },
      ],
    },
  ];

  return (
    <RecordFormSheet
      open={open}
      onClose={onClose}
      title={assignment ? 'Edit assignment' : 'Add assignment'}
      description="Publish homework or classwork with due dates and clear instructions."
      initialValues={initialValues}
      sections={formSections}
      submitLabel={assignment ? 'Update assignment' : 'Create assignment'}
      loading={loading || lookupsLoading}
      onSubmit={async (values) => {
        setLoading(true);
        const result = await saveAssignment({
          id: values.id,
          title: values.title,
          classId: values.classId,
          sectionId: values.sectionId,
          subjectId: values.subjectId,
          dueDate: values.dueDate,
          instructions: values.instructions,
          status: values.status,
        });
        setLoading(false);

        if (!result.success) return toast.error(result.message || 'Unable to save assignment.');
        toast.success(assignment ? 'Assignment updated.' : 'Assignment created.');
        onSaved?.(result.data);
        onClose?.();
      }}
    />
  );
}