import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  Activity as ActivityIcon,
  TrendingUp,
  Phone,
  Mail,
  Calendar,
  Upload,
} from "lucide-react";
import { getContactTimeline } from "@/services/contacts";
import { format, isToday, isYesterday } from "date-fns";

type TimelineItem = {
  id: string;
  type: "status_change" | "lead_change" | "property_change" | "activity" | "file_upload";
  timestamp: string;
  title: string;
  subtitle: string;
  data: any;
};

interface ContactTimelineProps {
  contactId: string;
}

export function ContactTimeline({ contactId }: ContactTimelineProps) {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data } = await getContactTimeline(contactId);
        if (mounted) setTimeline((data ?? []) as TimelineItem[]);
      } catch (error) {
        console.error("Failed to load timeline:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    setLoading(true);
    load();
    return () => {
      mounted = false;
    };
  }, [contactId]);

  const getIcon = (item: TimelineItem) => {
    switch (item.type) {
      case "status_change":
      case "lead_change":
      case "property_change":
        return <TrendingUp className="h-4 w-4" />;
      case "activity": {
        const sub = item.data?.type;
        if (sub === "call") return <Phone className="h-4 w-4" />;
        if (sub === "email") return <Mail className="h-4 w-4" />;
        if (sub === "meeting") return <Calendar className="h-4 w-4" />;
        return <ActivityIcon className="h-4 w-4" />;
      }
      case "file_upload":
        return <Upload className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (item: TimelineItem) => {
    switch (item.type) {
      case "status_change":
        return "bg-blue-500";
      case "lead_change":
        return "bg-cyan-500";
      case "property_change":
        return "bg-amber-500";
      case "activity": {
        const sub = item.data?.type;
        if (sub === "call") return "bg-emerald-500";
        if (sub === "email") return "bg-indigo-500";
        if (sub === "meeting") return "bg-teal-500";
        return "bg-green-500";
      }
      case "file_upload":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatHeaderDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "EEEE, MMMM d, yyyy");
  };

  const grouped = useMemo(() => {
    const groups = new Map<string, TimelineItem[]>();
    for (const item of timeline) {
      const key = format(new Date(item.timestamp), "yyyy-MM-dd");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    for (const [k, arr] of groups.entries()) {
      arr.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      groups.set(k, arr);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [timeline]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
            <div className="h-16 bg-muted rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ActivityIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No timeline events yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(([dateKey, items]) => (
        <div key={dateKey}>
          <div className="flex items-center gap-2 mb-3">
            <div className="text-sm font-medium text-muted-foreground">
              {formatHeaderDate(dateKey)}
            </div>
            <div className="flex-1 h-px bg-border"></div>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <Card key={`${item.type}-${item.id}`} className="relative">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${getTypeColor(item)} text-white`}>
                      {getIcon(item)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm truncate">{item.title}</h4>
                        <time className="text-xs text-muted-foreground">
                          {format(new Date(item.timestamp), "HH:mm")}
                        </time>
                      </div>

                      {item.subtitle && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {item.subtitle}
                        </p>
                      )}

                      {item.type === "file_upload" && (item.data?.tag ?? null) && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          {String(item.data.tag).replace("_", " ")}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
