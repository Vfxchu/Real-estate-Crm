import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAIContext } from './useAIContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function useAIAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const { toast } = useToast();
  const { currentPage, contextData } = useAIContext();

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `https://lnszidczioariaebsquo.supabase.co/functions/v1/ai-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            message: content,
            context: {
              page: currentPage,
              ...contextData,
            },
            conversationId,
            stream: false,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.choices[0].message.content,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save messages to database
      if (!conversationId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: conversation } = await supabase
            .from('ai_conversations')
            .insert({
              user_id: user.id,
              title: content.slice(0, 50),
            })
            .select()
            .single();
          
          if (conversation) {
            setConversationId(conversation.id);
          }
        }
      }

      if (conversationId) {
        await supabase.from('ai_messages').insert([
          {
            conversation_id: conversationId,
            role: 'user',
            content: userMessage.content,
          },
          {
            conversation_id: conversationId,
            role: 'assistant',
            content: assistantMessage.content,
          },
        ]);
      }
    } catch (error: any) {
      console.error('AI Assistant error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to get AI response',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, currentPage, contextData, toast]);

  const executeAction = useCallback(async (actionType: string, data?: any) => {
    console.log('Executing action:', actionType, data);
    
    const actionMessages: Record<string, string> = {
      create_property: 'Opening property creation form...',
      search: 'What would you like to search for?',
      generate_summary: 'Generating summary of current data...',
      create_event: 'Opening calendar event form...',
    };

    const message = actionMessages[actionType] || `Executing ${actionType}...`;
    await sendMessage(message);
  }, [sendMessage]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    executeAction,
    clearHistory,
    conversationId,
  };
}
