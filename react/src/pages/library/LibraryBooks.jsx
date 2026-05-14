import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { SearchBar } from '../../components/ui/SearchBar.jsx';
import { RecordFormSheet } from '../../components/layout/RecordFormSheet.jsx';
import { useUI } from '../../context/UIContext.jsx';

import { getBooks, saveBook } from '../../services/library.service.js';

export default function LibraryBooks() {
  const { toast } = useUI();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [books, setBooks] = useState([]);

  const open = searchParams.get('form') === 'new';

  const load = () => {
    setLoading(true);
    setError('');
    getBooks({ search })
      .then((items) => setBooks(items || []))
      .catch((e) => setError(e.message || 'Unable to load books.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => load(), 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const filtered = useMemo(() => books, [books]);

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Library Books"
          description="Maintain catalog metadata, availability, and loan status."
          actions={<Button onClick={() => setSearchParams({ form: 'new' })}>Add book</Button>}
        />

        <SearchBar value={search} onChange={setSearch} placeholder="Search by title, author, ISBN, or category" />

        {loading ? <p className="text-sm text-zinc-400">Loading...</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((book) => (
            <Card key={book.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-white">{book.title}</p>
                  <p className="text-sm text-zinc-400">{book.author}</p>
                </div>
                <Badge variant={book.status}>{book.status}</Badge>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-zinc-300">
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500">ISBN</p>
                  <p className="mt-1">{book.isbn}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500">Copies</p>
                  <p className="mt-1">
                    {book.availableCopies}/{book.copies}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {!loading && !filtered.length ? (
          <Card className="p-6">
            <p className="text-sm text-zinc-400">No books found.</p>
          </Card>
        ) : null}
      </div>

      <RecordFormSheet
        open={open}
        onClose={() => setSearchParams({})}
        title="Add book"
        description="Capture catalog details and availability."
        initialValues={{ status: 'available', copies: 1 }}
        sections={[
          {
            title: 'Book',
            fields: [
              { name: 'title', label: 'Title', required: true },
              { name: 'author', label: 'Author', required: true },
              { name: 'isbn', label: 'ISBN', required: true },
              { name: 'category', label: 'Category', required: true },
              { name: 'copies', label: 'Copies', type: 'number', required: true },
              {
                name: 'status',
                label: 'Status',
                type: 'select',
                options: [
                  { value: 'available', label: 'Available' },
                  { value: 'issued', label: 'Issued' },
                  { value: 'reserved', label: 'Reserved' },
                  { value: 'lost', label: 'Lost' },
                ],
              },
            ],
          },
        ]}
        submitLabel="Save book"
        onSubmit={async (values) => {
          const copies = Number(values.copies || 0);
          const result = await saveBook({
            title: values.title,
            author: values.author,
            isbn: values.isbn,
            category: values.category,
            copies,
            status: values.status,
          });

          if (!result.success) return toast.error(result.message || 'Unable to save book.');
          toast.success('Book saved.');
          setSearchParams({});
          load();
        }}
      />
    </>
  );
}