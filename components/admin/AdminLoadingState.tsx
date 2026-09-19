export function AdminLoadingState() {
  return (
    <div className="space-y-4">
      <div className="h-22 animate-pulse rounded-[24px] bg-[#E5E5E5]" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-[24px] bg-[#E5E5E5]" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-[24px] bg-[#E5E5E5]" />
    </div>
  );
}
