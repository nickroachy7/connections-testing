import { useState } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../services/supabase';
import { useToast } from '../contexts/ToastContext';
import { Trophy, Users, Zap, Shield, Target, ChevronRight, ChevronLeft, Info } from 'lucide-react';

// Scoring type options
const SCORING_TYPES = [
  { value: 'standard', label: 'Standard', description: 'No points for receptions' },
  { value: 'half_ppr', label: 'Half PPR', description: '0.5 points per reception' },
  { value: 'full_ppr', label: 'Full PPR', description: '1 point per reception' },
];

// Win condition options
const WIN_CONDITIONS = [
  { 
    value: 'median', 
    label: 'Beat the Median', 
    description: 'Win by scoring at or above the league median each week',
    icon: Target,
  },
  { 
    value: 'h2h', 
    label: 'Head-to-Head', 
    description: 'Weekly matchups against another team (coming soon)',
    icon: Users,
    disabled: true,
  },
  { 
    value: 'both', 
    label: 'Both (Hardcore)', 
    description: 'Must beat your opponent AND the median to win (coming soon)',
    icon: Zap,
    disabled: true,
  },
];

// Elimination type options
const ELIMINATION_TYPES = [
  { 
    value: 'none', 
    label: 'No Elimination', 
    description: 'Season-long record tracking, no one gets eliminated',
    icon: Trophy,
  },
  { 
    value: 'strike', 
    label: 'Strike System', 
    description: 'Eliminated after X losses',
    icon: Shield,
  },
  { 
    value: 'survivor', 
    label: 'Survivor Mode', 
    description: 'Single loss elimination - hardcore mode!',
    icon: Zap,
  },
];

export default function CreateLeagueModal({ onClose, onSuccess }) {
  const { error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = Basic Info, 2 = Contest Settings
  
  const [formData, setFormData] = useState({
    // Basic settings
    name: '',
    max_users: 10,
    max_teams_per_user: 1,
    fresh_start_required: false,
    restart_requires_new_team: false,
    // Contest configuration
    contest_config: {
      scoring_type: 'half_ppr',
      win_condition: 'median',
      elimination_type: 'strike',
      max_losses: 3,
      restart_allowed: false,
      max_restarts: null, // null = unlimited
      restart_reset_record: true,
      total_weeks: 18,
      starter_tier_config: { role_player: 1, starter: 0, all_star: 0 },
    },
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleConfigChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      contest_config: { ...prev.contest_config, [field]: value },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showError('Please enter a league name');
      return;
    }

    setLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Not authenticated. Please log in again.');
      }
      
      // Build the payload with contest_config
      const payload = {
        name: formData.name,
        max_users: formData.max_users,
        max_teams_per_user: formData.max_teams_per_user,
        fresh_start_required: formData.fresh_start_required,
        restart_requires_new_team: formData.restart_requires_new_team,
        // Legacy fields (derived from contest_config for backward compatibility)
        elimination_enabled: formData.contest_config.elimination_type !== 'none',
        restart_allowed: formData.contest_config.restart_allowed,
        // New contest configuration
        contest_config: formData.contest_config,
      };
      
      console.log('Creating league with data:', payload);
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-league`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      let result;
      try {
        result = await response.json();
      } catch (e) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      console.log('Response:', result);

      if (!response.ok) {
        throw new Error(result.error || result.details || 'Failed to create league');
      }

      onSuccess();
    } catch (error) {
      console.error('Error creating league:', error);
      showError(error.message || 'Failed to create league');
    } finally {
      setLoading(false);
    }
  };

  const canProceedToStep2 = formData.name.trim().length > 0;

  const renderStep1 = () => (
    <div className="space-y-6">
      {/* League Name */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">
          League Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Enter league name..."
          maxLength={50}
          className="w-full px-4 py-3 bg-primary-black-900 border border-primary-black-600 rounded-lg text-white placeholder-primary-black-500 focus:outline-none focus:border-primary-green-500 transition-colors"
        />
      </div>

      {/* Max Users */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">
          Maximum Users
        </label>
        <select
          value={formData.max_users}
          onChange={(e) => handleChange('max_users', parseInt(e.target.value))}
          className="w-full px-4 py-3 bg-primary-black-900 border border-primary-black-600 rounded-lg text-white focus:outline-none focus:border-primary-green-500 transition-colors"
        >
          {[5, 10, 15, 20, 30, 50, 100].map(num => (
            <option key={num} value={num}>{num} users</option>
          ))}
        </select>
      </div>

      {/* Max Teams Per User */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">
          Teams Per User
        </label>
        <select
          value={formData.max_teams_per_user}
          onChange={(e) => handleChange('max_teams_per_user', parseInt(e.target.value))}
          className="w-full px-4 py-3 bg-primary-black-900 border border-primary-black-600 rounded-lg text-white focus:outline-none focus:border-primary-green-500 transition-colors"
        >
          <option value={1}>1 team</option>
          <option value={2}>2 teams</option>
          <option value={3}>3 teams</option>
        </select>
        <p className="text-xs text-primary-black-400 mt-1">
          How many teams each user can enter into this league
        </p>
      </div>

      {/* Entry Requirements */}
      <div className="bg-primary-black-900 rounded-lg p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.fresh_start_required}
            onChange={(e) => handleChange('fresh_start_required', e.target.checked)}
            className="mt-1 w-5 h-5 rounded border-primary-black-600 text-primary-green-500 focus:ring-primary-green-500"
          />
          <div>
            <div className="text-sm font-semibold text-white">Require Fresh Start</div>
            <div className="text-xs text-primary-black-400">
              Users must create a new team to join (can&apos;t use existing teams)
            </div>
          </div>
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-6 py-3 bg-primary-black-700 hover:bg-primary-black-600 text-white font-bold rounded-lg transition-all duration-200 border border-primary-black-600"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => setStep(2)}
          disabled={!canProceedToStep2}
          className="flex-1 px-6 py-3 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          Contest Settings
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      {/* Scoring Type */}
      <div>
        <label className="block text-sm font-semibold text-white mb-3">
          Scoring Format
        </label>
        <div className="grid grid-cols-3 gap-3">
          {SCORING_TYPES.map(type => (
            <button
              key={type.value}
              type="button"
              onClick={() => handleConfigChange('scoring_type', type.value)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                formData.contest_config.scoring_type === type.value
                  ? 'border-primary-green-500 bg-primary-green-500/10'
                  : 'border-primary-black-600 bg-primary-black-900 hover:border-primary-black-500'
              }`}
            >
              <div className="text-sm font-bold text-white">{type.label}</div>
              <div className="text-xs text-primary-black-400 mt-1">{type.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Win Condition */}
      <div>
        <label className="block text-sm font-semibold text-white mb-3">
          How to Win
        </label>
        <div className="space-y-3">
          {WIN_CONDITIONS.map(condition => {
            const Icon = condition.icon;
            return (
              <button
                key={condition.value}
                type="button"
                onClick={() => !condition.disabled && handleConfigChange('win_condition', condition.value)}
                disabled={condition.disabled}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all flex items-start gap-3 ${
                  condition.disabled 
                    ? 'border-primary-black-700 bg-primary-black-900/50 opacity-50 cursor-not-allowed'
                    : formData.contest_config.win_condition === condition.value
                      ? 'border-primary-green-500 bg-primary-green-500/10'
                      : 'border-primary-black-600 bg-primary-black-900 hover:border-primary-black-500'
                }`}
              >
                <Icon className={`w-5 h-5 mt-0.5 ${
                  formData.contest_config.win_condition === condition.value 
                    ? 'text-primary-green-500' 
                    : 'text-primary-black-400'
                }`} />
                <div className="flex-1">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    {condition.label}
                    {condition.disabled && (
                      <span className="text-xs px-2 py-0.5 bg-primary-black-700 text-primary-black-400 rounded">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-primary-black-400 mt-1">{condition.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Elimination Settings */}
      <div>
        <label className="block text-sm font-semibold text-white mb-3">
          Elimination Mode
        </label>
        <div className="space-y-3">
          {ELIMINATION_TYPES.map(type => {
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => {
                  handleConfigChange('elimination_type', type.value);
                  // Auto-set max_losses for survivor mode
                  if (type.value === 'survivor') {
                    handleConfigChange('max_losses', 1);
                  } else if (type.value === 'strike' && formData.contest_config.max_losses === 1) {
                    handleConfigChange('max_losses', 3);
                  }
                }}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all flex items-start gap-3 ${
                  formData.contest_config.elimination_type === type.value
                    ? 'border-primary-green-500 bg-primary-green-500/10'
                    : 'border-primary-black-600 bg-primary-black-900 hover:border-primary-black-500'
                }`}
              >
                <Icon className={`w-5 h-5 mt-0.5 ${
                  formData.contest_config.elimination_type === type.value 
                    ? 'text-primary-green-500' 
                    : 'text-primary-black-400'
                }`} />
                <div className="flex-1">
                  <div className="text-sm font-bold text-white">{type.label}</div>
                  <div className="text-xs text-primary-black-400 mt-1">{type.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Max Losses (only for strike mode) */}
      {formData.contest_config.elimination_type === 'strike' && (
        <div className="bg-primary-black-900 rounded-lg p-4">
          <label className="block text-sm font-semibold text-white mb-2">
            Lives (Losses Before Elimination)
          </label>
          <div className="flex items-center gap-3">
            {[1, 2, 3, 4, 5, 7].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleConfigChange('max_losses', num)}
                className={`w-12 h-12 rounded-lg font-bold transition-all ${
                  formData.contest_config.max_losses === num
                    ? 'bg-primary-green-500 text-primary-black-950'
                    : 'bg-primary-black-800 text-white hover:bg-primary-black-700'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
          <p className="text-xs text-primary-black-400 mt-2">
            Teams are eliminated after {formData.contest_config.max_losses} loss{formData.contest_config.max_losses > 1 ? 'es' : ''}
          </p>
        </div>
      )}

      {/* Restart Settings (only if elimination enabled) */}
      {formData.contest_config.elimination_type !== 'none' && (
        <div className="bg-primary-black-900 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-primary-black-400" />
            <span className="text-sm font-semibold text-white">Restart Options</span>
          </div>
          
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.contest_config.restart_allowed}
              onChange={(e) => handleConfigChange('restart_allowed', e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-primary-black-600 text-primary-green-500 focus:ring-primary-green-500"
            />
            <div>
              <div className="text-sm font-semibold text-white">Allow Restarts</div>
              <div className="text-xs text-primary-black-400">
                Eliminated teams can restart for free
              </div>
            </div>
          </label>

          {formData.contest_config.restart_allowed && (
            <>
              <label className="flex items-start gap-3 cursor-pointer ml-8">
                <input
                  type="checkbox"
                  checked={formData.restart_requires_new_team}
                  onChange={(e) => handleChange('restart_requires_new_team', e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-primary-black-600 text-primary-green-500 focus:ring-primary-green-500"
                />
                <div>
                  <div className="text-sm font-semibold text-white">Require New Team on Restart</div>
                  <div className="text-xs text-primary-black-400">
                    Users must create a fresh team when restarting
                  </div>
                </div>
              </label>

              <div className="ml-8">
                <label className="block text-xs font-semibold text-primary-black-300 mb-2">
                  Maximum Restarts
                </label>
                <select
                  value={formData.contest_config.max_restarts ?? 'unlimited'}
                  onChange={(e) => handleConfigChange('max_restarts', e.target.value === 'unlimited' ? null : parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-primary-black-800 border border-primary-black-600 rounded-lg text-white text-sm focus:outline-none focus:border-primary-green-500"
                >
                  <option value="unlimited">Unlimited</option>
                  <option value="1">1 restart</option>
                  <option value="2">2 restarts</option>
                  <option value="3">3 restarts</option>
                  <option value="5">5 restarts</option>
                </select>
              </div>
            </>
          )}
        </div>
      )}

      {/* Season Length */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">
          Season Length
        </label>
        <select
          value={formData.contest_config.total_weeks}
          onChange={(e) => handleConfigChange('total_weeks', parseInt(e.target.value))}
          className="w-full px-4 py-3 bg-primary-black-900 border border-primary-black-600 rounded-lg text-white focus:outline-none focus:border-primary-green-500 transition-colors"
        >
          <option value={18}>Full Season (18 weeks)</option>
          <option value={9}>Half Season (9 weeks)</option>
          <option value={4}>Quick Tournament (4 weeks)</option>
          <option value={1}>One Week Sprint</option>
        </select>
        <p className="text-xs text-primary-black-400 mt-1">
          League starts from the current NFL week
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="px-6 py-3 bg-primary-black-700 hover:bg-primary-black-600 text-white font-bold rounded-lg transition-all duration-200 border border-primary-black-600 flex items-center gap-2"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-6 py-3 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create League'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-primary-black-800 rounded-xl border border-primary-black-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-primary-black-800 border-b border-primary-black-700 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-white">Create League</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className={`h-1.5 w-12 rounded-full ${step >= 1 ? 'bg-primary-green-500' : 'bg-primary-black-600'}`} />
              <div className={`h-1.5 w-12 rounded-full ${step >= 2 ? 'bg-primary-green-500' : 'bg-primary-black-600'}`} />
              <span className="text-xs text-primary-black-400 ml-2">
                Step {step} of 2: {step === 1 ? 'Basic Info' : 'Contest Settings'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-primary-black-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {step === 1 ? renderStep1() : renderStep2()}
        </form>
      </div>
    </div>
  );
}

CreateLeagueModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
};
