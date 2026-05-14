import { Card } from '../ui/Card.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { FilterChips } from '../ui/FilterChips.jsx';
import { PageHeader } from '../ui/PageHeader.jsx';
import { Pagination } from '../ui/Pagination.jsx';
import { SearchBar } from '../ui/SearchBar.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import { StatCard } from '../ui/StatCard.jsx';
import { Table } from '../ui/Table.jsx';

export function ListPageTemplate({
  title,
  description,
  eyebrow,
  breadcrumbs,
  actions,
  stats = [],
  search,
  onSearch,
  filterChips,
  activeFilter,
  onFilterChange,
  rows,
  columns,
  mobileRender,
  emptyTitle = 'No records found',
  emptyDescription = 'Try adjusting the filters or create a new record.',
  emptyActionLabel,
  onEmptyAction,
  loading = false,
  error,
  page,
  totalPages,
  onPageChange,
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} eyebrow={eyebrow} breadcrumbs={breadcrumbs} actions={actions} />
      {stats.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <StatCard key={stat.label} {...stat} />)}</div> : null}
      <Card className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <SearchBar value={search} onChange={onSearch} placeholder="Search records..." />
          {filterChips ? <FilterChips items={filterChips} active={activeFilter} onChange={onFilterChange} /> : null}
        </div>
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-16 w-full rounded-2xl" />)}</div>
        ) : error ? (
          <EmptyState title="Something went wrong" description={error} actionLabel="Try again" onAction={() => window.location.reload()} />
        ) : (
          <>
            <Table rows={rows} columns={columns} mobileRender={mobileRender} empty={<EmptyState title={emptyTitle} description={emptyDescription} actionLabel={emptyActionLabel} onAction={onEmptyAction} />} />
            {totalPages ? <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} /> : null}
          </>
        )}
      </Card>
    </div>
  );
}