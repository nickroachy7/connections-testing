export default function LoadingSpinner({ size = 'md', message = '' }) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className={`${sizeClasses[size]} border-4 border-primary-black-700 border-t-primary-green-500 rounded-full animate-spin`}></div>
      {message && (
        <p className="mt-4 text-primary-black-400 font-dk text-sm animate-pulse">{message}</p>
      )}
    </div>
  );
}
