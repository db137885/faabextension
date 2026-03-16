export default function ErrorMessage({ message, onRetry }) {
  return (
    <div className="bg-red-950/50 border border-red-900 rounded-lg p-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <span className="text-red-400 text-lg leading-none">!</span>
        <div className="flex-1">
          <p className="text-sm text-red-300 font-medium">Something went wrong</p>
          <p className="text-xs text-red-400/80 mt-1">{message}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs text-red-400 hover:text-red-300 border border-red-800 rounded px-2 py-1 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
