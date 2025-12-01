import { Copy, Check, Trophy } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../contexts/ToastContext';

export default function LeagueBanner({ league, memberCount, totalTeams, userTeamsCount }) {
  const [copied, setCopied] = useState(false);
  const { success } = useToast();

  const copyInviteCode = async () => {
    if (league?.invite_code) {
      await navigator.clipboard.writeText(league.invite_code);
      setCopied(true);
      success('Invite code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-gradient-to-r from-emerald-900 via-green-800 to-teal-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Left Side - League Identity */}
          <div className="flex items-center gap-4 min-w-0 flex-1">
            {/* League Icon */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-primary-green-500" />
            </div>

            {/* League Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
                  {league?.name}
                </h1>
                {league?.is_commissioner && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-green-500/20 text-primary-green-500 text-xs font-semibold rounded">
                    <Trophy className="w-3 h-3" />
                    Commissioner
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 sm:gap-4 text-sm text-gray-300 mt-1">
                <span>{memberCount}/{league?.max_users} Members</span>
                <span>•</span>
                <span>{totalTeams} Teams</span>
                {league?.is_commissioner && league?.invite_code && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <button
                      onClick={copyInviteCode}
                      className="hidden sm:flex items-center gap-1.5 hover:text-primary-green-500 transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span className="font-mono font-semibold">{league.invite_code}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="font-mono font-semibold">{league.invite_code}</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Your Teams */}
          <div className="hidden sm:flex items-center gap-2 ml-4">
            <div className="text-right">
              <div className="text-xs text-gray-400 uppercase tracking-wide">Your Teams</div>
              <div className="text-2xl font-bold text-white">
                {userTeamsCount}<span className="text-gray-500">/{league?.max_teams_per_user}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: Invite Code */}
        {league?.is_commissioner && league?.invite_code && (
          <button
            onClick={copyInviteCode}
            className="sm:hidden flex items-center gap-2 mt-3 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors w-full"
          >
            <div className="text-left flex-1">
              <div className="text-xs text-gray-400">Invite Code</div>
              <div className="font-mono font-bold text-white">{league.invite_code}</div>
            </div>
            {copied ? (
              <Check className="w-5 h-5 text-primary-green-500" />
            ) : (
              <Copy className="w-5 h-5 text-gray-400" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
