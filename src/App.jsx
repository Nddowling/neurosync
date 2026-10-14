import { Toaster as SonnerToaster } from "sonner";
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import KnowledgeBase from './pages/KnowledgeBase';
import Subscription from './pages/Subscription';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import CalendarPage from './pages/Calendar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import TermsOfServiceModal from '@/components/legal/TermsOfServiceModal';
import { useState, useEffect } from 'react';
import { neurosync } from '@/api/client';

const { Pages, Layout } = pagesConfig;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const TosGate = ({ children }) => {
  const [tosAccepted, setTosAccepted] = useState(null); // null=loading, true=accepted, false=needs acceptance
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) { setTosAccepted(true); return; } // don't gate unauthenticated
    neurosync.auth.me().then(user => {
      setTosAccepted(!!user?.tos_accepted_at);
    }).catch(() => setTosAccepted(false));
  }, [isAuthenticated]);

  const handleAccept = async () => {
    await neurosync.auth.updateMe({ tos_accepted_at: new Date().toISOString() });
    setTosAccepted(true);
  };

  const handleDecline = () => {
    neurosync.auth.logout();
  };

  if (tosAccepted === null) return null;
  if (tosAccepted === false) return <TermsOfServiceModal onAccept={handleAccept} onDecline={handleDecline} />;
  return <>{children}</>;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login, return to Dashboard after
      neurosync.auth.redirectToLogin(window.location.origin + "/Dashboard");
      return null;
    }
    return <div role="alert" className="p-8">Unable to load your session. Please reload to try again.</div>;
  }

  // Render the main app
  return (
    <TosGate>
    <Routes>
      {Object.entries(Pages).filter(([path]) => path !== "Landing").map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/KnowledgeBase" element={<LayoutWrapper currentPageName="KnowledgeBase"><KnowledgeBase /></LayoutWrapper>} />
      <Route path="/Subscription" element={<LayoutWrapper currentPageName="Subscription"><Subscription /></LayoutWrapper>} />
      <Route path="/Patients" element={<LayoutWrapper currentPageName="Patients"><Patients /></LayoutWrapper>} />
      <Route path="/PatientDetail" element={<LayoutWrapper currentPageName="Patients"><PatientDetail /></LayoutWrapper>} />
      <Route path="/Calendar" element={<LayoutWrapper currentPageName="Calendar"><CalendarPage /></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </TosGate>
  );
};

function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/Login" element={<Login />} />
            <Route path="/*" element={<AuthenticatedApp />} />
          </Routes>
        </Router>
        <Toaster />
        <SonnerToaster richColors />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App