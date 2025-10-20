import React from 'react';
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIAssistantButtonProps {
  onClick: () => void;
  hasNewSuggestions?: boolean;
}

export const AIAssistantButton: React.FC<AIAssistantButtonProps> = ({ 
  onClick,
  hasNewSuggestions = false 
}) => {
  return (
    <Button
      onClick={onClick}
      className={cn(
        "fixed bottom-6 left-6 lg:left-[280px] w-14 h-14 rounded-full",
        "bg-primary hover:bg-primary/90 text-primary-foreground",
        "shadow-lg hover:shadow-xl transition-all duration-300 z-50",
        "hidden lg:flex items-center justify-center",
        hasNewSuggestions && "animate-pulse"
      )}
      size="sm"
      aria-label="Open AI Assistant"
    >
      <Sparkles className="w-6 h-6" />
      {hasNewSuggestions && (
        <span className="absolute top-0 right-0 w-3 h-3 bg-destructive rounded-full border-2 border-background" />
      )}
    </Button>
  );
};
