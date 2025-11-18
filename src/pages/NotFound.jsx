import { Link } from 'react-router-dom'

function NotFound() {
  return (
    <div className="min-h-screen bg-dk-black-primary flex items-center justify-center p-8">
      <div className="text-center max-w-2xl">
        <div className="mb-8">
          <h1 className="text-8xl md:text-9xl font-dk-display font-black text-dk-green-primary mb-4">
            404
          </h1>
          <div className="w-24 h-1 bg-dk-orange-primary mx-auto mb-8"></div>
        </div>
        
        <h2 className="text-4xl md:text-5xl font-dk-display font-black text-dk-white-primary mb-4">
          PAGE NOT FOUND
        </h2>
        
        <p className="text-dk-white-secondary text-xl mb-8 font-dk">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/" className="btn">
            🏠 RETURN HOME
          </Link>
          <Link to="/players" className="btn btn-secondary">
            🔍 BROWSE PLAYERS
          </Link>
        </div>
        
        <div className="mt-12">
          <p className="text-dk-white-muted text-sm">
            Error Code: 404 | Page Missing
          </p>
        </div>
      </div>
    </div>
  )
}

export default NotFound
