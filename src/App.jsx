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
  inventoryLoader
} from './utils/loaders'

// Lazy load pages for better performance
const Home = lazy(() => import('./pages/Home'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Players = lazy(() => import('./pages/Players'))
const PlayerProfile = lazy(() => import('./pages/PlayerProfile'))
const Games = lazy(() => import('./pages/Games'))
const Teams = lazy(() => import('./pages/Teams'))
const TeamProfile = lazy(() => import('./pages/TeamProfile'))
const Standings = lazy(() => import('./pages/Standings'))
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const Inventory = lazy(() => import('./pages/Inventory'))
const PackShop = lazy(() => import('./pages/PackShop'))
const TeamManager = lazy(() => import('./pages/TeamManager'))
const Leaderboard = lazy(() => import('./pages/Leaderboard'))
const NotFound = lazy(() => import('./pages/NotFound'))
const FantasyLayout = lazy(() => import('./components/FantasyLayout'))
const TeamsLayout = lazy(() => import('./components/TeamsLayout'))
const TeamSelection = lazy(() => import('./pages/TeamSelection'))
const PackOpening = lazy(() => import('./pages/PackOpening'))
const SimulatedSeason = lazy(() => import('./pages/SimulatedSeason'))

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
    <div className="min-h-screen bg-gradient-to-br from-primary-black-950 via-primary-black-900 to-primary-black-950 bg-pattern flex flex-col">
      <div className="relative z-10 flex-1 flex flex-col">
        <Header />
        {/* Add left padding on desktop to account for sidebar */}
        <main className="animate-fade-in flex-1 md:pl-64">
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
  {
    element: <RootLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        path: '/',
        element: <Home />
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
          }
        ]
      },
      // Simulated Season Page
      {
        path: '/fantasy/simulated/:seasonId',
        element: <SimulatedSeason />
      },
      // Pack Opening Page
      {
        path: '/teams/:teamId/open-pack/:packId',
        element: <PackOpening />
      },
      // Fantasy routes - wrapped in FantasyLayout for persistent banner
      // Now team-specific with :teamId parameter
      {
        path: '/teams/:teamId',
        element: <FantasyLayout />,
        loader: teamManagerLoader,
        children: [
          {
            path: 'dashboard',
            element: <Dashboard />
          },
          {
            path: 'manage-team',
            element: <Inventory />
          },
          {
            path: 'pack-shop',
            element: <PackShop />
          },
          {
            path: 'starting-lineup',
            element: <TeamManager />
          },
          {
            path: 'leaderboard',
            element: <Leaderboard />
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
        path: '/teams',
        element: <Teams />
      },
      {
        path: '/teams/:id',
        element: <TeamProfile />
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
