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
    <div className="w-full bg-primary-black-800 border border-primary-black-700 rounded-xl p-3 sm:p-4 animate-pulse">
      <div className="flex items-center gap-3 sm:gap-4">
        {/* LEFT SECTION: Icon + Pack Info */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
          {/* Icon skeleton */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary-black-700 rounded-lg flex-shrink-0"></div>
          
          {/* Name & Tier skeleton */}
          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
            <div className="h-4 sm:h-5 bg-primary-black-700 rounded w-32 sm:w-40"></div>
            <div className="h-4 bg-primary-black-700 rounded w-16 sm:w-20"></div>
          </div>
        </div>

        {/* MIDDLE SECTION: Stats skeleton */}
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <div className="h-3 sm:h-4 bg-primary-black-700 rounded w-16 sm:w-20"></div>
          <div className="h-3 sm:h-4 bg-primary-black-700 rounded w-16 sm:w-20"></div>
        </div>

        {/* RIGHT SECTION: Price + CTA skeleton */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <div className="h-5 sm:h-6 bg-primary-black-700 rounded w-20 sm:w-24"></div>
          <div className="h-4 bg-primary-black-700 rounded w-16 sm:w-20"></div>
        </div>
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
