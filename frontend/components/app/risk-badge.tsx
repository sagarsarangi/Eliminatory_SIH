import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RiskBadgeProps {
  tier: string;
  className?: string;
}

const RISK_STYLES: Record<string, string> = {
  "No Risk": "bg-emerald-950 text-emerald-400 border-emerald-800",
  "Low": "bg-yellow-950 text-yellow-400 border-yellow-800",
  "Moderate": "bg-orange-950 text-orange-400 border-orange-800",
  "High": "bg-red-950 text-red-400 border-red-800",
};

export function RiskBadge({ tier, className }: RiskBadgeProps) {
  const style = RISK_STYLES[tier] ?? "bg-secondary text-secondary-foreground";
  return (
    <Badge
      variant="outline"
      className={cn("text-sm font-semibold px-3 py-1 border", style, className)}
    >
      {tier}
    </Badge>
  );
}
