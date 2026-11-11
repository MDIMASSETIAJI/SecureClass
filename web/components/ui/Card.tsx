import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  chunky?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  chunky = true,
  className = "",
  ...props
}) => {
  return (
    <div
      className={`bg-white border-2 border-gray-200 rounded-2xl p-6 ${
        chunky ? "border-b-4" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

