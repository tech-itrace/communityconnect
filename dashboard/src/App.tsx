import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Members } from './pages/Members';
import { MemberForm } from './pages/MemberForm';
import { Settings } from './pages/Settings';
import { PhoneSetter } from './components/PhoneSetter';
import { useState } from 'react';
import { getUserPhone } from './lib/auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  const [hasPhone, setHasPhone] = useState(!!getUserPhone());

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* Phone setter for testing - will be replaced with login in Week 4 */}
        {!hasPhone && <PhoneSetter onPhoneSet={() => setHasPhone(true)} />}

        <Routes>
          <Route path="/" element={<Layout><Dashboard /></Layout>} />
          <Route path="/members" element={<Layout><Members /></Layout>} />
          <Route path="/members/:id" element={<Layout><MemberForm /></Layout>} />
          <Route path="/members/:id/edit" element={<Layout><MemberForm /></Layout>} />
          <Route path="/settings" element={<Layout><Settings /></Layout>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
