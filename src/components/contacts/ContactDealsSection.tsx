import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Handshake, Plus, DollarSign, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ContactDealsSectionProps {
  contactId: string;
}

interface Deal {
  id: string;
  title: string;
  value: number;
  status: string;
  close_date: string;
  created_at: string;
  currency: string;
}

export default function ContactDealsSection({ contactId }: ContactDealsSectionProps) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeals();
  }, [contactId]);

  const loadDeals = async () => {
    if (!contactId) return;

    try {
      const { data, error } = await supabase
        .from('deals')
        .select('id, title, value, status, close_date, created_at, currency')
        .eq('contact_id', contactId)
        .in('status', ['won', 'lost']) // Only closed deals
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeals(data || []);
    } catch (error: any) {
      console.error('Failed to load deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'won': return 'default';
      case 'lost': return 'destructive';
      default: return 'secondary';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'AED') => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-none bg-muted/20">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Handshake className="h-4 w-4" />
            Deals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-none bg-muted/20">
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Handshake className="h-4 w-4" />
            Deals
          </div>
          <Badge variant="outline" className="text-xs">
            {deals.length} closed
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {deals.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Handshake className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No closed deals yet</p>
            <p className="text-xs mt-1">Deals will appear here once completed</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deals.map((deal) => (
              <div key={deal.id} className="bg-background rounded-lg p-3 space-y-2 border border-border/50">
                <div className="flex items-start justify-between">
                  <h5 className="font-medium text-sm">{deal.title}</h5>
                  <Badge variant={getStatusVariant(deal.status)} className="text-xs capitalize">
                    {deal.status}
                  </Badge>
                </div>
                
                {deal.value && (
                  <div className="flex items-center gap-1 text-sm">
                    <DollarSign className="h-3 w-3 text-muted-foreground" />
                    <span>{formatCurrency(deal.value, deal.currency)}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Closed {format(new Date(deal.close_date || deal.created_at), 'MMM dd, yyyy')}</span>
                </div>
              </div>
            ))}
            
            {deals.length >= 3 && (
              <Button variant="ghost" size="sm" className="w-full text-xs">
                View all deals
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}