import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useGarageStore } from '@/hooks/useGarageStore';
import { WaitingDashboard } from './components/WaitingDashboard';
import { VisionLogin } from './components/VisionLogin';
import { Loader2 } from 'lucide-react';
import '@/index.css';

const ROMA_CENTER_TEST_ID = '126366f1-3f4a-4690-ac9d-aafe141bd46f';

function VisionApp() {
  const { user, profile, loadingAuth } = useAuth();
  // SIEMPRE usar Roma Center ID para esta pantalla pública — no depender del perfil logueado
  const activeCompanyId = ROMA_CENTER_TEST_ID;
  const { mechanics, refreshData } = useGarageStore(activeCompanyId);

  // Sync data on load
  useEffect(() => {
    if (activeCompanyId) {
      refreshData();
    }
  }, [activeCompanyId, refreshData]);

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-yellow-400 animate-spin" />
      </div>
    );
  }

  // If no user, show login - but we can still default to Roma Center ID for the store
  if (!user) {
    return <VisionLogin onLogin={() => window.location.reload()} />;
  }

  return (
    <div className="bg-black min-h-screen">
      <Toaster position="top-right" />
      <WaitingDashboard 
        companyId={activeCompanyId} 
        companyLogo={profile?.company_logo}
        companyName={profile?.company_name || 'Roma Center'}
        mechanics={mechanics}
      />
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <VisionApp />
    </StrictMode>
  );
}
