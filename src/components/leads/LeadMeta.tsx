import React from "react";
import { Badge } from "@/components/ui/badge";
import type { Lead } from "@/types";

export function LeadMeta({ lead, layout = "table" }: { lead: Lead; layout?: "table" | "card" }) {
  const hasTags = Array.isArray(lead.interest_tags) && lead.interest_tags.length > 0;
  const hasSegment = !!lead.segment;
  const hasSubtype = !!lead.subtype;
  const hasSale = !!lead.budget_sale_band;
  const hasRent = !!lead.budget_rent_band;
  const hasBedrooms = !!lead.bedrooms;
  const hasSize = !!lead.size_band;
  const hasLocation = !!lead.location_address;

  return (
    <div className={layout === "table" ? "space-y-1" : "space-y-2"}>
      <div className="flex flex-wrap gap-1">
        {hasTags ? (
          (lead.interest_tags as string[]).map((t) => (
            <Badge key={t} variant="secondary" className="text-xs">
              {t}
            </Badge>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">No interests</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {(hasSegment || hasSubtype) && (
          <span className="inline-flex items-center gap-1">
            <Badge variant="outline" className="text-xs">
              {lead.segment || "—"}
              {hasSubtype ? ` • ${lead.subtype}` : ""}
            </Badge>
          </span>
        )}
        {hasSale && (
          <Badge variant="outline" className="text-xs">Sale: {lead.budget_sale_band}</Badge>
        )}
        {hasRent && (
          <Badge variant="outline" className="text-xs">Rent: {lead.budget_rent_band}</Badge>
        )}
        {hasBedrooms && (
          <Badge variant="outline" className="text-xs">{lead.bedrooms}</Badge>
        )}
        {hasSize && (
          <Badge variant="outline" className="text-xs">{lead.size_band} sqft</Badge>
        )}
      </div>

      {hasLocation && (
        <div className="text-xs text-muted-foreground truncate max-w-[28ch]">
          {lead.location_address}
        </div>
      )}
    </div>
  );
}
