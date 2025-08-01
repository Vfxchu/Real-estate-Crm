import React from 'react';
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

interface WhatsAppFloatingButtonProps {
  onClick: () => void;
}

export const WhatsAppFloatingButton: React.FC<WhatsAppFloatingButtonProps> = ({ onClick }) => {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#25d366] hover:bg-[#128c7e] text-white shadow-lg hover:shadow-xl transition-all duration-300 z-50 animate-pulse"
      size="sm"
    >
      <MessageCircle className="w-6 h-6" />
    </Button>
  );
};