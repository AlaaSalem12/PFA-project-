import type { ElementType } from 'react';
import { matchPath } from 'react-router-dom';
import {
  AccountTree,
  Badge,
  Engineering,
  Assignment,
  People,
  ReceiptLong,
  SpaceDashboard,
} from '@mui/icons-material';
import type { UserRole } from '../types/api';

export interface NavItem {
  label: string;
  path: string;
  icon: ElementType;
  /** Roles allowed to see the item. Omit for every authenticated user. */
  roles?: UserRole[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', path: '/dashboard', icon: SpaceDashboard }],
  },
  {
    label: 'Maintenance',
    items: [
      { label: 'Machines', path: '/machines', icon: Engineering },
      { label: 'Work orders', path: '/work-orders', icon: Assignment },
    ],
  },
  {
    label: 'HR',
    items: [
      { label: 'Employees', path: '/hr/employees', icon: Badge, roles: ['ADMIN', 'HR_MANAGER'] },
      {
        label: 'Organization',
        path: '/hr/organization',
        icon: AccountTree,
        roles: ['ADMIN', 'HR_MANAGER'],
      },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Users', path: '/admin/users', icon: People, roles: ['ADMIN'] },
      { label: 'Audit log', path: '/admin/audit-logs', icon: ReceiptLong, roles: ['ADMIN'] },
    ],
  },
];

/** Nav groups visible to a role; groups left without items are dropped. */
export function getVisibleNavGroups(role: UserRole | undefined): NavGroup[] {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || (role && item.roles.includes(role))),
    }))
    .filter((group) => group.items.length > 0);
}

/** Breadcrumb labels keyed by route pattern. */
const crumbLabels: Array<{ pattern: string; label: string }> = [
  { pattern: '/dashboard', label: 'Dashboard' },
  { pattern: '/machines', label: 'Machines' },
  { pattern: '/machines/new', label: 'New machine' },
  { pattern: '/machines/:id', label: 'Details' },
  { pattern: '/machines/:id/edit', label: 'Edit' },
  { pattern: '/work-orders', label: 'Work orders' },
  { pattern: '/hr/employees', label: 'Employees' },
  { pattern: '/hr/organization', label: 'Organization' },
  { pattern: '/admin/users', label: 'Users' },
  { pattern: '/admin/audit-logs', label: 'Audit log' },
  { pattern: '/profile', label: 'Profile' },
  { pattern: '/change-password', label: 'Change password' },
  { pattern: '/403', label: 'Forbidden' },
];

export interface Crumb {
  label: string;
  path: string;
}

export function getBreadcrumbs(pathname: string): Crumb[] {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: Crumb[] = [];
  segments.forEach((_, index) => {
    const path = `/${segments.slice(0, index + 1).join('/')}`;
    const entry = crumbLabels.find(({ pattern }) => matchPath({ path: pattern, end: true }, path));
    if (entry) crumbs.push({ label: entry.label, path });
  });
  return crumbs;
}
