import { useOutletContext } from 'react-router-dom';
import { Trophy, Target, Calendar, DollarSign } from 'lucide-react';

export default function Contests() {
  const { activeTeam } = useOutletContext();

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl p-8 md:p-12 border border-primary-black-700 text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-primary-green-500/10 rounded-full flex items-center justify-center">
            <Trophy className="w-12 h-12 text-primary-green-500" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Contests Coming Soon
        </h1>

        {/* Description */}
        <p className="text-lg text-primary-black-300 mb-8 max-w-2xl mx-auto">
          Get ready to compete in public contests! Soon you'll be able to enter your team into various contest formats including free-to-play and paid entry competitions.
        </p>

        {/* Feature Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto mb-8">
          <div className="bg-primary-black-900/50 rounded-lg p-6 text-left">
            <Target className="w-8 h-8 text-primary-green-500 mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Multiple Contest Types</h3>
            <p className="text-primary-black-400">
              Choose from various contest formats - weekly, seasonal, and special events
            </p>
          </div>

          <div className="bg-primary-black-900/50 rounded-lg p-6 text-left">
            <DollarSign className="w-8 h-8 text-primary-green-500 mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Free & Paid Entry</h3>
            <p className="text-primary-black-400">
              Compete in free contests or enter paid competitions for bigger prizes
            </p>
          </div>

          <div className="bg-primary-black-900/50 rounded-lg p-6 text-left">
            <Trophy className="w-8 h-8 text-primary-green-500 mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Elimination System</h3>
            <p className="text-primary-black-400">
              Use your elimination lives strategically to survive and win
            </p>
          </div>

          <div className="bg-primary-black-900/50 rounded-lg p-6 text-left">
            <Calendar className="w-8 h-8 text-primary-green-500 mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Ongoing Competitions</h3>
            <p className="text-primary-black-400">
              Join contests throughout the season with fresh challenges every week
            </p>
          </div>
        </div>

        {/* Team Info */}
        <div className="bg-primary-black-900/30 rounded-lg p-6 max-w-md mx-auto">
          <div className="text-primary-black-400 text-sm mb-2">Current Team</div>
          <div className="text-2xl font-bold text-white mb-3">{activeTeam?.team_name}</div>
          <div className="text-sm text-primary-black-400">
            This team will be ready to enter contests when they launch
          </div>
        </div>
      </div>
    </div>
  );
}
