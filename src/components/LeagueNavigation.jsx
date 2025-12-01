import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Trophy, Users, Settings } from 'lucide-react';

export default function LeagueNavigation({ isCommissioner }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { leagueId } = useParams();

  const navItems = [
    { path: `/leagues/${leagueId}`, label: 'STANDINGS', icon: Trophy },
    { path: `/leagues/${leagueId}/members`, label: 'MEMBERS', icon: Users }
  ];

  if (isCommissioner) {
    navItems.push({ path: `/leagues/${leagueId}/settings`, label: 'SETTINGS', icon: Settings });
  }

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-6 lg:px-8 pt-3 md:pt-4">
      {/* Rounded Container */}
      <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl overflow-hidden">
        {/* Mobile: Icon Navigation */}
        <div className="flex md:hidden justify-around items-center px-2 py-2">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1 py-1 flex-1 transition-all duration-200"
            >
              <div className={location.pathname === item.path ? 'text-primary-green-500' : 'text-primary-black-400'}>
                <item.icon className="w-6 h-6" />
              </div>
              <span className={`text-[10px] font-medium ${
                location.pathname === item.path ? 'text-primary-green-500' : 'text-primary-black-400'
              }`}>
                {item.label === 'STANDINGS' ? 'Standings' : 
                 item.label === 'MEMBERS' ? 'Members' : 'Settings'}
              </span>
            </button>
          ))}
        </div>

        {/* Desktop: Button Layout */}
        <div className="hidden md:flex flex-wrap gap-2 p-2">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 whitespace-nowrap ${
                location.pathname === item.path
                  ? 'bg-primary-green-500 text-primary-black-950'
                  : 'bg-primary-black-700 text-primary-black-300 hover:bg-primary-black-600 hover:text-primary-black-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
