import { useAuthStore } from '../../store/authStore';
import { AdminDashboard } from './AdminDashboard';
import { MyDashboard } from './MyDashboard';

export function DashboardPage() {
  const role = useAuthStore((state) => state.user?.role);
  return role === 'ADMIN' ? <AdminDashboard /> : <MyDashboard />;
}
