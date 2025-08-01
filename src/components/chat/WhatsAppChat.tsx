import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Phone, Video, MoreVertical } from "lucide-react";

interface WhatsAppChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadName: string;
  leadPhone?: string;
}

interface Message {
  id: string;
  text: string;
  timestamp: string;
  sender: 'user' | 'lead';
}

export const WhatsAppChat: React.FC<WhatsAppChatProps> = ({ 
  open, 
  onOpenChange, 
  leadName, 
  leadPhone 
}) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hi! I saw your property listing and I\'m interested in learning more.',
      timestamp: '2:30 PM',
      sender: 'lead'
    },
    {
      id: '2',
      text: 'Hello! Thank you for your interest. I\'d be happy to help you with any questions about the property.',
      timestamp: '2:32 PM',
      sender: 'user'
    },
    {
      id: '3',
      text: 'Can we schedule a viewing for this weekend?',
      timestamp: '2:35 PM',
      sender: 'lead'
    },
    {
      id: '4',
      text: 'Absolutely! I have availability on Saturday and Sunday. What time works best for you?',
      timestamp: '2:36 PM',
      sender: 'user'
    },
    {
      id: '5',
      text: 'Saturday morning would be perfect!',
      timestamp: '2:40 PM',
      sender: 'lead'
    }
  ]);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: message.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: 'user'
    };

    setMessages(prev => [...prev, newMessage]);
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[600px] p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="bg-[#075e54] text-white p-4 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-[#128c7e] text-white text-sm">
                {getInitials(leadName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-white text-base">{leadName}</DialogTitle>
              {leadPhone && (
                <p className="text-xs text-green-100 opacity-90">{leadPhone}</p>
              )}
              <p className="text-xs text-green-100 opacity-75">Online</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 p-2">
              <Video className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 p-2">
              <Phone className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 p-2">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Chat Messages */}
        <div className="flex-1 bg-[#e5ddd5] bg-opacity-30 relative">
          {/* WhatsApp-style background pattern */}
          <div 
            className="absolute inset-0 opacity-10" 
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          
          <ScrollArea className="h-[400px] p-4 relative z-10">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 ${
                      msg.sender === 'user'
                        ? 'bg-[#dcf8c6] text-gray-800'
                        : 'bg-white text-gray-800'
                    } shadow-sm`}
                  >
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.sender === 'user' ? 'text-gray-600' : 'text-gray-500'
                      } text-right`}
                    >
                      {msg.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Message Input */}
        <div className="p-4 bg-[#f0f0f0] border-t flex items-center gap-2">
          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="pr-12 rounded-full border-gray-300 focus:border-[#075e54] focus:ring-[#075e54]"
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            size="sm"
            className="bg-[#075e54] hover:bg-[#128c7e] text-white rounded-full w-10 h-10 p-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};