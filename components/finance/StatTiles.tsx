import { Card, CardContent } from "@/components/ui/card";

export type StatTile = { label: string; value: string; note: string; warn?: boolean };

export function StatTiles({ tiles }: { tiles: StatTile[] }) {
  return (
    <div className={`mb-4 grid grid-cols-2 gap-3 ${tiles.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
      {tiles.map((t) => (
        <Card key={t.label} size="sm">
          <CardContent className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">{t.label}</span>
            <span className="text-xl font-bold tabular-nums sm:text-2xl" data-testid={`tile-${t.label}`}>
              {t.value}
            </span>
            <span className={t.warn ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>{t.note}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
