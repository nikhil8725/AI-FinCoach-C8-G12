export function TypingIndicator() {
  return (
    <div className="flex w-fit gap-1.5 rounded-2xl bg-surface px-4.5 py-3.5 shadow-card">
      {[0, 0.2, 0.4].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 rounded-full bg-[#C4C9D2]"
          style={{ animation: `fc-pulse 1s ease-in-out ${delay}s infinite` }}
        />
      ))}
    </div>
  )
}
