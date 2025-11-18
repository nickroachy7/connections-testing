// Reusable skeleton loader components for different content types

export function CardSkeleton() {
  return (
    <div className="player-card-modern animate-pulse">
      <div className="flex items-start space-x-4">
        {/* Avatar skeleton */}
        <div className="flex-shrink-0 w-16 h-16 bg-primary-black-800 rounded-xl"></div>
        
        <div className="flex-1 space-y-3">
          {/* Name skeleton */}
          <div className="h-6 bg-primary-black-800 rounded-lg w-3/4"></div>
          
          {/* Stats skeleton */}
          <div className="space-y-2">
            <div className="h-4 bg-primary-black-800 rounded w-full"></div>
            <div className="h-4 bg-primary-black-800 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <div className="player-card-modern animate-pulse">
      <div className="grid grid-cols-4 gap-4">
        <div className="h-5 bg-primary-black-800 rounded"></div>
        <div className="h-5 bg-primary-black-800 rounded"></div>
        <div className="h-5 bg-primary-black-800 rounded"></div>
        <div className="h-5 bg-primary-black-800 rounded"></div>
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 5 }) {
  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function GridSkeleton({ count = 6 }) {
  return (
    <div className="grid-responsive">
      {[...Array(count)].map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="stat-card animate-pulse">
      <div className="h-10 bg-primary-black-800 rounded-lg mb-2 w-20"></div>
      <div className="h-4 bg-primary-black-800 rounded w-24"></div>
    </div>
  );
}

export function PackCardSkeleton() {
  return (
    <div className="odds-card animate-pulse">
      <div className="space-y-4">
        {/* Icon skeleton */}
        <div className="w-24 h-24 bg-primary-black-800 rounded-2xl mx-auto"></div>
        
        {/* Title skeleton */}
        <div className="h-6 bg-primary-black-800 rounded-lg w-3/4 mx-auto"></div>
        
        {/* Description skeleton */}
        <div className="h-4 bg-primary-black-800 rounded w-full"></div>
        <div className="h-4 bg-primary-black-800 rounded w-5/6 mx-auto"></div>
        
        {/* Price skeleton */}
        <div className="h-8 bg-primary-black-800 rounded-full w-24 mx-auto"></div>
      </div>
    </div>
  );
}

export function LeaderboardSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="betting-slip animate-pulse">
          <div className="grid grid-cols-4 gap-4">
            <div className="h-5 bg-primary-black-800 rounded w-8"></div>
            <div className="h-5 bg-primary-black-800 rounded col-span-2"></div>
            <div className="h-5 bg-primary-black-800 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
