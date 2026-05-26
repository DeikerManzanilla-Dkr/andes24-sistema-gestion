import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { Billing } from './pages/Billing';
import { Documents } from './pages/Documents';
import { QRCodes } from './pages/QRCodes';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Verify } from './pages/Verify';
import { Verification } from './pages/Verification';
import { CRM } from './pages/CRM';
import { Login } from './pages/Login';
import { ThemeProvider } from './context/ThemeContext';
import { RealtimeProvider } from './context/RealtimeProvider';
import { ExchangeRateProvider } from './context/ExchangeRateContext';
import { useAuth } from './context/AuthContext';

function App() {
  const { session, loading: authLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const pageFromPath = (path: string) => {
    // Handle dynamic route for verification
    if (path.startsWith('/verificar/')) {
      return 'verification';
    }
    
    switch (path) {
      case '/':
      case '/dashboard':
        return 'dashboard';
      case '/clients':
        return 'clients';
      case '/billing':
        return 'billing';
      case '/documents':
        return 'documents';
      case '/qrcodes':
        return 'qrcodes';
      case '/crm':
        return 'crm';
      case '/reports':
        return 'reports';
      case '/settings':
        return 'settings';
      case '/verify':
        return 'verify';
      default:
        return 'dashboard';
    }
  };

  const [currentPage, setCurrentPage] = useState(() => pageFromPath(window.location.pathname));

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPage(pageFromPath(path));
  };

  useEffect(() => {
    const onPopState = () => {
      setCurrentPage(pageFromPath(window.location.pathname));
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const sidebarPage = useMemo(() => {
    return currentPage === 'verify' || currentPage === 'verification' ? 'dashboard' : currentPage;
  }, [currentPage]);
  
  const renderPage = () => {
    if (currentPage !== 'verify' && currentPage !== 'verification') {
      if (authLoading) {
        return (
          <div className="container mx-auto">
            <p className="text-gray-600 dark:text-gray-400">Cargando sesión...</p>
          </div>
        );
      }
      if (!session) return <Login />;
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'clients':
        return <Clients />;
      case 'billing':
        return <Billing />;
      case 'documents':
        return <Documents />;
      case 'qrcodes':
        return <QRCodes />;
      case 'crm':
        return <CRM />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      case 'verify':
        return <Verify />;
      case 'verification':
        return <Verification />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ThemeProvider>
      {session ? (
        <RealtimeProvider>
          <ExchangeRateProvider>
            <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
              <Sidebar 
                currentPage={sidebarPage} 
                setCurrentPage={(page) => {
                  navigate(`/${page === 'dashboard' ? '' : page}`);
                  setIsSidebarOpen(false);
                }} 
                isOpen={isSidebarOpen}
                onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
              />
              <div className="flex flex-col flex-1 overflow-hidden">
                <Header isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
                <main className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">{renderPage()}</main>
              </div>
            </div>
          </ExchangeRateProvider>
        </RealtimeProvider>
      ) : (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">{renderPage()}</main>
        </div>
      )}
    </ThemeProvider>
  );
}

export default App;