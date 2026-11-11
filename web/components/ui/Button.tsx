import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  className = "",
  disabled,
  ...props
}) => {
  const baseClasses =
    "font-extrabold uppercase tracking-wider transition-all duration-75 inline-flex items-center justify-center select-none disabled:opacity-50 disabled:cursor-not-allowed";

  const sizeClasses = {
    sm: "text-xs px-3 py-1.5 rounded-lg",
    md: "text-sm px-5 py-2.5 rounded-xl",
    lg: "text-base px-6 py-3.5 rounded-2xl",
  };

  const variantClasses = {
    primary:
      "bg-[#58CC02] text-white border-b-4 border-[#46A302] hover:brightness-105 active:border-b-0 active:translate-y-1",
    secondary:
      "bg-white text-[#3C3C3C] border-2 border-b-4 border-gray-300 hover:bg-gray-50 active:border-b-2 active:translate-y-0.5",
    outline:
      "bg-transparent text-[#777777] border-2 border-gray-300 hover:border-gray-400 hover:text-[#3C3C3C]",
    danger:
      "bg-red-500 text-white border-b-4 border-red-700 hover:brightness-105 active:border-b-0 active:translate-y-1",
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <span>Memproses...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
};

