import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import KnowledgeBase from './pages/KnowledgeBase';
import Subscription from './pages/Subscription';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import TermsOfServiceModal from '@/components/legal/TermsOfServiceModal';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const TosGate = ({ children }) => {
  const [tosAccepted, setTosAccepted] = useState(null); // null=loading, true=accepted, false=needs acceptance
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) { setTosAccepted(true); return; } // don't gate unauthenticated
    base44.auth.me().then(user => {
      setTosAccepted(!!user?.tos_accepted_at);
    }).catch(() => setTosAccepted(true));
  }, [isAuthenticated]);

  const handleAccept = async () => {
    await base44.auth.updateMe({ tos_accepted_at: new Date().toISOString() });
    setTosAccepted(true);
  };

  const handleDecline = () => {
    base44.auth.logout();
  };

  if (tosAccepted === null) return null;
  if (tosAccepted === false) return <TermsOfServiceModal onAccept={handleAccept} onDecline={handleDecline} />;
  return children;
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
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
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
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App