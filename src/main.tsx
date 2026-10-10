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
const ALPHA_CARS_TEST_ID = 'fc164652-0ee3-42ae-a8ef-a517a4b2b62f';

function resolveCompanyId(profileCompanyId?: string): string {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const param = (params.get('t') || params.get('company') || params.get('slug') || params.get('c') || params.get('id') || '').toLowerCase().trim();
    if (param === 'alphacars' || param === 'alpha' || param === ALPHA_CARS_TEST_ID.toLowerCase()) {
      return ALPHA_CARS_TEST_ID;
    }
    if (param === 'roma' || param === 'romacenter' || param === ROMA_CENTER_TEST_ID.toLowerCase()) {
      return ROMA_CENTER_TEST_ID;
    }
    if (param && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(param)) {
      return param;
    }
  }
  if (profileCompanyId) return profileCompanyId;
  return ROMA_CENTER_TEST_ID;
}

function VisionApp() {
  const { user, profile, loadingAuth } = useAuth();
  const [activeCompanyId, setActiveCompanyId] = useState<string>(() => resolveCompanyId(profile?.company_id));

  useEffect(() => {
    const resolved = resolveCompanyId(profile?.company_id);
    setActiveCompanyId(resolved);
  }, [profile?.company_id]);

  const { mechanics, refreshData } = useGarageStore(activeCompanyId);

  // Sync data on load and when activeCompanyId changes
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

  // If no user, show login - but we can still default to activeCompanyId for the store
  if (!user) {
    return <VisionLogin onLogin={() => window.location.reload()} />;
  }

  const isAlpha = activeCompanyId === ALPHA_CARS_TEST_ID;

  return (
    <div className="bg-black min-h-screen">
      <Toaster position="top-right" />
      <WaitingDashboard 
        companyId={activeCompanyId} 
        companyLogo={profile?.company_logo}
        companyName={profile?.company_name || (isAlpha ? 'Alpha Cars' : 'Roma Center')}
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
