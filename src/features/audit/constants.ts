const CRUD = ['CREATED', 'UPDATED', 'DELETED'];
const withCrud = (prefix: string) => CRUD.map((suffix) => `${prefix}_${suffix}`);

/** Action names from API contract section 9. */
export const AUDIT_ACTIONS: string[] = [
  'AUTH_LOGIN',
  'AUTH_LOGIN_FAILED',
  'AUTH_LOGOUT',
  'AUTH_PASSWORD_CHANGED',
  'AUTH_PASSWORD_RESET',
  'USER_CREATED',
  'USER_UPDATED',
  'USER_ENABLED',
  'USER_DISABLED',
  'USER_PASSWORD_RESET',
  'USER_UNLOCKED',
  'USER_DELETED',
  ...withCrud('EMPLOYEE'),
  ...withCrud('DEPARTMENT'),
  ...withCrud('POSITION'),
  ...withCrud('MACHINE'),
  'MACHINE_STATUS_CHANGED',
  'MACHINE_IMAGE_UPDATED',
  'MACHINE_NOTE_ADDED',
  'MACHINE_OPERATORS_UPDATED',
  'WORK_ORDER_CREATED',
  'WORK_ORDER_UPDATED',
  'WORK_ORDER_STATUS_CHANGED',
  'ASSISTANT_MESSAGE',
];
