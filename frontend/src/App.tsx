import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './context/ToastContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { MainLayout } from './components/layout/MainLayout';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const UserList = lazy(() => import('./pages/UserList').then((module) => ({ default: module.UserList })));
const WeatherQuery = lazy(() => import('./pages/WeatherQuery').then((module) => ({ default: module.WeatherQuery })));
const Settings = lazy(() => import('./pages/Settings').then((module) => ({ default: module.Settings })));
const Login = lazy(() => import('./pages/Login').then((module) => ({ default: module.Login })));
const Register = lazy(() => import('./pages/Register').then((module) => ({ default: module.Register })));
const NotFound = lazy(() => import('./pages/NotFound').then((module) => ({ default: module.NotFound })));

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } });

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><LoadingSpinner className="h-10 w-10" /></div>}>
              <Routes>
                <Route element={<GuestOnlyRoute />}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                </Route>
                <Route path="/" element={<ProtectedApp />}>
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
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

function ProtectedApp() {
  const auth = useAuth();
  if (auth.isLoading) return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner className="h-10 w-10" /></div>;
  if (!auth.isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <NotificationsProvider>
      <MainLayout />
    </NotificationsProvider>
  );
}

function GuestOnlyRoute() {
  const auth = useAuth();
  if (auth.isLoading) return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner className="h-10 w-10" /></div>;
  if (auth.isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
}
