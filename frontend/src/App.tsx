import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './context/ToastContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { MainLayout } from './components/layout/MainLayout';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const UserList = lazy(() => import('./pages/UserList').then((module) => ({ default: module.UserList })));
const WeatherQuery = lazy(() => import('./pages/WeatherQuery').then((module) => ({ default: module.WeatherQuery })));
const Settings = lazy(() => import('./pages/Settings').then((module) => ({ default: module.Settings })));
const NotFound = lazy(() => import('./pages/NotFound').then((module) => ({ default: module.NotFound })));

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } });

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NotificationsProvider>
        <ToastProvider>
          <BrowserRouter>
            <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><LoadingSpinner className="h-10 w-10" /></div>}>
            <Routes>
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="users" element={<UserList />} />
                <Route path="weather" element={<WeatherQuery />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </NotificationsProvider>
    </QueryClientProvider>
  );
}

export default App;
