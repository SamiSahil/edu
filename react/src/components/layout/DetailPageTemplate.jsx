import { Card } from '../ui/Card.jsx';
import { Tabs } from '../ui/Tabs.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Avatar } from '../ui/Avatar.jsx';
import { PageHeader } from '../ui/PageHeader.jsx';
import { StatCard } from '../ui/StatCard.jsx';
import { Timeline } from '../ui/Timeline.jsx';

export function DetailPageTemplate({
  title,
  description,
  eyebrow,
  breadcrumbs,
  actions,
  avatarName,
  avatarSrc,
  status,
  subTitle,
  stats = [],
  tabs,
  activeTab,
  onTabChange,
  tabContent,
  timeline,
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} eyebrow={eyebrow} breadcrumbs={breadcrumbs} actions={actions} />
      <Card className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={avatarName} src={avatarSrc} size="xl" />
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-2xl font-semibold text-white">{title}</h2>
                {status ? <Badge variant={status}>{status}</Badge> : null}
              </div>
              {subTitle ? <p className="text-sm text-zinc-400">{subTitle}</p> : null}
            </div>
          </div>
          {stats.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <StatCard key={stat.label} {...stat} />)}</div> : null}
        </div>
      </Card>
      {tabs ? <Tabs tabs={tabs} active={activeTab} onChange={onTabChange} /> : null}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div>{tabContent}</div>
        <Card className="p-5">
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">Timeline</p>
          <div className="mt-4">
            <Timeline items={timeline || []} />
          </div>
        </Card>
      </div>
    </div>
  );
}