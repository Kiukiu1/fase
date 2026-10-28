import { createBrowserRouter } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import LoginPage from '../pages/auth/LoginPage'
import NotFoundPage from '../pages/errors/NotFoundPage'
import LeadDetailPage from '../pages/leads/LeadDetailPage'
import MyLeadsPage from '../pages/leads/MyLeadsPage'
import NotificationsPage from '../pages/notifications/NotificationsPage'
import PendingPage from '../pages/pending/PendingPage'
import ChangePasswordPage from '../pages/settings/ChangePasswordPage'
import { PATHS } from './paths'
import RequireAuth from './RequireAuth'

export const router = createBrowserRouter([
  { path: PATHS.login, element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: PATHS.home, element: <PendingPage /> },
          { path: PATHS.leads, element: <MyLeadsPage /> },
          { path: PATHS.leadDetail(':leadId'), element: <LeadDetailPage /> },
          { path: PATHS.notifications, element: <NotificationsPage /> },
          { path: PATHS.password, element: <ChangePasswordPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
