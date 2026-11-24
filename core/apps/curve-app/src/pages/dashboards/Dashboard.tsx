import { useUserStore } from '../../stores/user.store';
import PayeeDashboard from './payee/PayeeDashboard';
import ClientDashboard from './client/ClientDashboard';

export const Dashboard = () => {
  const { userType } = useUserStore();

  return (
    <div className="flex-1 flex flex-col">
      {userType === 'payee' ? <PayeeDashboard /> : <ClientDashboard />}
    </div>
  );
};

export default Dashboard;
