import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../services/supabase';
import { 
  ChevronDown, ChevronUp, Camera, Palette, CheckCircle, XCircle
} from 'lucide-react';

const BANNER_THEMES = [
  { id: 'default', name: 'Classic', preview: '#1a1a1a' },
  { id: 'ocean', name: 'Ocean', preview: 'linear-gradient(135deg, #1e3a8a, #164e63)' },
  { id: 'forest', name: 'Forest', preview: 'linear-gradient(135deg, #064e3b, #134e4a)' },
  { id: 'sunset', name: 'Sunset', preview: 'linear-gradient(135deg, #7c2d12, #831843)' },
  { id: 'purple', name: 'Purple', preview: 'linear-gradient(135deg, #581c87, #312e81)' },
  { id: 'crimson', name: 'Fire', preview: 'linear-gradient(135deg, #7f1d1d, #713f12)' },
  { id: 'midnight', name: 'Midnight', preview: 'linear-gradient(135deg, #0f172a, #1e1b4b)' },
  { id: 'emerald', name: 'Emerald', preview: 'linear-gradient(135deg, #064e3b, #365314)' },
  { id: 'rose', name: 'Rose', preview: 'linear-gradient(135deg, #831843, #7f1d1d)' },
  { id: 'arctic', name: 'Arctic', preview: 'linear-gradient(135deg, #164e63, #312e81)' }
];

/**
 * TeamInfoExpanded - Compact inline expandable content for team info
 */
export default function TeamInfoExpanded({ 
  team, 
  inventory,
  selectedTheme,
  onThemeChange,
  onTeamUpdate
}) {
  const [loading, setLoading] = useState(true);
  const [weeklyHistory, setWeeklyHistory] = useState([]);
  const [showThemes, setShowThemes] = useState(false);
  
  // Customization state
  const [editedName, setEditedName] = useState(team?.team_name || '');
  const [teamImage, setTeamImage] = useState(team?.team_image_url || null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customError, setCustomError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (team?.id) {
      loadTeamData();
      setEditedName(team.team_name || '');
      setTeamImage(team.team_image_url || null);
    }
  }, [team?.id]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      const { data: weeklyData } = await supabase
        .from('weekly_lineups')
        .select('week, total_points, beat_median')
        .eq('team_id', team.id)
        .order('week', { ascending: false })
        .limit(5);
      if (weeklyData) setWeeklyHistory(weeklyData);
    } catch (error) {
      console.error('Error loading team info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = async (event) => {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
      setCustomError(file?.size > 2 * 1024 * 1024 ? 'Max 2MB' : 'Invalid file');
      return;
    }
    try {
      setUploading(true);
      setCustomError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const fileName = `${user.id}/${team.id}-${Date.now()}.${file.name.split('.').pop()}`;
      if (teamImage) {
        await supabase.storage.from('team-images').remove([teamImage.split('/').slice(-2).join('/')]);
      }
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('team-images').upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('team-images').getPublicUrl(uploadData.path);
      await supabase.from('teams').update({ team_image_url: publicUrl }).eq('id', team.id);
      setTeamImage(publicUrl);
      onTeamUpdate?.();
    } catch (err) {
      setCustomError('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveName = async () => {
    if (!editedName.trim() || editedName === team?.team_name) return;
    try {
      setSaving(true);
      await supabase.from('teams').update({ team_name: editedName.trim() }).eq('id', team.id);
      onTeamUpdate?.();
    } catch (err) {
      setCustomError('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const rosterStats = {
    players: inventory?.players?.length || 0,
    tokens: inventory?.tokens?.length || 0,
    value: inventory?.players?.reduce((sum, p) => sum + (p.player_card?.quick_sell_value || 0), 0) || 0,
  };

  const winRate = team && (team.wins + team.losses > 0)
    ? ((team.wins / (team.wins + team.losses)) * 100).toFixed(0) : 0;

  if (loading) {
    return (
      <div className="py-6 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pt-4 pb-2 space-y-3">
      {customError && (
        <div className="mx-1 px-3 py-1.5 bg-red-500/20 border border-red-500/40 rounded-lg">
          <span className="text-red-400 text-xs">{customError}</span>
        </div>
      )}

      {/* Row 1: Team Name + Photo */}
      <div className="flex gap-3 items-start">
        {/* Photo */}
        <div className="flex-shrink-0">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="relative w-14 h-14 rounded-lg bg-black/30 border border-white/20 overflow-hidden group"
          >
            {teamImage ? (
              <img src={teamImage} alt="Team" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-5 h-5 text-white/40 absolute inset-0 m-auto" />
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera className="w-4 h-4 text-white" />
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </button>
        </div>

        {/* Name Input */}
        <div className="flex-1 min-w-0">
          <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">Team Name</label>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              maxLength={30}
              className="flex-1 min-w-0 px-2.5 py-1.5 bg-black/30 border border-white/20 rounded-lg text-white text-sm focus:border-primary-green-500 focus:outline-none"
            />
            <button
              onClick={handleSaveName}
              disabled={saving || !editedName.trim() || editedName === team?.team_name}
              className="px-3 py-1.5 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 font-bold rounded-lg text-xs disabled:opacity-40"
            >
              {saving ? '...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Theme Selector */}
      <div>
        <button
          onClick={() => setShowThemes(!showThemes)}
          className="w-full flex items-center justify-between py-2 px-3 bg-black/20 rounded-lg border border-white/10"
        >
          <div className="flex items-center gap-2">
            <Palette className="w-3.5 h-3.5 text-primary-green-500" />
            <span className="text-xs font-medium text-white">Theme</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-white/30" style={{ background: BANNER_THEMES.find(t => t.id === selectedTheme)?.preview }} />
            <span className="text-[11px] text-white/50">{BANNER_THEMES.find(t => t.id === selectedTheme)?.name}</span>
            {showThemes ? <ChevronUp className="w-3.5 h-3.5 text-white/40" /> : <ChevronDown className="w-3.5 h-3.5 text-white/40" />}
          </div>
        </button>
        
        {showThemes && (
          <div className="grid grid-cols-5 gap-1.5 mt-2 px-1">
            {BANNER_THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => onThemeChange?.(theme.id)}
                className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all ${
                  selectedTheme === theme.id ? 'bg-primary-green-500/20 ring-1 ring-primary-green-500' : 'hover:bg-white/5'
                }`}
              >
                <div className="w-8 h-8 rounded border border-white/20" style={{ background: theme.preview }} />
                <span className="text-[9px] text-white/60">{theme.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Row 3: Stats Grid - Performance + Roster combined */}
      <div className="grid grid-cols-6 gap-1.5">
        <StatBox label="W" value={team?.wins || 0} color="text-primary-green-500" />
        <StatBox label="L" value={team?.losses || 0} color="text-red-500" />
        <StatBox label="Win%" value={`${winRate}%`} color={winRate >= 50 ? 'text-primary-green-500' : 'text-yellow-500'} />
        <StatBox label="Players" value={rosterStats.players} />
        <StatBox label="Tokens" value={rosterStats.tokens} color="text-purple-400" />
        <StatBox label="Value" value={rosterStats.value >= 1000 ? `${(rosterStats.value/1000).toFixed(0)}k` : rosterStats.value} color="text-yellow-400" />
      </div>

      {/* Row 4: Recent Weeks (if any) */}
      {weeklyHistory.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {weeklyHistory.slice(0, 5).map((week) => (
            <div
              key={week.week}
              className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${
                week.beat_median ? 'bg-primary-green-500/15 border border-primary-green-500/30' : 'bg-red-500/15 border border-red-500/30'
              }`}
            >
              {week.beat_median ? (
                <CheckCircle className="w-3 h-3 text-primary-green-500" />
              ) : (
                <XCircle className="w-3 h-3 text-red-500" />
              )}
              <span className="text-[11px] font-medium text-white">Wk {week.week}</span>
              <span className={`text-[11px] font-bold ${week.beat_median ? 'text-primary-green-500' : 'text-red-500'}`}>
                {week.total_points?.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Compact stat box component
function StatBox({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-black/25 rounded-lg py-2 px-1 text-center">
      <div className={`text-base font-bold ${color}`}>{value}</div>
      <div className="text-[8px] text-white/40 uppercase">{label}</div>
    </div>
  );
}

TeamInfoExpanded.propTypes = {
  team: PropTypes.object,
  inventory: PropTypes.object,
  selectedTheme: PropTypes.string,
  onThemeChange: PropTypes.func,
  onTeamUpdate: PropTypes.func,
};
