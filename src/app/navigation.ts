import type { ElementType } from 'react';
import { matchPath } from 'react-router-dom';
import {
  AccountTree,
  Badge,
  Engineering,
  Assignment,
  EventRepeat,
  People,
  ReceiptLong,
  SmartToy,
  SpaceDashboard,
} from '@mui/icons-material';
import type { UserRole } from '../types/api';

export interface NavItem {
  /** i18n key, translated at render time. */
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
    label: 'nav.groups.overview',
    items: [
      { label: 'nav.items.dashboard', path: '/dashboard', icon: SpaceDashboard },
      { label: 'nav.items.assistant', path: '/assistant', icon: SmartToy },
    ],
  },
  {
    label: 'nav.groups.maintenance',
    items: [
      { label: 'nav.items.machines', path: '/machines', icon: Engineering },
      { label: 'nav.items.workOrders', path: '/work-orders', icon: Assignment },
      {
        label: 'nav.items.maintenancePlans',
        path: '/maintenance-plans',
        icon: EventRepeat,
        roles: ['ADMIN', 'PRODUCTION_MANAGER'],
      },
    ],
  },
  {
    label: 'nav.groups.hr',
    items: [
      {
        label: 'nav.items.employees',
        path: '/hr/employees',
        icon: Badge,
        roles: ['ADMIN', 'HR_MANAGER'],
      },
      {
        label: 'nav.items.organization',
        path: '/hr/organization',
        icon: AccountTree,
        roles: ['ADMIN', 'HR_MANAGER'],
      },
    ],
  },
  {
    label: 'nav.groups.administration',
    items: [
      { label: 'nav.items.users', path: '/admin/users', icon: People, roles: ['ADMIN'] },
      {
        label: 'nav.items.auditLog',
        path: '/admin/audit-logs',
        icon: ReceiptLong,
        roles: ['ADMIN'],
      },
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

/** Breadcrumb i18n keys keyed by route pattern. */
const crumbLabels: Array<{ pattern: string; label: string }> = [
  { pattern: '/dashboard', label: 'nav.items.dashboard' },
  { pattern: '/assistant', label: 'nav.items.assistant' },
  { pattern: '/assistant/:conversationId', label: 'nav.crumbs.conversation' },
  { pattern: '/machines', label: 'nav.items.machines' },
  { pattern: '/machines/new', label: 'nav.crumbs.newMachine' },
  { pattern: '/machines/:id', label: 'nav.crumbs.details' },
  { pattern: '/machines/:id/edit', label: 'nav.crumbs.edit' },
  { pattern: '/work-orders', label: 'nav.items.workOrders' },
  { pattern: '/work-orders/:id', label: 'nav.crumbs.details' },
  { pattern: '/maintenance-plans', label: 'nav.items.maintenancePlans' },
  { pattern: '/hr/employees', label: 'nav.items.employees' },
  { pattern: '/hr/organization', label: 'nav.items.organization' },
  { pattern: '/admin/users', label: 'nav.items.users' },
  { pattern: '/admin/audit-logs', label: 'nav.items.auditLog' },
  { pattern: '/notifications', label: 'nav.crumbs.notifications' },
  { pattern: '/profile', label: 'nav.crumbs.profile' },
  { pattern: '/change-password', label: 'nav.crumbs.changePassword' },
  { pattern: '/403', label: 'nav.crumbs.forbidden' },
];

export interface Crumb {
  /** i18n key, translated at render time. */
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
