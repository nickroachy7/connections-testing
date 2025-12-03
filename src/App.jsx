import { createBrowserRouter, RouterProvider, Outlet, redirect } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './contexts/ToastContext'
import LoadingSpinner from './components/LoadingSpinner'
import Header from './components/Header'
import Footer from './components/Footer'
import {
  dashboardLoader,
  teamManagerLoader,
  playersLoader,
  leaderboardLoader,
  inventoryLoader,
  viewTeamLoader
} from './utils/loaders'

// Lazy load pages for better performance
const Players = lazy(() => import('./pages/Players'))
const PlayerProfile = lazy(() => import('./pages/PlayerProfile'))
const Games = lazy(() => import('./pages/Games'))
const Standings = lazy(() => import('./pages/Standings'))
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const Inventory = lazy(() => import('./pages/Inventory'))
const Market = lazy(() => import('./pages/Market'))
const TeamManager = lazy(() => import('./pages/TeamManager'))
const Leaderboard = lazy(() => import('./pages/Leaderboard'))
const NotFound = lazy(() => import('./pages/NotFound'))
const FantasyLayout = lazy(() => import('./components/FantasyLayout'))
const TeamsLayout = lazy(() => import('./components/TeamsLayout'))
const TeamSelection = lazy(() => import('./pages/TeamSelection'))
const PackOpening = lazy(() => import('./pages/PackOpening'))
const SimulatedSeason = lazy(() => import('./pages/SimulatedSeason'))
const Activity = lazy(() => import('./pages/Activity'))
const ViewTeam = lazy(() => import('./pages/ViewTeam'))
const Leagues = lazy(() => import('./pages/Leagues'))
const TeamInfo = lazy(() => import('./pages/TeamInfo'))
const Contests = lazy(() => import('./pages/Contests'))
const TeamLeague = lazy(() => import('./pages/TeamLeague'))

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size="lg" message="Loading..." />
    </div>
  )
}

// Root layout component
function RootLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-black-950 via-primary-black-900 to-primary-black-950 bg-pattern flex flex-col overflow-x-hidden">
      <div className="relative z-10 flex-1 flex flex-col">
        <Header />
        {/* Add left padding on desktop to account for sidebar */}
        <main className="animate-fade-in flex-1 md:pl-64 overflow-x-hidden">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
        <Footer />
      </div>
    </div>
  )
}

// Create router with loaders
const router = createBrowserRouter([
  // Pack Opening Page - Completely standalone (no layout wrapper)
  {
    path: '/teams/:teamId/open-pack/:packId',
    element: (
      <Suspense fallback={<PageLoader />}>
        <PackOpening />
      </Suspense>
    )
  },
  {
    element: <RootLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        path: '/',
        loader: async () => {
          return redirect('/fantasy');
        }
      },
      {
        path: '/login',
        element: <Login />
      },
      {
        path: '/signup',
        element: <Signup />
      },
      // Team Selection - wrapped in TeamsLayout for persistent banner
      {
        path: '/fantasy',
        element: <TeamsLayout />,
        loader: dashboardLoader,
        children: [
          {
            index: true,
            element: <TeamSelection />
          },
          {
            path: 'leagues',
            element: <Leagues />
          }
        ]
      },
      // Simulated Season Page
      {
        path: '/fantasy/simulated/:seasonId',
        element: <SimulatedSeason />
      },
      // View Team Page - Read-only view wrapped in FantasyLayout
      {
        path: '/teams/:teamId/view',
        element: <FantasyLayout />,
        loader: viewTeamLoader,
        children: [
          {
            index: true,
            element: <ViewTeam />
          }
        ]
      },
      // Fantasy routes - wrapped in FantasyLayout for persistent banner
      // Now team-specific with :teamId parameter
      {
        path: '/teams/:teamId',
        element: <FantasyLayout />,
        loader: teamManagerLoader,
        // Prevent loader from rerunning when navigating between child routes (inventory, lineup, etc.)
        // Only revalidate when teamId changes or when explicitly requested
        shouldRevalidate: ({ currentParams, nextParams, defaultShouldRevalidate, formAction }) => {
          // Always revalidate on form submissions
          if (formAction) return true;
          // Revalidate if teamId changes
          if (currentParams.teamId !== nextParams.teamId) return true;
          // Don't revalidate when just switching between child routes
          return false;
        },
        children: [
          {
            index: true,
            element: <TeamManager />
          },
          {
            path: 'starting-lineup',
            element: <TeamManager />
          },
          {
            path: 'inventory',
            element: <Inventory />
          },
          {
            path: 'market',
            element: <Market />
          },
          {
            path: 'info',
            element: <TeamInfo />
          },
          {
            path: 'contests',
            element: <Contests />
          },
          {
            path: 'league',
            element: <TeamLeague />
          },
          {
            path: 'activity',
            element: <Activity />
          },
          {
            path: 'leaderboard',
            element: <Leaderboard />
          },
          {
            path: 'dashboard',
            loader: async () => {
              return redirect('starting-lineup');
            }
          },
          {
            path: 'manage-team',
            loader: async () => {
              return redirect('inventory');
            }
          }
        ]
      },
      // Legacy route redirect - redirect to team selection
      {
        path: '/dashboard',
        loader: async () => {
          return redirect('/fantasy');
        }
      },
      {
        path: '/manage-team',
        loader: async () => {
          return redirect('/fantasy');
        }
      },
      {
        path: '/pack-shop',
        loader: async () => {
          return redirect('/fantasy');
        }
      },
      {
        path: '/starting-lineup',
        loader: async () => {
          return redirect('/fantasy');
        }
      },
      {
        path: '/players',
        element: <Players />,
        loader: playersLoader
      },
      {
        path: '/players/:id',
        element: <PlayerProfile />
      },
      {
        path: '/games',
        element: <Games />
      },
      {
        path: '/standings',
        element: <Standings />
      },
      {
        path: '*',
        element: <NotFound />
      }
    ]
  }
])

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App
