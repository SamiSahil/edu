import { AuthProvider } from './context/AuthContext.jsx';
import { UIProvider } from './context/UIContext.jsx';
import { AppRouter } from './routes/AppRouter.jsx';

export default function App() {
  return (
    <UIProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </UIProvider>
  );
}