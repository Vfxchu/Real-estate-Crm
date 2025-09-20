// src/pages/Notifications.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Info,
  Calendar as CalendarIcon,
  Clock,
  Settings,
  Search,
  Mail,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isYesterday } from "date-fns";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { CalendarEvent } from "@/types";

const whenText = (iso: string) => {
  const d = new Date(iso);
  if (isToday(d)) return `Today · ${format(d, "HH:mm")}`;
  if (isYesterday(d)) return `Yesterday · ${format(d, "HH:mm")}`;
  return format(d, "EEE, MMM d · HH:mm");
};

export const Notifications: React.FC = () => {
  const { toast } = useToast();
  const { events, loading, updateEvent } = useCalendarEvents();

  // UI state
  const [tab, setTab] = useState<"due" | "upcoming">("due");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "scheduled" | "completed" | "cancelled" | "rescheduled">("all");

  // Filter helpers (safe defaults)
  const safeEvents: CalendarEvent[] = Array.isArray(events) ? events : [];

  const now = new Date();
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const matchesSearch = (ev: CalendarEvent) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (ev.title || "").toLowerCase().includes(q) ||
      (ev.location || "").toLowerCase().includes(q) ||
      (ev.event_type || "").toLowerCase().includes(q)
    );
  };

  const matchesStatus = (ev: CalendarEvent) => {
    if (statusFilter === "all") return true;
    return (ev.status as any) === statusFilter;
  };

  const dueNow = useMemo(
    () =>
      safeEvents
        .filter(
          (e) =>
            e.status === "scheduled" &&
            e.start_date &&
            new Date(e.start_date) <= now
        )
        .filter(matchesSearch)
        .filter(matchesStatus)
        .sort((a, b) => new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime()),
    [safeEvents, now, search, statusFilter]
  );

  const upcoming = useMemo(
    () =>
      safeEvents
        .filter(
          (e) =>
            e.status === "scheduled" &&
            e.start_date &&
            new Date(e.start_date) > now &&
            new Date(e.start_date) <= in7d
        )
        .filter(matchesSearch)
        .filter(matchesStatus)
        .sort((a, b) => new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime()),
    [safeEvents, now, in7d, search, statusFilter]
  );

  const stats = {
    due: dueNow.length,
    upcoming: upcoming.length,
    today: safeEvents.filter(
      (e) => e.start_date && isToday(new Date(e.start_date))
    ).length,
    total: safeEvents.length,
  };

  // actions
  const done = async (id: string) => {
    try {
      await updateEvent(id, { status: "completed" });
      toast({ title: "Done", description: "Event marked as completed." });
    } catch (e) {
      toast({ title: "Failed", description: "Could not update event.", variant: "destructive" });
    }
  };

  const snooze = async (id: string, minutes: number) => {
    try {
      const newStart = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      await updateEvent(id, { start_date: newStart });
      toast({ title: "Snoozed", description: `Will remind you again in ${minutes} minutes.` });
    } catch (e) {
      toast({ title: "Failed", description: "Could not snooze event.", variant: "destructive" });
    }
  };

  // simple list render
  const renderList = (list: CalendarEvent[], emptyIcon: React.ReactNode, emptyTitle: string, emptyDesc: string) => (
    <>
      {loading ? (
        <Card className="card-elevated">
          <CardContent className="p-6">Loading…</CardContent>
        </Card>
      ) : list.length > 0 ? (
        list.map((e) => (
          <Card key={e.id} className="card-elevated border-l-4 border-l-primary">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Clock className="w-5 h-5 text-primary mt-1" />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold">{e.title || "Untitled"}</div>
                    <Badge variant="outline" className="capitalize">
                      {(e.event_type || "reminder").replaceAll("_", " ")}
                    </Badge>
                  </div>
                  {e.start_date && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {whenText(e.start_date)}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <Button size="sm" onClick={() => done(e.id!)}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Done
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => snooze(e.id!, 5)}>
                      Snooze 5m
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => snooze(e.id!, 10)}>
                      Snooze 10m
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => snooze(e.id!, 15)}>
                      Snooze 15m
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card className="card-elevated">
          <CardContent className="p-12 text-center">
            <div className="w-12 h-12 text-muted-foreground mx-auto mb-4">{emptyIcon}</div>
            <h3 className="text-lg font-semibold mb-2">{emptyTitle}</h3>
            <p className="text-muted-foreground">{emptyDesc}</p>
          </CardContent>
        </Card>
      )}
    </>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">Event reminders from your calendar</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-elevated">
          <CardContent className="p-4 flex items-center">
            <Bell className="w-6 h-6 text-primary mr-3" />
            <div>
              <div className="text-xs text-muted-foreground">Due Now</div>
              <div className="text-lg font-bold">{stats.due}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="p-4 flex items-center">
            <CalendarIcon className="w-6 h-6 text-info mr-3" />
            <div>
              <div className="text-xs text-muted-foreground">Upcoming (7d)</div>
              <div className="text-lg font-bold">{stats.upcoming}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="p-4 flex items-center">
            <Clock className="w-6 h-6 text-success mr-3" />
            <div>
              <div className="text-xs text-muted-foreground">Today</div>
              <div className="text-lg font-bold">{stats.today}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="p-4 flex items-center">
            <Info className="w-6 h-6 text-muted-foreground mr-3" />
            <div>
              <div className="text-xs text-muted-foreground">Total Events</div>
              <div className="text-lg font-bold">{stats.total}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="card-elevated">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search reminders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={statusFilter}
                onValueChange={(v: any) => setStatusFilter(v)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v: any) => setTab(v)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="due">Due Now</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
        </TabsList>

        <TabsContent value="due" className="space-y-4 mt-4">
          {renderList(
            dueNow,
            <Bell className="w-12 h-12" />,
            "No reminders due",
            "You’re all caught up!"
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4 mt-4">
          {renderList(
            upcoming,
            <CalendarIcon className="w-12 h-12" />,
            "No upcoming reminders",
            "The next 7 days look clear."
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Provide a default export as well to avoid import mismatches
export default Notifications;
