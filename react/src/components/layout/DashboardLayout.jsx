import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';
import { MobileDrawer } from './MobileDrawer.jsx';
import { useUI } from '../../context/UIContext.jsx';
import { Toast } from '../ui/Toast.jsx';

export function DashboardLayout({ children }) {
  const { toasts } = useUI();

  return (
    <div className="min-h-screen bg-zinc-950 text-white lg:flex">
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-20 lg:block">
        <Sidebar />
      </div>
      <MobileDrawer />
      <div className="flex min-w-0 flex-1 flex-col lg:pl-[290px]">
        <Topbar />
        <main className="min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-6 lg:px-6">
          {children}
        </main>
      </div>
      <div className="fixed bottom-4 right-4 z-50 space-y-3">
        {toasts.map((toast) => <Toast key={toast.id} title={toast.title} message={toast.message} tone={toast.tone} />)}
      </div>
    </div>
  );
}