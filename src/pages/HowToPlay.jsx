export default function HowToPlay() {
  return (
    <>
      {/* Main Content Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-primary-black-50 mb-2">
            How to Play Fantasy Basketball
          </h1>
          <p className="text-primary-black-400 text-lg">
            Everything you need to know to dominate the competition
          </p>
        </div>

        {/* Getting Started */}
        <section className="mb-8">
          <div className="bg-primary-black-800 rounded-xl p-6 border border-primary-black-700">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🚀</span>
              <h2 className="text-2xl font-bold text-primary-black-50">Getting Started</h2>
            </div>
            <div className="space-y-3 text-primary-black-300">
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li className="text-primary-black-200">
                  <strong className="text-primary-green-400">Sign Up:</strong> Create your account to get started
                </li>
                <li className="text-primary-black-200">
                  <strong className="text-primary-green-400">Open Your Starter Pack:</strong> New players receive a starter pack with initial players and tokens
                </li>
                <li className="text-primary-black-200">
                  <strong className="text-primary-green-400">Build Your Lineup:</strong> Set your starting lineup before games begin
                </li>
                <li className="text-primary-black-200">
                  <strong className="text-primary-green-400">Earn Points:</strong> Watch as your players earn fantasy points during real NBA games
                </li>
              </ol>
            </div>
          </div>
        </section>

        {/* Building Your Lineup */}
        <section className="mb-8">
          <div className="bg-primary-black-800 rounded-xl p-6 border border-primary-black-700">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">💡</span>
              <h2 className="text-2xl font-bold text-primary-black-50">Building Your Lineup</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-primary-black-700 rounded-lg p-4 border border-primary-black-600">
                <div className="flex items-start gap-3">
                  <span className="text-xl">🖱️</span>
                  <div>
                    <h3 className="font-bold text-primary-black-50 mb-1">Drag & Drop</h3>
                    <p className="text-primary-black-300 text-sm">
                      Grab players from bench and drag to lineup slots
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-primary-black-700 rounded-lg p-4 border border-primary-black-600">
                <div className="flex items-start gap-3">
                  <span className="text-xl">🔄</span>
                  <div>
                    <h3 className="font-bold text-primary-black-50 mb-1">Swap Positions</h3>
                    <p className="text-primary-black-300 text-sm">
                      Drag RBs to swap with other RBs (tokens stay attached)
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-primary-black-700 rounded-lg p-4 border border-primary-black-600">
                <div className="flex items-start gap-3">
                  <span className="text-xl">➕</span>
                  <div>
                    <h3 className="font-bold text-primary-black-50 mb-1">Click to Add</h3>
                    <p className="text-primary-black-300 text-sm">
                      Click the + button on empty slots to filter eligible players
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-primary-black-700 rounded-lg p-4 border border-primary-black-600">
                <div className="flex items-start gap-3">
                  <span className="text-xl">🎯</span>
                  <div>
                    <h3 className="font-bold text-primary-black-50 mb-1">Move Button</h3>
                    <p className="text-primary-black-300 text-sm">
                      When filtering, click "Move →" to add player to that slot
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-primary-black-700 rounded-lg p-4 border border-primary-black-600">
                <div className="flex items-start gap-3">
                  <span className="text-xl">🪑</span>
                  <div>
                    <h3 className="font-bold text-primary-black-50 mb-1">Bench Players</h3>
                    <p className="text-primary-black-300 text-sm">
                      Drag lineup players outside to bench them (token removed)
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-primary-black-700 rounded-lg p-4 border border-primary-black-600">
                <div className="flex items-start gap-3">
                  <span className="text-xl">💎</span>
                  <div>
                    <h3 className="font-bold text-primary-black-50 mb-1">Apply Tokens</h3>
                    <p className="text-primary-black-300 text-sm">
                      Drag tokens directly onto players for bonus points
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-primary-black-700 rounded-lg p-4 border border-primary-black-600">
                <div className="flex items-start gap-3">
                  <span className="text-xl">🔒</span>
                  <div>
                    <h3 className="font-bold text-primary-black-50 mb-1">Locked Players</h3>
                    <p className="text-primary-black-300 text-sm">
                      Can't be moved once their game starts
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-primary-black-700 rounded-lg p-4 border border-primary-black-600">
                <div className="flex items-start gap-3">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <h3 className="font-bold text-primary-black-50 mb-1">Roster Limit</h3>
                    <p className="text-primary-black-300 text-sm">
                      Maximum 20 players + tokens. Sell extras to make changes
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pack Opening & Fantasy Points - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Pack Opening */}
          <section>
            <div className="bg-primary-black-800 rounded-xl p-6 border border-primary-black-700 h-full">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">📦</span>
                <h2 className="text-2xl font-bold text-primary-black-50">Pack Opening</h2>
              </div>
              <div className="space-y-4">
                <div className="bg-primary-black-700 rounded-lg p-4 border border-primary-black-600">
                  <h3 className="font-bold text-primary-green-400 mb-2">💰 Earning Coins</h3>
                  <ul className="space-y-1 text-sm text-primary-black-300">
                    <li>• Complete challenges and achievements</li>
                    <li>• Sell unwanted players and tokens</li>
                    <li>• Win weekly competitions</li>
                  </ul>
                </div>
                <div className="bg-primary-black-700 rounded-lg p-4 border border-primary-black-600">
                  <h3 className="font-bold text-purple-400 mb-2">🎴 Rarity System</h3>
                  <ul className="space-y-1 text-sm text-primary-black-300">
                    <li>• <span className="text-yellow-400">Legendary:</span> Rarest cards</li>
                    <li>• <span className="text-purple-400">Epic:</span> Very rare cards</li>
                    <li>• <span className="text-blue-400">Rare:</span> Uncommon cards</li>
                    <li>• <span className="text-gray-400">Common:</span> Standard cards</li>
                  </ul>
                </div>
                <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
                  <p className="text-blue-200 text-xs">
                    <strong>Note:</strong> Rarity affects drop rates, not starting strength. All cards begin at Level 1.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Fantasy Points */}
          <section>
            <div className="bg-primary-black-800 rounded-xl p-6 border border-primary-black-700 h-full">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">⭐</span>
                <h2 className="text-2xl font-bold text-primary-black-50">Fantasy Points</h2>
              </div>
              <div className="bg-primary-black-700 rounded-lg p-4 border border-primary-black-600">
                <p className="text-primary-black-300 text-sm mb-3">
                  Players earn points based on real NBA performance:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-primary-green-400 font-bold text-sm">Points</p>
                    <p className="text-xs text-primary-black-400">+1 per point</p>
                  </div>
                  <div>
                    <p className="text-primary-green-400 font-bold text-sm">Rebounds</p>
                    <p className="text-xs text-primary-black-400">+1.2 per rebound</p>
                  </div>
                  <div>
                    <p className="text-primary-green-400 font-bold text-sm">Assists</p>
                    <p className="text-xs text-primary-black-400">+1.5 per assist</p>
                  </div>
                  <div>
                    <p className="text-primary-green-400 font-bold text-sm">Steals</p>
                    <p className="text-xs text-primary-black-400">+3 per steal</p>
                  </div>
                  <div>
                    <p className="text-primary-green-400 font-bold text-sm">Blocks</p>
                    <p className="text-xs text-primary-black-400">+3 per block</p>
                  </div>
                  <div>
                    <p className="text-red-400 font-bold text-sm">Turnovers</p>
                    <p className="text-xs text-primary-black-400">-1 per turnover</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Tokens & Roster Management - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Tokens */}
          <section>
            <div className="bg-primary-black-800 rounded-xl p-6 border border-primary-black-700 h-full">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">💎</span>
                <h2 className="text-2xl font-bold text-primary-black-50">Using Tokens</h2>
              </div>
              <ul className="space-y-2 text-primary-black-300 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary-green-400 mt-0.5">▸</span>
                  <span>Apply tokens by dragging them onto players in your lineup</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-green-400 mt-0.5">▸</span>
                  <span>Each player can only have one token at a time</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-green-400 mt-0.5">▸</span>
                  <span>Tokens provide bonus fantasy points based on conditions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-green-400 mt-0.5">▸</span>
                  <span>Tokens are consumed after the game completes</span>
                </li>
              </ul>
              <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-3 mt-4">
                <p className="text-purple-200 text-xs">
                  <strong>Pro Tip:</strong> Check token conditions before applying. Some work better for specific matchups!
                </p>
              </div>
            </div>
          </section>

          {/* Roster Management */}
          <section>
            <div className="bg-primary-black-800 rounded-xl p-6 border border-primary-black-700 h-full">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">📋</span>
                <h2 className="text-2xl font-bold text-primary-black-50">Roster Management</h2>
              </div>
              <div className="space-y-3">
                <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
                  <h3 className="font-bold text-yellow-200 mb-1 text-sm">⚠️ Roster Limit</h3>
                  <p className="text-yellow-100 text-xs mb-2">
                    Maximum 20 players + tokens total:
                  </p>
                  <ul className="space-y-1 ml-3 text-xs text-yellow-100">
                    <li>• Can still open packs when over limit</li>
                    <li>• Cannot make lineup changes when over</li>
                    <li>• Must sell cards to get back under</li>
                  </ul>
                </div>
                <div className="bg-primary-black-700 rounded-lg p-3 border border-primary-black-600">
                  <h3 className="font-bold text-primary-green-400 mb-1 text-sm">💰 Selling Cards</h3>
                  <p className="text-xs text-primary-black-300">
                    Quick sell unwanted players and tokens in Team Manager to earn coins for more packs!
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Pro Tips */}
        <section className="mb-8">
          <div className="bg-primary-black-800 rounded-xl p-6 border border-primary-black-700">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🎯</span>
              <h2 className="text-2xl font-bold text-primary-black-50">Pro Tips & Strategy</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-primary-black-700 rounded-lg p-4 border border-primary-black-600">
                <h3 className="font-bold text-primary-green-400 mb-2 text-sm">Check Schedules</h3>
                <p className="text-primary-black-300 text-xs">
                  Make sure your players have games scheduled for the current week
                </p>
              </div>
              <div className="bg-primary-black-700 rounded-lg p-4 border border-primary-black-600">
                <h3 className="font-bold text-primary-green-400 mb-2 text-sm">Balance Your Lineup</h3>
                <p className="text-primary-black-300 text-xs">
                  Don't stack all players from one team - diversify for consistent scoring
                </p>
              </div>
              <div className="bg-primary-black-700 rounded-lg p-4 border border-primary-black-600">
                <h3 className="font-bold text-primary-green-400 mb-2 text-sm">Use Tokens Wisely</h3>
                <p className="text-primary-black-300 text-xs">
                  Save powerful tokens for favorable matchups and high-performing players
                </p>
              </div>
              <div className="bg-primary-black-700 rounded-lg p-4 border border-primary-black-600">
                <h3 className="font-bold text-primary-green-400 mb-2 text-sm">Level Up Cards</h3>
                <p className="text-primary-black-300 text-xs">
                  Keep using the same players to level them up and increase their fantasy potential
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center">
          <div className="bg-primary-black-800 rounded-xl p-8 border border-primary-green-500">
            <h2 className="text-2xl font-bold text-primary-black-50 mb-3">
              Ready to Dominate?
            </h2>
            <p className="text-primary-black-300 mb-6">
              Start building your championship team today!
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <a
                href="/dashboard"
                className="bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Go to Dashboard
              </a>
              <a
                href="/pack-shop"
                className="bg-primary-black-700 hover:bg-primary-black-600 text-primary-black-50 px-6 py-3 rounded-lg font-semibold transition-colors border border-primary-black-600"
              >
                Open Packs
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
