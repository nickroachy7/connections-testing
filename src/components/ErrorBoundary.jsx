import { Component } from 'react';
import { Link } from 'react-router-dom';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(_error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="betting-slip max-w-2xl w-full text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow-red">
              <span className="text-4xl">⚠️</span>
            </div>
            
            <h1 className="text-3xl font-dk-display font-bold text-primary-black-50 mb-4">
              Something went wrong
            </h1>
            
            <p className="text-primary-black-400 font-dk mb-8">
              We encountered an unexpected error. Please try refreshing the page or return to the dashboard.
            </p>

            {import.meta.env.MODE === 'development' && this.state.error && (
              <div className="bg-primary-black-900 rounded-xl p-4 mb-8 text-left">
                <p className="text-red-500 font-mono text-sm mb-2">{this.state.error.toString()}</p>
                <pre className="text-primary-black-400 font-mono text-xs overflow-auto">
                  {this.state.errorInfo.componentStack}
                </pre>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="btn btn-lg"
              >
                🔄 Refresh Page
              </button>
              <Link to="/dashboard" className="btn btn-secondary btn-lg">
                🏠 Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
