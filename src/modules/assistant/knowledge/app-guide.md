# MetalWorks app guide

MetalWorks manages the staff and the machines of a metal manufacturing plant. Roles: ADMIN, HR_MANAGER, PRODUCTION_MANAGER, MAINTENANCE_TECH, EMPLOYEE. Each person only sees the pages of their role.

## Pages

- **Dashboard** (`/dashboard`, everyone): ADMIN sees plant KPIs (users, machines by status, work orders by priority, employees by department, overdue maintenance, recent status changes). Other roles see "my dashboard": their open work orders, machines in breakdown, overdue maintenance, unread notifications; HR managers also see headcount and people on leave.
- **Machines** (`/machines`, everyone can read): searchable list (status, type, location). The detail page shows specs, photo, status history, maintenance notes, authorized operators and the machine's work orders.
- **Work orders** (`/work-orders`, everyone; employees only see orders assigned to them): list with "All" and "Assigned to me" tabs, filters, and a board view. The detail page has Start, Resume and Close actions.
- **Maintenance plans** (`/maintenance-plans`, ADMIN and PRODUCTION_MANAGER): recurring preventive tasks per machine with a frequency in days and a next due date.
- **Employees** (`/hr/employees`, ADMIN and HR_MANAGER): employee records with department, position and status (ACTIVE, ON_LEAVE, SUSPENDED, TERMINATED).
- **Organization** (`/hr/organization`, ADMIN and HR_MANAGER): departments and positions with their employee counts.
- **Users** (`/admin/users`, ADMIN): application accounts, roles, enable/disable, unlock, password reset.
- **Audit log** (`/admin/audit-logs`, ADMIN): who did what and when.
- **Notifications** (bell in the top bar): breakdowns, machines put out of service, work orders assigned to you, maintenance due.
- **Profile** (avatar menu): personal details and "Change password".
- **Assistant** (`/assistant` or the round button at the bottom right): this chat.

## Machine statuses

OPERATIONAL, SCHEDULED_MAINTENANCE, UNDER_MAINTENANCE, BREAKDOWN, OUT_OF_SERVICE. Allowed changes: OPERATIONAL → any other status; SCHEDULED_MAINTENANCE → UNDER_MAINTENANCE or OPERATIONAL; UNDER_MAINTENANCE → OPERATIONAL or BREAKDOWN; BREAKDOWN → UNDER_MAINTENANCE, OPERATIONAL or OUT_OF_SERVICE; OUT_OF_SERVICE → UNDER_MAINTENANCE or OPERATIONAL (ADMIN only). A comment is required for BREAKDOWN and OUT_OF_SERVICE. Finishing a maintenance (UNDER_MAINTENANCE → OPERATIONAL) records the maintenance date and schedules the next one.

## How to

- **Change a machine status** (ADMIN, PRODUCTION_MANAGER, MAINTENANCE_TECH): Machines → open the machine → "Change status" → pick the new status → add a comment (required for breakdown / out of service) → Save. Admins and production managers are notified of breakdowns.
- **Add a maintenance note** (same roles): machine detail → Notes → write the note → Add.
- **Create a work order** (ADMIN, PRODUCTION_MANAGER, MAINTENANCE_TECH): Work orders → "New work order" (or "Create work order" on a machine page) → choose the machine, type (PREVENTIVE or CORRECTIVE), priority (LOW, MEDIUM, HIGH, CRITICAL), description and optionally an assignee → Create. The assignee is notified. Not possible for an out-of-service machine.
- **Work on a work order**: OPEN → Start (IN_PROGRESS) → Close (DONE). Closing requires a resolution; cost and parts used are optional. A closed order cannot be edited.
- **Generate a work order from a plan** (ADMIN, PRODUCTION_MANAGER): Maintenance plans → "Generate work order" on the plan row. The plan's next due date moves forward by its frequency.
- **Add an employee** (ADMIN, HR_MANAGER): Employees → "New employee" → matricule, first and last name, hire date (required), department, position → Save.
- **Create a user account** (ADMIN): Users → "New user" → full name, e-mail, role, optional linked employee → Create. The temporary password is e-mailed, or shown once if e-mail is not configured. The user must change it at first login.
- **Reset a password** (ADMIN): Users → row menu → "Reset password". For your own password: Profile → "Change password", or "Forgot password?" on the login page.
- **Unlock an account** (ADMIN): Users → row menu → "Unlock". Accounts lock for 15 minutes after 5 failed logins.
- **Delete a department or position** (ADMIN, HR_MANAGER): Organization → delete; only possible when it has no employees.
