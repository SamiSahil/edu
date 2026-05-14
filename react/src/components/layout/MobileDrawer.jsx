import { Drawer } from '../ui/Drawer.jsx';
import { Sidebar } from './Sidebar.jsx';
import { useUI } from '../../context/UIContext.jsx';

export function MobileDrawer() {
  const { sidebarOpen, closeSidebar } = useUI();
  return (
    <Drawer open={sidebarOpen} onClose={closeSidebar} placement="left" width="w-[290px]" chrome={false}>
      <Sidebar />
    </Drawer>
  );
}