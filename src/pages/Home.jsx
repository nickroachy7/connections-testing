/**
 * Home Page - Main landing page
 * 
 * Currently a placeholder - will be expanded with features like:
 * - News/updates feed
 * - Quick actions
 * - Featured content
 */
export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="bg-primary-black-800/60 backdrop-blur-sm rounded-xl p-8 md:p-12 border border-primary-black-700 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-primary-green-500/10 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-primary-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Welcome to YAP Sports</h1>
        <p className="text-primary-black-400 max-w-md mx-auto">
          Home page coming soon. Head over to Fantasy to manage your teams!
        </p>
      </div>
    </div>
  );
}
