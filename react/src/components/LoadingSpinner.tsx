interface LoadingSpinnerProps {
  /** Optional size class */
  size?: "sm" | "md" | "lg";
  /** Optional additional className */
  className?: string;
  /** Optional text to display */
  text?: string;
  /** Optional progress percentage (0-100) */
  progress?: number;
}

/**
 * Loading spinner component with optional progress indicator
 */
export function LoadingSpinner({
  size = "md",
  className = "",
  text,
  progress,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  const showProgress = progress !== undefined && progress >= 0 && progress <= 100;

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center space-y-2">
        <div className="relative">
          <svg
            className={`animate-spin text-primary ${sizeClasses[size]}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {showProgress && (
            <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-primary">
              {Math.round(progress)}%
            </span>
          )}
        </div>
        {text && <span className="text-sm text-muted-foreground">{text}</span>}
        {showProgress && (
          <div className="w-24 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export { LoadingSpinner as default };
