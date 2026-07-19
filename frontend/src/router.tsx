import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { IndexRedirect } from './pages/IndexRedirect'
import { OnboardingPage } from './pages/OnboardingPage'
import { OrchestrationPage } from './pages/OrchestrationPage'
import { DashboardPage } from './pages/DashboardPage'
import { DebtPlannerPage } from './pages/DebtPlannerPage'
import { SavingsPage } from './pages/SavingsPage'
import { BudgetPage } from './pages/BudgetPage'
import { CoachChatPage } from './pages/CoachChatPage'
import { DocumentsPage } from './pages/DocumentsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <IndexRedirect /> },
      { path: 'onboarding', element: <OnboardingPage /> },
      { path: 'orchestration', element: <OrchestrationPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'debt', element: <DebtPlannerPage /> },
      { path: 'savings', element: <SavingsPage /> },
      { path: 'budget', element: <BudgetPage /> },
      { path: 'chat', element: <CoachChatPage /> },
      { path: 'documents', element: <DocumentsPage /> },
    ],
  },
])
