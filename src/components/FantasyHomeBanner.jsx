import NavigationTabs from './NavigationTabs';

/**
 * FantasyHomeBanner - Navigation component for main pages
 * 
 * Shows the main navigation tabs: HOME, FANTASY, TBD, PROFILE
 */
export default function FantasyHomeBanner() {
  // Main Navigation Items - HOME, FANTASY, TBD, PROFILE
  const navItems = [
    { path: '/home', label: 'HOME', enabled: false },
    { path: '/fantasy', label: 'FANTASY', enabled: true },
    { path: '/tbd', label: 'TBD', enabled: false },
    { path: '/profile', label: 'PROFILE', enabled: true }
  ];

  return <NavigationTabs navItems={navItems} />;
}
