import clsx from 'clsx'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={clsx('animate-pulse rounded-xl bg-border-subtle', className)} />
}

export function CardSkeleton() {
  return (
    <div className="rounded-card-lg bg-surface shadow-card p-6 flex flex-col gap-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-24 w-full" />
    </div>
  )
}
