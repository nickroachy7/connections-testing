import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import LeaderboardWidget from '../components/LeaderboardWidget'
function Home() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen">
      {/* Hero CTA Section */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-green-500/5 via-transparent to-accent-orange-500/5"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="mb-6 leading-tight">
              WHERE DO YOU <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-green-500 to-primary-green-400">RANK?</span>
            </h1>
            
            <p className="text-xl text-primary-black-300 font-dk mb-10">
              Build your roster. Set your lineup. Beat the median. Climb the leaderboard.
            </p>
            
            {!user ? (
              <Link to="/signup" className="btn btn-lg inline-flex items-center gap-2">
                <span>🏆</span>
                <span>CREATE YOUR TEAM</span>
              </Link>
            ) : (
              <Link to="/dashboard" className="btn btn-lg inline-flex items-center gap-2">
                <span>⚡</span>
                <span>GO TO DASHBOARD</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Leaderboard Section */}
      <section className="pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <LeaderboardWidget
            userId={user?.id}
            compact={false}
            showFilters={true}
            limit={50}
            defaultSort="week"
          />

          {/* Call to Action for Non-Users */}
          {!user && (
            <div className="mt-8 text-center">
              <p className="text-primary-black-400 mb-4">
                Ready to compete?
              </p>
              <Link to="/signup" className="btn btn-lg">
                🏆 CREATE YOUR TEAM
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 border-t border-primary-black-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-primary-black-50 mb-8 text-center">
            How It Works
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-green-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎁</span>
              </div>
              <h3 className="text-lg font-bold text-primary-black-50 mb-2">
                Open Packs
              </h3>
              <p className="text-sm text-primary-black-400">
                Get player cards and build your roster
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent-orange-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚡</span>
              </div>
              <h3 className="text-lg font-bold text-primary-black-50 mb-2">
                Set Lineup
              </h3>
              <p className="text-sm text-primary-black-400">
                Choose your best players each week
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-green-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🏆</span>
              </div>
              <h3 className="text-lg font-bold text-primary-black-50 mb-2">
                Win Games
              </h3>
              <p className="text-sm text-primary-black-400">
                Beat the median score and climb the ranks
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
