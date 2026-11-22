import { ActionForm } from "@/components/ActionForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/** B/L No. and port/airport of loading, which the admin fills in once a shipment is booked; the manager only reads them. */
export function ShippingInfo({ order, editable }: { order: { id: number; bl_no: string | null; loading_port: string | null }; editable: boolean }) {
  return (
    <Card size="sm" data-testid="shipping-info">
      <CardHeader>
        <CardTitle>
          <h2>Vận chuyển</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        {editable ? (
          <ActionForm action="saveShipping" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <input type="hidden" name="order_id" value={order.id} />
            <Field>
              <FieldLabel htmlFor="ship-bl">B/L No.</FieldLabel>
              <Input id="ship-bl" name="bl_no" defaultValue={order.bl_no ?? ""} maxLength={100} />
            </Field>
            <Field>
              <FieldLabel htmlFor="ship-port">Port/Airport of loading</FieldLabel>
              <Input id="ship-port" name="loading_port" defaultValue={order.loading_port ?? ""} maxLength={200} placeholder="Cát Lái, HCMC" />
            </Field>
            <Button type="submit" variant="outline">
              Lưu
            </Button>
          </ActionForm>
        ) : (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="text-muted-foreground">B/L No.</dt>
            <dd>{order.bl_no ?? "—"}</dd>
            <dt className="text-muted-foreground">Port/Airport of loading</dt>
            <dd>{order.loading_port ?? "—"}</dd>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
