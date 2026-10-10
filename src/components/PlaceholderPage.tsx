import { Construction } from '@mui/icons-material';
import { EmptyState } from './EmptyState';
import { PageHeader } from './PageHeader';

/** Temporary page for routes whose feature lands in a later task. */
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState
        icon={<Construction />}
        title="Coming soon"
        text="This page is under construction."
      />
    </>
  );
}
