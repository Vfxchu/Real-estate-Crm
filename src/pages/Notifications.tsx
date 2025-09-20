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
  Users,
  Calendar as CalendarIcon,
  Clock,
  Phone,
  Settings,
  Search,
  Snooze,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isYesterday } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchDueEvents,
  ackEventReminder,
  snoozeEventReminder,
  type DueEventRow,
} from "@/services/contacts";

type NotificationRow = {
  id: string;
  title: string;
  message: string | null;
  type: "new_lead" | "appointment" | "system" | "agent_activity" | "reminder" | string;
  priority: "low" | "medium" | "high" | string;
  is_read: boolean;
  created_at: string;
  action_url?: string | null;
};

export const Notifications = () => {
  const { profile, user } = useAuth();
  const { toast } = useToast();

  // Identify agent (adjust if your profile structure differs)
  const agentId =
    (profile as any)?.id ||
    (profile as any)?.user_id ||
    (user as any)?.id ||
    null;

  // Filters
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "reminders" | "activity">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");

  // Reminders
  const [dueNow, setDueNow] = useState<DueEventRow[]>([]);
  const [upcoming, setUpcoming] = useState<DueEventRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Optional general notifications (if table exists)
  const [hasNotificationsTable, setHasNotificationsTable] = useState(true);
  const [general, setGeneral] = useState<NotificationRow[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadAll = async () => {
      try {
        setLoading(true);

        // 1) DUE NOW reminders
        if (agentId) {
          const { data: due } = await fetchDueEvents(agentId);
          if (mounted) setDueNow(due ?? []);
        }

        // 2) UPCOMING reminders (next 7 days)
        if (agentId) {
          const now = new Date();
          const week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
          const { data: upcomingData, error: upErr } = await (supabase as any)
            .from("calendar_events")
            .select("id,title,event_type,status,start_date,next_due_at,agent_id,created_by")
            .or(`agent_id.eq.${agentId},created_by.eq.${agentId}`)
            .eq("status", "scheduled")
            .gt("start_date", now.toISOString())
            .lte("start_date", week)
            .order("start_date", { ascending: true });

          if (!upErr && mounted) {
            setUpcoming((upcomingData ?? []) as DueEventRow[]);
          }
        }

        // 3) General notifications (if table exists)
        const { data: maybe, error: notifErr } = await (supabase as any)
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);

        if (notifErr) {
          // Table probably doesn't exist; hide the section
          setHasNotificationsTable(false);
        } else {
          setHasNotificationsTable(true);
          setGeneral((maybe ?? []) as NotificationRow[]);
        }
      } catch {
        // Swallow errors to avoid UI breakage
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadAll();

    // quick poll every 45s to refresh
    const id = setInterval(loadAll, 45_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [agentId]);

  // --- Actions for reminders ---
  const handleDone = async (id: string) => {
    await ackEventReminder(id);
    // remove from dueNow/upcoming locally
    setDueNow((arr) => arr.filter((e) => e.id !== id));
    setUpcoming((arr) => arr.filter((e) => e.id !== id));
    toast({ title: "Reminder completed", description: "Marked as done." });
  };

  const handleSnooze = async (id: string, minutes: number) => {
    await snoozeEventReminder(id, minutes);
    // remove from dueNow; it will reappear later
    setDueNow((arr) => arr.filter((e) => e.id !== id));
    toast({
      title: "Snoozed",
      description: `Will remind you again in ${minutes} min.`,
    });
  };

  // --- Actions for general notifications (if table exists) ---
  const markAsRead = async (id: string) => {
    if (!hasNotificationsTable) return;
    await (supabase as any).from("notifications").update({ is_read: true }).eq("id", id);
    setGeneral((items) => items.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    toast({ title: "Marked as read" });
  };

  const markAllAsRead = async () => {
    if (!hasNotificationsTable) return;
    await (supabase as any).from("notifications").update({ is_read: true }).neq("id", ""); // all rows
    setGeneral((items) => items.map((n) => ({ ...n, is_read: true })));
    toast({ title: "All notifications marked as read" });
  };

  // --- Filtering/Stats for general notifications ---
  const filteredGeneral = useMemo(() => {
    let items = [...general];

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.message ?? "").toLowerCase().includes(q)
      );
    }

    if (priorityFilter !== "all") {
      items = items.filter((n) => (n.priority || "low") === priorityFilter);
    }

    if (readFilter !== "all") {
      items = items.filter((n) =>
        readFilter === "read" ? n.is_read : !n.is_read
      );
    }

    return items;
  }, [general, search, priorityFilter, readFilter]);

  const stats = {
    total: general.length,
    unread: general.filter((n) => !n.is_read).length,
    high: general.filter((n) => (n.priority || "low") === "high" && !n.is_read).length,
    dueNow: dueNow.length,
    upcoming: upcoming.length,
    today: general.filter((n) => isToday(new Date(n.created_at))).length,
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case "appointment":
      case "reminder":
        return <Clock className="w-5 h-5 text-warning" />;
      case "agent_activity":
        return <Users className="w-5 h-5 text-success" />;
      case "system":
        return <Settings className="w-5 h-5 text-muted-foreground" />;
      default:
        return <Info className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const priorityBadgeClass = (p: string) => {
    switch (p) {
      case "high":
        return "bg-destructive text-destructive-foreground";
      case "medium":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-muted text-foreground";
    }
  };

  const formatWhen = (iso: string) => {
    const d = new Date(iso);
    if (isToday(d)) return `Today · ${format(d, "HH:mm")}`;
    if (isYesterday(d)) return `Yesterday · ${format(d, "HH:mm")}`;
    return format(d, "EEE, MMM d · HH:mm");
    }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Reminders and activity updates across your CRM
          </p>
        </div>
        <div className="flex gap-2">
          {hasNotificationsTable && (
            <Button variant="outline" onClick={markAllAsRead}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
          )}
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="card-elevated">
          <CardContent className="p-4 flex items-center">
            <Bell className="w-6 h-6 text-primary mr-3" />
            <div>
              <div className="text-xs text-muted-foreground">Due Now</div>
              <div className="text-lg font-bold">{stats.dueNow}</div>
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
        {hasNotificationsTable && (
          <>
            <Card className="card-elevated">
              <CardContent className="p-4 flex items-center">
                <Info className="w-6 h-6 text-muted-foreground mr-3" />
                <div>
                  <div className="text-xs text-muted-foreground">Total</div>
                  <div className="text-lg font-bold">{stats.total}</div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-elevated">
              <CardContent className="p-4 flex items-center">
                <Mail className="w-6 h-6 text-info mr-3" />
                <div>
                  <div className="text-xs text-muted-foreground">Unread</div>
                  <div className="text-lg font-bold">{stats.unread}</div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-elevated">
              <CardContent className="p-4 flex items-center">
                <AlertCircle className="w-6 h-6 text-destructive mr-3" />
                <div>
                  <div className="text-xs text-muted-foreground">High Priority</div>
                  <div className="text-lg font-bold">{stats.high}</div>
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
          </>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v: any) => setTab(v)} className="w-full">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <TabsList className="grid w-full lg:w-auto grid-cols-3">
            <TabsTrigger value="all">Reminders</TabsTrigger>
            <TabsTrigger value="activity" disabled={!hasNotificationsTable}>
              Notifications
            </TabsTrigger>
            <TabsTrigger value="reminders">Upcoming</TabsTrigger>
          </TabsList>

          {tab !== "reminders" && hasNotificationsTable && (
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-56"
                />
              </div>
              <Select
                value={readFilter}
                onValueChange={(v: any) => setReadFilter(v)}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Read" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={priorityFilter}
                onValueChange={(v: any) => setPriorityFilter(v)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Tab 1: Reminders (Due Now) */}
        <TabsContent value="all" className="space-y-4">
          {loading ? (
            <Card className="card-elevated">
              <CardContent className="p-6">Loading reminders…</CardContent>
            </Card>
          ) : dueNow.length > 0 ? (
            dueNow.map((e) => (
              <Card key={e.id} className="card-elevated border-l-4 border-l-primary">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Clock className="w-5 h-5 text-primary mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">{e.title}</div>
                        <Badge variant="outline" className="capitalize">
                          {(e.event_type || "reminder").replaceAll("_", " ")}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {formatWhen(e.next_due_at ?? e.start_date)}
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <Button size="sm" onClick={() => handleDone(e.id)}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Done
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleSnooze(e.id, 5)}>
                          <Snooze className="w-4 h-4 mr-2" />
                          Snooze 5m
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleSnooze(e.id, 10)}>
                          Snooze 10m
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleSnooze(e.id, 15)}>
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
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <div className="text-lg font-semibold mb-2">No reminders due</div>
                <div className="text-muted-foreground">You’re all caught up!</div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Notifications (optional table) */}
        <TabsContent value="activity" className="space-y-4">
          {!hasNotificationsTable ? (
            <Card className="card-elevated">
              <CardContent className="p-12 text-center">
                <Info className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <div className="text-lg font-semibold mb-1">Notifications table not found</div>
                <div className="text-muted-foreground">
                  This section hides automatically if the table doesn’t exist.
                </div>
              </CardContent>
            </Card>
          ) : filteredGeneral.length > 0 ? (
            filteredGeneral.map((n) => (
              <Card
                key={n.id}
                className={`card-elevated transition-all duration-200 hover:shadow-md ${
                  !n.is_read ? "border-l-4 border-l-primary bg-primary/5" : ""
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">{typeIcon(n.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{n.title}</h4>
                          {!n.is_read && <div className="w-2 h-2 bg-primary rounded-full" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={priorityBadgeClass(n.priority || "low")}>
                            {n.priority || "low"}
                          </Badge>
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatWhen(n.created_at)}
                          </span>
                        </div>
                      </div>

                      {n.message && (
                        <p className="text-muted-foreground mb-3">{n.message}</p>
                      )}

                      <div className="flex items-center gap-2">
                        {!n.is_read && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markAsRead(n.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Mark Read
                          </Button>
                        )}
                        {n.action_url && (
                          <a href={n.action_url} target="_blank" rel="noreferrer">
                            <Button size="sm" variant="outline">
                              Open
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="card-elevated">
              <CardContent className="p-12 text-center">
                <Info className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <div className="text-lg font-semibold mb-1">No notifications</div>
                <div className="text-muted-foreground">Nothing to show here yet.</div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 3: Upcoming (next 7 days) */}
        <TabsContent value="reminders" className="space-y-4">
          {loading ? (
            <Card className="card-elevated">
              <CardContent className="p-6">Loading upcoming…</CardContent>
            </Card>
          ) : upcoming.length > 0 ? (
            upcoming.map((e) => (
              <Card key={e.id} className="card-elevated">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <CalendarIcon className="w-5 h-5 text-info mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">{e.title}</div>
                        <Badge variant="outline" className="capitalize">
                          {(e.event_type || "reminder").replaceAll("_", " ")}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {formatWhen(e.start_date)}
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <Button size="sm" onClick={() => handleDone(e.id)}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Done
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleSnooze(e.id, 5)}>
                          <Snooze className="w-4 h-4 mr-2" />
                          Snooze 5m
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleSnooze(e.id, 10)}>
                          Snooze 10m
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleSnooze(e.id, 15)}>
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
                <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <div className="text-lg font-semibold mb-1">No upcoming reminders</div>
                <div className="text-muted-foreground">Next 7 days look clear.</div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
