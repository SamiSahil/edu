import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { DropdownMenu } from '../../components/ui/DropdownMenu.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { FilterChips } from '../../components/ui/FilterChips.jsx';
import { RecordFormSheet } from '../../components/layout/RecordFormSheet.jsx';

import { useUI } from '../../context/UIContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

import {
  archiveCommunication,
  getCommunicationLookups,
  getVisibleCommunications,
  saveCommunication,
} from '../../services/communication.service.js';

const COMPOSE_ROLES = new Set(['Admin', 'Principal', 'Teacher', 'Accountant', 'Librarian']);

const ROLE_OPTIONS = [
  { value: 'Admin', label: 'Admin' },
  { value: 'Principal', label: 'Principal' },
  { value: 'Teacher', label: 'Teacher' },
  { value: 'Accountant', label: 'Accountant' },
  { value: 'Librarian', label: 'Librarian' },
  { value: 'Parent', label: 'Parent' },
  { value: 'Student', label: 'Student' },
];

export default function Communications() {
  const { toast } = useUI();
  const { role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const canCompose = COMPOSE_ROLES.has(role);

  const [filter, setFilter] = useState('all');
  const [confirm, setConfirm] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [records, setRecords] = useState([]);

  // lookups
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]); // search results for individual targeting

  const openCompose = canCompose && searchParams.get('compose') === 'new';
  const editId = canCompose && searchParams.get('compose') === 'edit' ? searchParams.get('id') : null;

  const editing = useMemo(() => {
    if (!editId) return null;
    return records.find((r) => r.id === editId) || null;
  }, [editId, records]);

  const load = () => {
    setLoading(true);
    setError('');

    const statusParam = filter === 'all' ? 'all' : filter;

    getVisibleCommunications({ status: statusParam })
      .then((items) => setRecords(items || []))
      .catch((e) => setError(e.message || 'Unable to load communications.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // load base lookups when compose opens (classes/sections)
  useEffect(() => {
    if (!canCompose) return;
    if (!(openCompose || editing)) return;

    getCommunicationLookups('')
      .then((data) => {
        setClasses(data?.classes || []);
        setSections(data?.sections || []);
      })
      .catch(() => {});
  }, [canCompose, openCompose, editing]);

  const classNameById = useMemo(() => new Map(classes.map((c) => [c.id, c.name])), [classes]);

  const sectionOptions = useMemo(() => {
    return sections.map((s) => ({
      value: s.id,
      label: `${classNameById.get(s.classId) || 'Class'} / ${s.name}`,
    }));
  }, [sections, classNameById]);

  const classOptions = useMemo(() => classes.map((c) => ({ value: c.id, label: c.name })), [classes]);
  const studentOptions = useMemo(
    () => (students || []).map((s) => ({ value: s.id, label: s.fullName })),
    [students]
  );

  // Debounced student search while composing
  const searchTimer = useRef(null);
  const lastSearch = useRef('');

  const onValuesChange = (values) => {
    if (!canCompose) return;
    if (values.audienceType !== 'individual') return;

    const q = String(values.studentSearch || '').trim();
    if (q === lastSearch.current) return;

    lastSearch.current = q;
    if (searchTimer.current) window.clearTimeout(searchTimer.current);

    searchTimer.current = window.setTimeout(async () => {
      if (q.length < 2) {
        setStudents([]);
        return;
      }
      try {
        const data = await getCommunicationLookups(q);
        setStudents(data?.students || []);
      } catch {
        setStudents([]);
      }
    }, 300);
  };

  const initialValues = useMemo(() => {
    if (!editing) {
      return {
        kind: 'message',
        status: 'draft',
        priority: 'medium',
        subject: '',
        body: '',
        audienceType: 'school', // default to entire school
        targetRoles: ['Parent'],
        targetClassIds: [],
        targetSectionIds: [],
        targetStudentIds: [],
        studentSearch: '',
      };
    }

    return {
      id: editing.id,
      kind: editing.kind || 'message',
      status: editing.status || 'draft',
      priority: editing.priority || 'medium',
      subject: editing.subject || editing.title || '',
      body: editing.body || '',
      audienceType: editing.audienceType || 'role',
      targetRoles: editing.targetRoles || [],
      targetClassIds: editing.targetClassIds || [],
      targetSectionIds: editing.targetSectionIds || [],
      targetStudentIds: editing.targetStudentIds || [],
      studentSearch: '',
    };
  }, [editing]);

  const sectionsSchema = useMemo(
    () => [
      {
        title: 'Message',
        fields: [
          {
            name: 'kind',
            label: 'Type',
            type: 'select',
            required: true,
            options: [
              { value: 'message', label: 'Message' },
              { value: 'announcement', label: 'Announcement' },
            ],
          },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            required: true,
            options: [
              { value: 'draft', label: 'Draft' },
              { value: 'scheduled', label: 'Scheduled' },
              { value: 'sent', label: 'Sent' },
            ],
          },
          {
            name: 'priority',
            label: 'Priority',
            type: 'select',
            required: true,
            options: [
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' },
            ],
          },
          { name: 'subject', label: 'Subject', required: true, placeholder: 'Parent meeting update' },
          { name: 'body', label: 'Message body', type: 'textarea', required: true, rows: 6 },
        ],
      },
      {
        title: 'Audience',
        fields: [
          {
            name: 'audienceType',
            label: 'Audience type',
            type: 'select',
            required: true,
            options: [
              { value: 'school', label: 'Entire school (everyone)' },
              { value: 'role', label: 'Role' },
              { value: 'class', label: 'Class' },
              { value: 'section', label: 'Section' },
              { value: 'individual', label: 'Individual student' },
            ],
          },

          // Role targeting
          {
            name: 'targetRoles',
            label: 'Target roles',
            type: 'multicheck',
            options: ROLE_OPTIONS,
            helperText: 'Pick one or more roles.',
            validate: (v, values) => {
              if (values.audienceType !== 'role') return '';
              return Array.isArray(v) && v.length ? '' : 'Select at least one role.';
            },
          },

          // Class targeting
          {
            name: 'targetClassIds',
            label: 'Target classes',
            type: 'multicheck',
            options: classOptions,
            helperText: 'Pick one or more classes.',
            validate: (v, values) => {
              if (values.audienceType !== 'class') return '';
              return Array.isArray(v) && v.length ? '' : 'Select at least one class.';
            },
          },

          // Section targeting
          {
            name: 'targetSectionIds',
            label: 'Target sections',
            type: 'multicheck',
            options: sectionOptions,
            helperText: 'Pick one or more sections.',
            validate: (v, values) => {
              if (values.audienceType !== 'section') return '';
              return Array.isArray(v) && v.length ? '' : 'Select at least one section.';
            },
          },

          // Individual targeting
          {
            name: 'studentSearch',
            label: 'Student search',
            helperText: 'Type at least 2 characters to search students.',
            placeholder: 'Search by name or admission number...',
            validate: () => '',
          },
          {
            name: 'targetStudentIds',
            label: 'Target students',
            type: 'multicheck',
            options: studentOptions,
            helperText: 'Select one or more students from search results.',
            validate: (v, values) => {
              if (values.audienceType !== 'individual') return '';
              return Array.isArray(v) && v.length ? '' : 'Select at least one student.';
            },
          },
        ],
      },
    ],
    [classOptions, sectionOptions, studentOptions]
  );

  const onSubmit = async (values) => {
    if (!canCompose) return toast.error('You do not have permission to compose messages.');

    const payload = {
      id: values.id,
      kind: values.kind === 'announcement' ? 'announcement' : 'message',
      audienceType: values.audienceType,
      status: values.status,
      priority: values.priority,
      body: values.body,
      subject: values.subject,

      targetRoles: Array.isArray(values.targetRoles) ? values.targetRoles : [],
      targetClassIds: Array.isArray(values.targetClassIds) ? values.targetClassIds : [],
      targetSectionIds: Array.isArray(values.targetSectionIds) ? values.targetSectionIds : [],
      targetStudentIds: Array.isArray(values.targetStudentIds) ? values.targetStudentIds : [],
    };

    const result = await saveCommunication(payload);
    if (!result.success) {
      toast.error(result.message || 'Unable to save communication.');
      return result;
    }

    toast.success(editing ? 'Communication updated.' : 'Communication created.');
    setSearchParams({});
    load();
    return result;
  };

  const doArchive = async () => {
    if (!confirm) return;

    const result = await archiveCommunication(confirm.id);
    if (result.success) toast.success('Communication archived.');
    else toast.error(result.message || 'Unable to archive communication.');

    setConfirm(null);
    load();
  };

  const filteredRecords = useMemo(() => {
    if (filter === 'all') return records;
    return records.filter((r) => r.status === filter);
  }, [records, filter]);

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Communications"
          description={
            role === 'Student' || role === 'Parent'
              ? 'View notices targeted to your role and linked classes.'
              : 'Create notices, messages, and announcements with audience targeting.'
          }
          actions={canCompose ? <Button onClick={() => setSearchParams({ compose: 'new' })}>Compose</Button> : null}
        />

        <FilterChips
          items={[
            { key: 'all', label: 'All' },
            { key: 'draft', label: 'Draft' },
            { key: 'scheduled', label: 'Scheduled' },
            { key: 'sent', label: 'Sent' },
          ]}
          active={filter}
          onChange={setFilter}
        />

        {loading ? <p className="text-sm text-zinc-400">Loading...</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <div className="grid gap-3">
          {filteredRecords.map((record) => (
            <Card key={record.id} className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">{record.subject || record.title}</p>
                  <p className="mt-1 text-sm text-zinc-400">{record.body}</p>
                  <p className="mt-2 text-xs text-zinc-500">
                    Audience: {record.audienceType}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={record.status}>{record.status}</Badge>
                  <Badge variant={record.priority === 'urgent' ? 'danger' : record.priority === 'high' ? 'warning' : 'info'}>
                    {record.priority || 'medium'}
                  </Badge>

                  {canCompose ? (
                    <DropdownMenu
                      trigger="Actions"
                      items={[
                        { label: 'Edit', disabled: record.status === 'sent', onClick: () => setSearchParams({ compose: 'edit', id: record.id }) },
                        { label: 'Archive', danger: true, onClick: () => setConfirm({ id: record.id }) },
                      ]}
                    />
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <RecordFormSheet
        open={openCompose || Boolean(editing)}
        onClose={() => setSearchParams({})}
        title={editing ? 'Edit communication' : 'Compose communication'}
        description="Pick audience by name. Use Entire School to message everyone at once."
        initialValues={initialValues}
        sections={sectionsSchema}
        submitLabel={editing ? 'Update' : 'Send / Save'}
        onSubmit={onSubmit}
        onValuesChange={onValuesChange}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title="Archive communication"
        description="This will hide the record from standard views while preserving it in storage."
        confirmLabel="Archive"
        onConfirm={doArchive}
      />
    </>
  );
}