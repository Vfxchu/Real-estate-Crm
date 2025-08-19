export type DealStatus = 'prospecting' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';

export interface Deal {
  id: string;
  title: string;
  contact_id: string;
  property_id?: string | null;
  agent_id: string;
  status: DealStatus;
  value?: number | null;
  currency?: string;
  close_date?: string | null;
  probability?: number;
  notes?: string | null;
  source?: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  leads?: {
    name: string;
    email: string;
    phone?: string;
    contact_status?: string;
  };
  properties?: {
    title: string;
    address: string;
    city?: string;
    price?: number;
  };
  profiles?: {
    name: string;
    email: string;
  };
}

export const DEAL_STATUSES: { value: DealStatus; label: string; color: string }[] = [
  { value: 'prospecting', label: 'Prospecting', color: 'bg-slate-500' },
  { value: 'qualified', label: 'Qualified', color: 'bg-blue-500' },
  { value: 'proposal', label: 'Proposal', color: 'bg-yellow-500' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-orange-500' },
  { value: 'closed_won', label: 'Closed Won', color: 'bg-green-500' },
  { value: 'closed_lost', label: 'Closed Lost', color: 'bg-red-500' },
];