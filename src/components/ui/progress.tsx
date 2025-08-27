"use client";

import { cn } from "@/lib/utils";

interface ProgressProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
  className?: string;
}

export function Progress({ currentStep, totalSteps, stepLabels, className }: ProgressProps) {
  return (
    <div className={cn("w-3/5 mx-auto mb-8", className)}>
      <div className="flex items-center justify-between mb-2">
        {stepLabels.map((label, index) => (
          <div
            key={index}
            className={cn(
              "flex flex-col items-center",
              index + 1 <= currentStep ? "text-blue-600" : "text-gray-400"
            )}
          >
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mb-1",
                index + 1 <= currentStep
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                  : "bg-gray-200 text-gray-400"
              )}
            >
              {index + 1}
            </div>
            <span className="text-xs font-medium">{label}</span>
          </div>
        ))}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
          style={{
            width: `${Math.max(0, (currentStep - 1) / (totalSteps - 1)) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}