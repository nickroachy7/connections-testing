import { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  Calendar, TrendingUp, Award, Package, Coins, Heart, 
  CheckCircle, XCircle, ChevronDown, ChevronUp, Settings, Camera, Palette, Trash2
} from 'lucide-react';

const BANNER_THEMES = [
  { id: 'default', name: 'Classic Dark', bg: 'bg-dk-black-secondary', preview: 'linear-gradient(to right, #1a1a1a, #1a1a1a)' },
  { id: 'ocean', name: 'Ocean Blue', bg: 'bg-gradient-to-r from-blue-900 via-blue-800 to-cyan-900', preview: 'linear-gradient(to right, rgb(30, 58, 138), rgb(30, 64, 175), rgb(22, 78, 99))' },
  { id: 'forest', name: 'Forest Green', bg: 'bg-gradient-to-r from-emerald-900 via-green-800 to-teal-900', preview: 'linear-gradient(to right, rgb(6, 78, 59), rgb(22, 101, 52), rgb(19, 78, 74))' },
  { id: 'sunset', name: 'Sunset Orange', bg: 'bg-gradient-to-r from-orange-900 via-red-900 to-pink-900', preview: 'linear-gradient(to right, rgb(124, 45, 18), rgb(127, 29, 29), rgb(131, 24, 67))' },
  { id: 'purple', name: 'Royal Purple', bg: 'bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900', preview: 'linear-gradient(to right, rgb(88, 28, 135), rgb(107, 33, 168), rgb(49, 46, 129))' },
  { id: 'crimson', name: 'Fire Red', bg: 'bg-gradient-to-r from-red-900 via-orange-900 to-yellow-900', preview: 'linear-gradient(to right, rgb(127, 29, 29), rgb(124, 45, 18), rgb(113, 63, 18))' },
  { id: 'midnight', name: 'Midnight Blue', bg: 'bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950', preview: 'linear-gradient(to right, rgb(15, 23, 42), rgb(23, 37, 84), rgb(35, 31, 81))' },
  { id: 'emerald', name: 'Emerald Dream', bg: 'bg-gradient-to-r from-emerald-900 via-green-800 to-lime-900', preview: 'linear-gradient(to right, rgb(6, 78, 59), rgb(22, 101, 52), rgb(54, 83, 20))' },
  { id: 'rose', name: 'Rose Gold', bg: 'bg-gradient-to-r from-pink-900 via-rose-800 to-red-900', preview: 'linear-gradient(to right, rgb(131, 24, 67), rgb(159, 18, 57), rgb(127, 29, 29))' },
  { id: 'arctic', name: 'Arctic Ice', bg: 'bg-gradient-to-r from-cyan-900 via-blue-900 to-indigo-900', preview: 'linear-gradient(to right, rgb(22, 78, 99), rgb(30, 58, 138), rgb(49, 46, 129))' }
];

export default function TeamInfo() {
  const { activeTeam, inventory, refetchTeamData } = useOutletContext();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [weeklyHistory, setWeeklyHistory] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [showAllWeeks, setShowAllWeeks] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Customization state
  const [editedName, setEditedName] = useState(activeTeam?.team_name || '');
  const [teamImage, setTeamImage] = useState(activeTeam?.team_image_url || null);
  const [selectedTheme, setSelectedTheme] = useState('forest');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customError, setCustomError] = useState(null);
  const [showThemes, setShowThemes] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (activeTeam) {
      loadTeamData();
    }
  }, [activeTeam?.id]);
  // Initialize customization state from activeTeam
  useEffect(() => {
    if (activeTeam) {
      setEditedName(activeTeam.team_name || '');
      setTeamImage(activeTeam.team_image_url || null);
      // Load theme from database, fallback to localStorage for backwards compatibility
      setSelectedTheme(activeTeam.banner_theme || localStorage.getItem(`bannerTheme_${activeTeam.id}`) || 'forest');
    }
  }, [activeTeam?.id, activeTeam?.team_name, activeTeam?.team_image_url, activeTeam?.banner_theme]);

  const loadTeamData = async () => {
    try {
      setLoading(true);

      // Load weekly performance history
      const { data: weeklyData, error: weeklyError } = await supabase
        .from('weekly_lineups')
        .select('week, total_points, beat_median, created_at')
        .eq('team_id', activeTeam.id)
        .order('week', { ascending: false });

      if (!weeklyError && weeklyData) {
        setWeeklyHistory(weeklyData);
      }

      // Load recent transactions for activity
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('team_id', activeTeam.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!txError) {
        setRecentActivity(transactions || []);
      }
    } catch (error) {
      console.error('Error loading team info:', error);
    } finally {
      setLoading(false);
    }
  };

  // Image upload handler
  const handleImageSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setCustomError('Please select an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setCustomError('Image must be less than 2MB');
      return;
    }

    try {
      setUploading(true);
      setCustomError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${activeTeam.id}-${Date.now()}.${fileExt}`;

      // Delete old image if exists
      if (teamImage) {
        const oldPath = teamImage.split('/').slice(-2).join('/');
        await supabase.storage.from('team-images').remove([oldPath]);
      }

      // Upload new image
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('team-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('team-images')
        .getPublicUrl(uploadData.path);

      // Update database
      const { error: updateError } = await supabase
        .from('teams')
        .update({ team_image_url: publicUrl })
        .eq('id', activeTeam.id);

      if (updateError) throw updateError;
      
      setTeamImage(publicUrl);
      success('Team photo updated');
      if (refetchTeamData) refetchTeamData();
    } catch (err) {
      console.error('Error uploading image:', err);
      setCustomError(err.message || 'Failed to upload image');
      showError('Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Save team name handler
  const handleSaveName = async () => {
    if (!editedName.trim() || editedName === activeTeam?.team_name) return;
    
    try {
      setSaving(true);
      setCustomError(null);

      const { error: nameError } = await supabase
        .from('teams')
        .update({ team_name: editedName.trim() })
        .eq('id', activeTeam.id);
      
      if (nameError) throw nameError;
      success('Team name saved');
      if (refetchTeamData) refetchTeamData();
    } catch (err) {
      console.error('Error saving team name:', err);
      setCustomError(err.message || 'Failed to save team name');
      showError('Failed to save team name');
    } finally {
      setSaving(false);
    }
  };

  // Theme change handler - saves to database
  const handleThemeChange = async (themeId) => {
    setSelectedTheme(themeId);
    
    // Save to database
    try {
      const { error } = await supabase
        .from('teams')
        .update({ banner_theme: themeId })
        .eq('id', activeTeam.id);
      
      if (error) {
        console.error('Error saving theme:', error);
        showError('Failed to save theme');
      } else {
        // Also update localStorage for backwards compatibility
        localStorage.setItem(`bannerTheme_${activeTeam.id}`, themeId);
        if (refetchTeamData) refetchTeamData();
      }
    } catch (err) {
      console.error('Error saving theme:', err);
    }
  };

  // Delete team handler
  const handleDeleteTeam = async () => {
    if (!confirm(`Are you sure you want to delete "${activeTeam.team_name}"? This will permanently delete all players, tokens, lineups, and data associated with this team.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_team', {
        p_team_id: activeTeam.id,
        p_user_id: user.id
      });

      if (error) throw error;

      success(`Team "${activeTeam.team_name}" has been deleted`);
      
      // Navigate back to team selection
      navigate('/fantasy');
    } catch (error) {
      console.error('Error deleting team:', error);
      showError(error.message || 'Failed to delete team');
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate roster stats from inventory
  const rosterStats = {
    totalPlayers: inventory?.players?.length || 0,
    totalValue: inventory?.players?.reduce((sum, p) => sum + (p.player_card?.quick_sell_value || 0), 0) || 0,
    byTier: {
      role_player: inventory?.players?.filter(p => p.player_card?.tier === 'role_player').length || 0,
      starter: inventory?.players?.filter(p => p.player_card?.tier === 'starter').length || 0,
      all_star: inventory?.players?.filter(p => p.player_card?.tier === 'all_star').length || 0,
      superstar: inventory?.players?.filter(p => p.player_card?.tier === 'superstar').length || 0,
      mvp: inventory?.players?.filter(p => p.player_card?.tier === 'mvp').length || 0,
    },
    tokens: inventory?.tokens?.length || 0,
  };

  const formatTransactionType = (type) => {
    const typeMap = {
      pack_purchase: 'Pack Purchase',
      quick_sell: 'Quick Sell',
      starter_pack: 'Starter Pack',
      reward: 'Reward',
      week_win: 'Week Win Bonus',
      week_loss: 'Week Loss',
      free_agent_claim: 'Free Agent Claim'
    };
    return typeMap[type] || type;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getTierColor = (tier) => {
    const colors = {
      role_player: 'text-gray-400',
      starter: 'text-green-400',
      all_star: 'text-blue-400',
      superstar: 'text-purple-400',
      mvp: 'text-yellow-400',
    };
    return colors[tier] || 'text-gray-400';
  };

  const getTierLabel = (tier) => {
    const labels = {
      role_player: 'Role Player',
      starter: 'Starter',
      all_star: 'All-Star',
      superstar: 'Superstar',
      mvp: 'MVP',
    };
    return labels[tier] || tier;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" message="Loading team info..." />
      </div>
    );
  }

  const displayedWeeks = showAllWeeks ? weeklyHistory : weeklyHistory.slice(0, 5);
  const winRate = activeTeam.wins + activeTeam.losses > 0 
    ? ((activeTeam.wins / (activeTeam.wins + activeTeam.losses)) * 100).toFixed(0)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      
      {/* Team Settings / Customization Section */}
      <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-primary-black-700">
        <h2 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary-green-500" />
          Team Settings
        </h2>

        {customError && (
          <div className="mb-4 bg-red-500/10 border border-red-500/50 rounded-lg p-3">
            <p className="text-red-400 text-sm">{customError}</p>
          </div>
        )}

        {/* Team Name */}
        <div className="mb-5">
          <label className="block text-sm font-bold text-white mb-2">
            Team Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              maxLength={30}
              className="flex-1 px-4 py-2.5 bg-primary-black-900/50 border border-primary-black-600 rounded-lg text-white focus:border-primary-green-500 focus:outline-none transition-colors text-sm"
              placeholder="Enter team name..."
            />
            <button
              onClick={handleSaveName}
              disabled={saving || !editedName.trim() || editedName === activeTeam?.team_name}
              className="px-4 py-2.5 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
          <p className="text-xs text-primary-black-400 mt-1">
            {editedName.length}/30 characters
          </p>
        </div>

        {/* Team Photo */}
        <div className="mb-5">
          <label className="block text-sm font-bold text-white mb-2">
            Team Photo
          </label>
          <div className="flex items-center gap-4">
            {/* Current Image Preview */}
            <div className="flex-shrink-0">
              {teamImage ? (
                <img
                  src={teamImage}
                  alt="Team"
                  className="w-20 h-20 rounded-lg object-cover border-2 border-primary-black-600"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-primary-black-900/50 border-2 border-primary-black-600 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-primary-black-400" />
                </div>
              )}
            </div>

            {/* Upload Button */}
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full px-4 py-2.5 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>Upload Photo</span>
                  </>
                )}
              </button>
              <p className="text-xs text-primary-black-400 mt-1">
                JPG, PNG, or GIF • Max 2MB
              </p>
            </div>
          </div>
        </div>

        {/* Banner Theme */}
        <div>
          <button
            onClick={() => setShowThemes(!showThemes)}
            className="w-full flex items-center justify-between text-sm font-bold text-white mb-2 py-2 px-3 bg-primary-black-900/30 rounded-lg hover:bg-primary-black-900/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary-green-500" />
              Banner Theme
            </span>
            <div className="flex items-center gap-2">
              <span className="text-primary-black-400 text-xs">
                {BANNER_THEMES.find(t => t.id === selectedTheme)?.name || 'Forest Green'}
              </span>
              {showThemes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>
          
          {showThemes && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              {BANNER_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleThemeChange(theme.id)}
                  className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                    selectedTheme === theme.id
                      ? 'bg-primary-green-500/20 border-2 border-primary-green-500'
                      : 'bg-primary-black-900/50 border-2 border-primary-black-600 hover:border-primary-black-500'
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-md border border-primary-black-500 flex-shrink-0"
                    style={{ background: theme.preview }}
                  />
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {theme.name}
                    </div>
                    {selectedTheme === theme.id && (
                      <div className="text-[10px] text-primary-green-500 font-bold">
                        ✓ Selected
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Danger Zone - Delete Team */}
        <div className="mt-6 pt-6 border-t border-red-500/20">
          <h3 className="text-sm font-bold text-red-400 mb-3 flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Danger Zone
          </h3>
          <p className="text-xs text-primary-black-400 mb-3">
            Permanently delete this team and all associated data including players, tokens, and lineup history.
          </p>
          <button
            onClick={handleDeleteTeam}
            disabled={isDeleting}
            className="w-full px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 hover:border-red-500 text-red-400 hover:text-red-300 font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            {isDeleting ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Delete Team</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Performance Summary - Mobile Optimized 2x2 Grid */}
      <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-primary-black-700">
        <h2 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-primary-green-500" />
          Team Performance
        </h2>
        
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Wins */}
          <div className="bg-primary-black-900/50 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-primary-black-400 text-xs sm:text-sm">Wins</span>
              <CheckCircle className="w-4 h-4 text-primary-green-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-primary-green-500">{activeTeam.wins}</div>
          </div>
          
          {/* Losses */}
          <div className="bg-primary-black-900/50 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-primary-black-400 text-xs sm:text-sm">Losses</span>
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-red-500">{activeTeam.losses}</div>
          </div>
          
          {/* Total Points */}
          <div className="bg-primary-black-900/50 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-primary-black-400 text-xs sm:text-sm">Total Points</span>
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white">
              {activeTeam.total_points?.toFixed(1) || '0.0'}
            </div>
          </div>
          
          {/* Win Rate */}
          <div className="bg-primary-black-900/50 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-primary-black-400 text-xs sm:text-sm">Win Rate</span>
              <span className="text-xs text-primary-black-500">%</span>
            </div>
            <div className={`text-2xl sm:text-3xl font-bold ${
              winRate >= 50 ? 'text-primary-green-500' : 'text-yellow-500'
            }`}>
              {winRate}%
            </div>
          </div>
        </div>

        {/* Lives indicator for elimination modes */}
        {activeTeam.lives !== undefined && activeTeam.lives !== null && (
          <div className="mt-4 pt-4 border-t border-primary-black-700">
            <div className="flex items-center justify-between">
              <span className="text-primary-black-300 text-sm">Lives Remaining</span>
              <div className="flex items-center gap-1">
                {[...Array(activeTeam.contest_type?.max_losses || 3)].map((_, i) => (
                  <Heart 
                    key={i} 
                    className={`w-5 h-5 ${i < activeTeam.lives ? 'text-red-500 fill-red-500' : 'text-gray-600'}`} 
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Weekly Performance History */}
      {weeklyHistory.length > 0 && (
        <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-primary-black-700">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-green-500" />
            Weekly Results
          </h2>
          
          <div className="space-y-2">
            {displayedWeeks.map((week) => (
              <div
                key={week.week}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  week.beat_median 
                    ? 'bg-primary-green-500/10 border border-primary-green-500/20' 
                    : 'bg-red-500/10 border border-red-500/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    week.beat_median ? 'bg-primary-green-500/20' : 'bg-red-500/20'
                  }`}>
                    {week.beat_median 
                      ? <CheckCircle className="w-4 h-4 text-primary-green-500" />
                      : <XCircle className="w-4 h-4 text-red-500" />
                    }
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">Week {week.week}</div>
                    <div className="text-xs text-primary-black-400">
                      {week.beat_median ? 'Beat Median' : 'Below Median'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${
                    week.beat_median ? 'text-primary-green-500' : 'text-red-500'
                  }`}>
                    {week.total_points?.toFixed(1)}
                  </div>
                  <div className="text-xs text-primary-black-400">points</div>
                </div>
              </div>
            ))}
          </div>
          
          {weeklyHistory.length > 5 && (
            <button
              onClick={() => setShowAllWeeks(!showAllWeeks)}
              className="w-full mt-3 py-2 text-sm text-primary-black-400 hover:text-white flex items-center justify-center gap-1 transition-colors"
            >
              {showAllWeeks ? (
                <>Show Less <ChevronUp className="w-4 h-4" /></>
              ) : (
                <>Show All {weeklyHistory.length} Weeks <ChevronDown className="w-4 h-4" /></>
              )}
            </button>
          )}
        </div>
      )}

      {/* Roster Breakdown */}
      <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-primary-black-700">
        <h2 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-primary-green-500" />
          Roster Breakdown
        </h2>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-primary-black-900/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-white">{rosterStats.totalPlayers}</div>
            <div className="text-xs text-primary-black-400">Players</div>
          </div>
          <div className="bg-primary-black-900/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-400">{rosterStats.tokens}</div>
            <div className="text-xs text-primary-black-400">Tokens</div>
          </div>
          <div className="bg-primary-black-900/50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-xl font-bold text-yellow-400">
                {rosterStats.totalValue >= 1000 
                  ? `${(rosterStats.totalValue / 1000).toFixed(1)}k` 
                  : rosterStats.totalValue}
              </span>
            </div>
            <div className="text-xs text-primary-black-400">Value</div>
          </div>
        </div>

        {/* Tier Breakdown */}
        <div className="space-y-2">
          {Object.entries(rosterStats.byTier).map(([tier, count]) => (
            count > 0 && (
              <div key={tier} className="flex items-center justify-between py-2 px-3 bg-primary-black-900/30 rounded-lg">
                <span className={`text-sm font-medium ${getTierColor(tier)}`}>
                  {getTierLabel(tier)}
                </span>
                <span className="text-white font-bold">{count}</span>
              </div>
            )
          ))}
          {rosterStats.totalPlayers === 0 && (
            <div className="text-center py-4 text-primary-black-400 text-sm">
              No players in inventory
            </div>
          )}
        </div>
      </div>

      {/* Team Activity */}
      <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-primary-black-700">
        <h2 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-green-500" />
          Recent Activity
        </h2>
        
        {recentActivity.length === 0 ? (
          <div className="text-center py-8 text-primary-black-400">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 bg-primary-black-900/30 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white text-sm truncate">
                    {formatTransactionType(transaction.transaction_type)}
                  </div>
                  <div className="text-xs text-primary-black-400">
                    {formatDate(transaction.created_at)}
                  </div>
                </div>
                
                <div className={`text-sm font-bold whitespace-nowrap ml-3 ${
                  transaction.coins_change > 0 ? 'text-primary-green-500' : 'text-red-500'
                }`}>
                  {transaction.coins_change > 0 ? '+' : ''}{transaction.coins_change}
                  <span className="text-xs ml-0.5">coins</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
