import { Button } from '@mui/material';
import { LockOutlined, SearchOff } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';

export function ForbiddenPage() {
  return (
    <EmptyState
      icon={<LockOutlined />}
      title="Access denied"
      text="You do not have permission to view this page."
      action={
        <Button component={Link} to="/dashboard" variant="contained">
          Back to dashboard
        </Button>
      }
    />
  );
}

export function NotFoundPage() {
  return (
    <EmptyState
      icon={<SearchOff />}
      title="Page not found"
      text="The page you are looking for does not exist or has moved."
      action={
        <Button component={Link} to="/dashboard" variant="contained">
          Back to dashboard
        </Button>
      }
    />
  );
}
