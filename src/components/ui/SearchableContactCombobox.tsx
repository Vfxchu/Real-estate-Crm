import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useContacts } from "@/hooks/useContacts";
import ContactForm from "@/components/contacts/ContactForm";
import { Lead } from "@/types";

interface SearchableContactComboboxProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const SearchableContactCombobox: React.FC<SearchableContactComboboxProps> = ({
  value,
  onChange,
  placeholder = "Select owner contact...",
  className,
  disabled
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showAddContact, setShowAddContact] = useState(false);
  const [contacts, setContacts] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const { list: listContacts } = useContacts();

  // Load contacts
  const loadContacts = async (searchTerm = "") => {
    setLoading(true);
    try {
      console.log('Loading contacts with search term:', searchTerm);
      const { data, error } = await listContacts({
        q: searchTerm,
        pageSize: 50,
      });
      
      if (error) {
        console.error('Error loading contacts:', error);
        setContacts([]);
        return;
      }
      
      console.log('Loaded contacts:', data);
      setContacts(data || []);
    } catch (error) {
      console.error('Failed to load contacts:', error);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadContacts(search);
    }
  }, [open]);

  // Debounce search to avoid too many API calls
  useEffect(() => {
    if (!open) return;
    
    const timeoutId = setTimeout(() => {
      loadContacts(search);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [search, open]);

  // Listen for new contacts created
  useEffect(() => {
    const handleContactsChanged = () => {
      loadContacts(search);
    };

    window.addEventListener('leads:changed', handleContactsChanged);
    return () => window.removeEventListener('leads:changed', handleContactsChanged);
  }, [search]);

  const selectedContact = contacts.find(c => c.id === value);

  const handleAddContactSuccess = (newContact?: any) => {
    setShowAddContact(false);
    // If a new contact was created, select it automatically
    if (newContact?.id) {
      onChange(newContact.id);
    }
    loadContacts(search); // Refresh contacts list
  };

  return (
    <>
      <div className={cn("flex gap-2", className)}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex-1 justify-between"
              disabled={disabled}
            >
              {selectedContact ? selectedContact.name : placeholder}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Search contacts..."
                value={search}
                onValueChange={setSearch}
              />
              <CommandList>
                <CommandEmpty>
                  {loading ? "Loading..." : "No contacts found."}
                </CommandEmpty>
                <CommandGroup>
                  {contacts.map((contact) => (
                    <CommandItem
                      key={contact.id}
                      value={contact.id}
                      onSelect={(currentValue) => {
                        onChange(currentValue === value ? undefined : currentValue);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === contact.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{contact.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {contact.email} {contact.phone && `• ${contact.phone}`}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {value && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => onChange(undefined)}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowAddContact(true)}
          disabled={disabled}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
          </DialogHeader>
          <div className="max-h-[calc(90vh-120px)] overflow-y-auto">
            <ContactForm
              onSuccess={handleAddContactSuccess}
              onCancel={() => setShowAddContact(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};