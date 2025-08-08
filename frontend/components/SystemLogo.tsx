import React from "react";
import { useSystemConfig } from "../hooks/useSystemConfig";
import { HelpCircle } from "lucide-react";

interface SystemLogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function SystemLogo({ className = "", showText = true, size = "md" }: SystemLogoProps) {
  const { config } = useSystemConfig();

  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const textSizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className={`flex items-center ${className}`}>
      {config?.logoUrl ? (
        <img
          src={config.logoUrl}
          alt={config.systemName}
          className={`${sizeClasses[size]} object-contain`}
          onError={(e) => {
            // Fallback to default icon if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.nextElementSibling?.classList.remove('hidden');
          }}
        />
      ) : null}
      <HelpCircle 
        className={`${sizeClasses[size]} text-blue-600 ${config?.logoUrl ? 'hidden' : ''}`} 
      />
      {showText && (
        <span className={`ml-2 font-bold text-gray-900 ${textSizeClasses[size]}`}>
          {config?.systemName || "IDESOLUSI Helpdesk"}
        </span>
      )}
    </div>
  );
}
