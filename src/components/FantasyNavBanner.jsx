import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../services/supabase';

// TEMPORARY: Using debug version to troubleshoot live updates
export default function FantasyNavBanner({ 
  username, 
  teamName, 
  wins, 
  losses, 
  coins,
  teamId,
  userId,
  liveGameData,
  lineup,
  projections,
  team, // ADD team prop to get contest info
  currentWeek: contextCurrentWeek, // Get current week from FantasyContext to prevent flash
  previewMode = false // If true, show next week when current week is finalized (for Starting Lineup page only)
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentWeek, setCurrentWeek] = useState(contextCurrentWeek || null);
  const [displayWeek, setDisplayWeek] = useState(null); // The week to actually display (may be +1 in preview mode)
  const [projectedPoints, setProjectedPoints] = useState(0);
  const [globalStats, setGlobalStats] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [isFinal, setIsFinal] = useState(false);
  const [livePoints, setLivePoints] = useState(0);
  const [projectedFinal, setProjectedFinal] = useState(0);
  const [teamImage, setTeamImage] = useState(null);
  const [localTeamName, setLocalTeamName] = useState(teamName);
  const [hasWeeklyLineup, setHasWeeklyLineup] = useState(false); // Track if team has lineup for current week
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(teamName);
  const [uploading, setUploading] = useState(false);
  const nameInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [simulatedSeasonId, setSimulatedSeasonId] = useState(null);
  const [simulatedAverage, setSimulatedAverage] = useState(null);
  const averageCalculatedRef = useRef(false);
  const [weekIsFinalized, setWeekIsFinalized] = useState(false); // Track if current week is finalized
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [bannerTheme, setBannerTheme] = useState('default');
  const colorPickerRef = useRef(null);

  const navItems = [
    { path: `/teams/${teamId}/dashboard`, label: 'DASHBOARD' },
    { path: `/teams/${teamId}/starting-lineup`, label: 'STARTING LINEUP' },
    { path: `/teams/${teamId}/manage-team`, label: 'MANAGE TEAM' },
    { path: `/teams/${teamId}/leaderboard`, label: 'LEADERBOARD' },
    { path: `/teams/${teamId}/pack-shop`, label: 'PACK SHOP' }
  ];

  // Banner theme options
  const themeOptions = [
    { 
      id: 'default', 
      name: 'Classic Dark', 
      bg: 'bg-dk-black-secondary',
      preview: 'linear-gradient(to right, #1a1a1a, #1a1a1a)'
    },
    { 
      id: 'ocean', 
      name: 'Ocean Blue', 
      bg: 'bg-gradient-to-r from-blue-900 to-blue-800',
      preview: 'linear-gradient(to right, #1e3a8a, #1e40af)'
    },
    { 
      id: 'forest', 
      name: 'Forest Green', 
      bg: 'bg-gradient-to-r from-emerald-900 to-green-800',
      preview: 'linear-gradient(to right, #064e3b, #166534)'
    },
    { 
      id: 'sunset', 
      name: 'Sunset Orange', 
      bg: 'bg-gradient-to-r from-orange-900 to-red-900',
      preview: 'linear-gradient(to right, #7c2d12, #7f1d1d)'
    },
    { 
      id: 'purple', 
      name: 'Royal Purple', 
      bg: 'bg-gradient-to-r from-purple-900 to-indigo-900',
      preview: 'linear-gradient(to right, #581c87, #312e81)'
    },
    { 
      id: 'crimson', 
      name: 'Crimson Red', 
      bg: 'bg-gradient-to-r from-red-950 to-rose-900',
      preview: 'linear-gradient(to right, #450a0a, #881337)'
    },
    { 
      id: 'cow', 
      name: 'Moo Cow', 
      bg: 'bg-gradient-to-br from-zinc-100 via-zinc-900 to-zinc-100',
      preview: 'linear-gradient(135deg, #f4f4f5, #18181b, #f4f4f5)'
    },
    { 
      id: 'matrix', 
      name: 'Matrix Code', 
      bg: 'bg-gradient-to-b from-black via-green-950 to-black',
      preview: 'linear-gradient(to bottom, #000000, #052e16, #000000)'
    },
    { 
      id: 'lava', 
      name: 'Molten Lava', 
      bg: 'bg-gradient-to-r from-red-600 via-orange-600 to-yellow-500',
      preview: 'linear-gradient(to right, #dc2626, #ea580c, #eab308)'
    }
  ];

  // Load saved theme from localStorage when team changes
  useEffect(() => {
    const savedTheme = localStorage.getItem(`bannerTheme_${teamId}`);
    // Always set the theme - either saved or default
    setBannerTheme(savedTheme || 'default');
  }, [teamId]);

  // ... rest of the component code remains the same
}
