import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useToast } from '../contexts/ToastContext';
import CreateLeagueModal from '../components/CreateLeagueModal';
import JoinLeagueModal from '../components/JoinLeagueModal';
import TeamMenuCard from '../components/TeamMenuCard';

export default function Leagues() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const { user, profile, teams, setTeams } = useOutletContext();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [deletingTeamId, setDeletingTeamId] = useState(null);

  // Filter to only private/franchise teams
  const privateTeams = (teams || []).filter(t => t.team_type === 'private');

  const handleSelectTeam = async (teamId) => {
    try {
      navigate(`/teams/${teamId}/starting-lineup`);
    } catch (err) {
      console.error('Error navigating to team:', err);
      showError('Failed to open team');
    }
  };

  const handleDeleteTeam = async (teamId, teamName) => {
    if (!confirm(`Are you sure you want to delete "${teamName}"? This cannot be undone.`)) {
      return;
    }

    try {
      setDeletingTeamId(teamId);
      
      const { error } = await supabase
        .from('teams')
        .update({ is_active: false })
        .eq('id', teamId);

      if (error) throw error;

      // Update local state
      setTeams(prev => prev.filter(t => t.id !== teamId));
      success(`Team "${teamName}" deleted`);
    } catch (err) {
      console.error('Error deleting team:', err);
      showError('Failed to delete team');
    } finally {
      setDeletingTeamId(null);
    }
  };

  const handleLeagueCreated = () => {
    success('League created successfully!');
    setShowCreateModal(false);
    // Reload the page to get updated teams list
    window.location.reload();
  };

  const handleLeagueJoined = () => {
    success('Joined league successfully!');
    setShowJoinModal(false);
    // Reload the page to get updated teams list
    window.location.reload();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Action Buttons - Create or Join League */}
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 font-bold rounded-xl transition-all duration-200 flex items-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Create League</span>
        </button>
        <button
          onClick={() => setShowJoinModal(true)}
          className="px-5 py-2.5 bg-primary-black-700 hover:bg-primary-black-600 text-white font-bold rounded-xl transition-all duration-200 border border-primary-black-600 flex items-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span>Join League</span>
        </button>
      </div>

      {/* Franchise Teams */}
      {privateTeams.length > 0 && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {privateTeams.map((team) => (
              <TeamMenuCard
                key={team.id}
                team={team}
                isActive={team.is_active}
                onClick={() => handleSelectTeam(team.id)}
                onDelete={handleDeleteTeam}
                showDelete={true}
                isDeleting={deletingTeamId === team.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Franchise Teams Message */}
      {privateTeams.length === 0 && (
        <div className="bg-primary-black-800 rounded-2xl border border-primary-black-700 p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-primary-black-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-primary-black-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Franchise Teams Yet</h3>
            <p className="text-primary-black-400 mb-6">
              Create your own private league to compete with friends, or join an existing league with an invite code.
            </p>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateLeagueModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleLeagueCreated}
        />
      )}
      {showJoinModal && (
        <JoinLeagueModal
          onClose={() => setShowJoinModal(false)}
          onSuccess={handleLeagueJoined}
        />
      )}
    </div>
  );
}
