import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentSport, getSportById, getEnabledSports } from '../config/sports';

const SportContext = createContext(null);

export const useSport = () => {
  const context = useContext(SportContext);
  if (!context) {
    throw new Error('useSport must be used within a SportProvider');
  }
  return context;
};

export const SportProvider = ({ children }) => {
  const [currentSport, setCurrentSport] = useState(() => getCurrentSport());
  
  // In the future, we can save sport preference to localStorage or user settings
  useEffect(() => {
    localStorage.setItem('selectedSport', currentSport.id);
  }, [currentSport]);
  
  const changeSport = (sportId) => {
    const sport = getSportById(sportId);
    if (!sport.enabled) {
      throw new Error(`Sport ${sportId} is not enabled yet`);
    }
    setCurrentSport(sport);
  };
  
  const value = {
    currentSport,
    changeSport,
    enabledSports: getEnabledSports(),
    isSportEnabled: (sportId) => {
      try {
        const sport = getSportById(sportId);
        return sport.enabled;
      } catch {
        return false;
      }
    }
  };
  
  return (
    <SportContext.Provider value={value}>
      {children}
    </SportContext.Provider>
  );
};
