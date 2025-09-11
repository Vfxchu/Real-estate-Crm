import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { validateEmail, validatePhone, escapeHtml } from "@/lib/sanitizer";

interface AddAgentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgentCreated?: () => void;
}

export const AddAgentForm: React.FC<AddAgentFormProps> = ({ open, onOpenChange, onAgentCreated }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'agent' as const,
    status: 'active' as const,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation
      if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Name, email, and password are required fields.',
          variant: 'destructive',
        });
        return;
      }

      // Validate email
      try {
        validateEmail(formData.email);
      } catch (error) {
        toast({
          title: 'Validation Error',
          description: 'Please enter a valid email address.',
          variant: 'destructive',
        });
        return;
      }

      // Validate phone if provided
      if (formData.phone.trim()) {
        try {
          validatePhone(formData.phone);
        } catch (error) {
          toast({
            title: 'Validation Error',
            description: 'Please enter a valid phone number.',
            variant: 'destructive',
          });
          return;
        }
      }

      // Password validation
      if (formData.password.length < 8) {
        toast({
          title: 'Validation Error',
          description: 'Password must be at least 8 characters long.',
          variant: 'destructive',
        });
        return;
      }

      // Create the user account
      const redirectUrl = `${window.location.origin}/`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: escapeHtml(formData.name.trim()),
            role: formData.role,
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Update the profile with additional information
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            name: escapeHtml(formData.name.trim()),
            phone: formData.phone.trim() ? validatePhone(formData.phone.trim()) : null,
            role: formData.role,
            status: formData.status,
          })
          .eq('user_id', authData.user.id);

        if (profileError) throw profileError;

        // Grant admin role if selected (agent role is auto-added by trigger)
        if (formData.role === 'admin') {
          const currentUser = (await supabase.auth.getUser()).data.user;
          const { error: roleError } = await supabase
            .from('user_roles')
            .upsert(
              {
                user_id: authData.user.id,
                role: 'admin',
                assigned_by: currentUser?.id
              } as any,
              { onConflict: 'user_id,role' } as any
            );

          if (roleError) throw roleError;
        }
      }

      toast({
        title: 'Agent created successfully',
        description: `${formData.name} has been added to the team.`,
      });

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'agent' as const,
        status: 'active' as const,
      });
      
      onAgentCreated?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error creating agent',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Agent</DialogTitle>
          <DialogDescription>Create a new agent account</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter full name"
              required
            />
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter email address"
              required
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Enter phone number"
            />
          </div>

          <div>
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="Enter password (min 8 characters)"
              required
              minLength={8}
            />
          </div>

          <div>
            <Label htmlFor="role">Role</Label>
            <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {loading ? 'Creating...' : 'Create Agent'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};