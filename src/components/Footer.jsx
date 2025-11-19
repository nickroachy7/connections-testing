const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary-black-900/80 backdrop-blur-md border-t border-primary-black-700 mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Brand Section */}
          <div>
            <img 
              src="/yapsports-logo.webp" 
              alt="YapSports" 
              className="h-6 w-auto mb-2"
            />
            <p className="text-primary-black-400 text-xs leading-relaxed">
              Your ultimate fantasy basketball experience. Build your dream team, open packs, and compete for glory.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-primary-black-50 font-semibold mb-2 text-sm">Quick Links</h3>
            <ul className="space-y-1">
              <li>
                <a href="/players" className="text-primary-black-400 hover:text-primary-green-400 text-xs transition-colors">
                  Players
                </a>
              </li>
              <li>
                <a href="/fantasy" className="text-primary-black-400 hover:text-primary-green-400 text-xs transition-colors">
                  Fantasy
                </a>
              </li>
              <li>
                <a href="/standings" className="text-primary-black-400 hover:text-primary-green-400 text-xs transition-colors">
                  Standings
                </a>
              </li>
            </ul>
          </div>

          {/* Fantasy Section */}
          <div>
            <h3 className="text-primary-black-50 font-semibold mb-2 text-sm">Fantasy</h3>
            <ul className="space-y-1">
              <li>
                <a href="/dashboard" className="text-primary-black-400 hover:text-primary-green-400 text-xs transition-colors">
                  Dashboard
                </a>
              </li>
              <li>
                <a href="/pack-shop" className="text-primary-black-400 hover:text-primary-green-400 text-xs transition-colors">
                  Pack Shop
                </a>
              </li>
              <li>
                <a href="/starting-lineup" className="text-primary-black-400 hover:text-primary-green-400 text-xs transition-colors">
                  Starting Lineup
                </a>
              </li>
              <li>
                <a href="/leaderboard" className="text-primary-black-400 hover:text-primary-green-400 text-xs transition-colors">
                  Leaderboard
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-primary-black-700 mt-6 pt-4 flex flex-col md:flex-row justify-between items-center">
          <p className="text-primary-black-500 text-xs">
            © {currentYear} YapSports. All rights reserved.
          </p>
          <div className="flex items-center space-x-3 mt-2 md:mt-0">
            <a href="#" className="text-primary-black-500 hover:text-primary-green-400 text-xs transition-colors">
              Privacy Policy
            </a>
            <span className="text-primary-black-700">•</span>
            <a href="#" className="text-primary-black-500 hover:text-primary-green-400 text-xs transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
