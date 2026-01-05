import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function MiniCalendarWidget() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const navigate = useNavigate();

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Calendar
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/calendar")}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            View Full Calendar →
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="rounded-md border w-full flex justify-center"
        />
      </CardContent>
    </Card>
  );
}
