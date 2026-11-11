import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "green" | "gray" | "blue" | "red" | "yellow";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = "gray", className = "" }) => {
  const styles = {
    green: "bg-[#D7FFB8] text-[#46A302] border border-[#58CC02]",
    gray: "bg-gray-100 text-[#777777] border border-gray-300",
    blue: "bg-blue-50 text-blue-700 border border-blue-300",
    red: "bg-red-50 text-red-600 border border-red-300",
    yellow: "bg-yellow-50 text-yellow-700 border border-yellow-300",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

