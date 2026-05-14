import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { RecordFormSheet } from '../../components/layout/RecordFormSheet.jsx';
import { useUI } from '../../context/UIContext.jsx';

import { getIssues, issueBook, returnBook, getBooks } from '../../services/library.service.js';
import { getStudents } from '../../services/students.service.js';
import { formatDate } from '../../lib/utils.js';

export default function IssueReturn() {
  const { toast } = useUI();

  const [open, setOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [issues, setIssues] = useState([]);
  const [books, setBooks] = useState([]);
  const [students, setStudentsList] = useState([]);

  const load = () => {
    setLoading(true);
    setError('');

    Promise.all([
      getIssues(),
      getBooks({ search: '' }),
      getStudents({ page: 1, pageSize: 500, status: 'all' }),
    ])
      .then(([iss, bks, stu]) => {
        setIssues(iss || []);
        setBooks(bks || []);
        setStudentsList(stu.items || []);
      })
      .catch((e) => setError(e.message || 'Unable to load library issues.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bookOptions = useMemo(
    () => books.map((b) => ({ value: b.id, label: `${b.title} (${b.availableCopies}/${b.copies})` })),
    [books]
  );

  const studentOptions = useMemo(
    () => students.filter((s) => s.status !== 'archived').map((s) => ({ value: s.id, label: s.fullName })),
    [students]
  );

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Issue / Return"
          description="Track member loans, due dates, and fine-aware returns."
          actions={<Button onClick={() => setOpen(true)}>Issue book</Button>}
        />

        {loading ? <p className="text-sm text-zinc-400">Loading...</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <div className="grid gap-3">
          {issues.map((issue) => {
            const duePast = issue.dueDate && new Date(issue.dueDate) < new Date() && !issue.returnedAt;
            return (
              <Card key={issue.id} className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-white">{issue.book?.title || issue.bookId}</p>
                    <p className="text-sm text-zinc-400">
                      {issue.student?.fullName || issue.studentId} · Due {formatDate(issue.dueDate)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={issue.returnedAt ? 'info' : duePast ? 'danger' : 'info'}>
                      {issue.returnedAt ? 'returned' : 'issued'}
                    </Badge>

                    {!issue.returnedAt ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          const result = await returnBook(issue.id);
                          if (result.success) toast.success('Book returned.');
                          else toast.error(result.message || 'Unable to return book.');
                          load();
                        }}
                      >
                        Return
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {!loading && !issues.length ? (
          <Card className="p-6">
            <p className="text-sm text-zinc-400">No issues found.</p>
          </Card>
        ) : null}
      </div>

      <RecordFormSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Issue book"
        description="Assign a book to a member and set a due date."
        initialValues={{
          bookId: bookOptions[0]?.value || '',
          studentId: studentOptions[0]?.value || '',
          issuedAt: new Date().toISOString().slice(0, 10),
          dueDate: new Date().toISOString().slice(0, 10),
        }}
        sections={[
          {
            title: 'Issue',
            fields: [
              { name: 'bookId', label: 'Book', type: 'select', required: true, options: bookOptions },
              { name: 'studentId', label: 'Member', type: 'select', required: true, options: studentOptions },
              { name: 'issuedAt', label: 'Issue date', type: 'date', required: true },
              { name: 'dueDate', label: 'Due date', type: 'date', required: true },
            ],
          },
        ]}
        submitLabel="Issue book"
        onSubmit={async (values) => {
          const result = await issueBook(values);
          if (!result.success) return toast.error(result.message || 'Unable to issue book.');
          toast.success('Book issued.');
          setOpen(false);
          load();
        }}
      />
    </>
  );
}