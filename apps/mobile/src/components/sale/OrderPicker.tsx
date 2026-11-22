import { Image, Text, TextInput, View } from "react-native";
import { packSize, type CatalogProduct, type Cart } from "@noodle/core/domain/catalog";
import { formatKg, formatVnd } from "@noodle/core/domain/money";
import { retailPerKg, type LineInput, type PricedOrder, type PricingTerms } from "@noodle/core/domain/pricing";
import { TierBadge } from "@/components/status";
import { Button, Card, Muted, Row, colors, styles } from "@/components/ui";
import { fileUri } from "@/lib/api";

/** Same as the web QtyStepper: "Bớt X", "Số lượng X", "Thêm X". */
export function QtyStepper({ id, label, value, onChange }: { id: number; label: string; value: number; onChange: (qty: number) => void }) {
  return (
    <Row style={{ gap: 4 }}>
      <Button label="−" variant="outline" size="sm" testID={`dec-${id}`} accessibilityLabel={`Bớt ${label}`} disabled={value === 0} onPress={() => onChange(value - 1)} />
      <TextInput
        testID={`qty-${id}`}
        accessibilityLabel={`Số lượng ${label}`}
        keyboardType="number-pad"
        value={value ? String(value) : ""}
        placeholder="0"
        placeholderTextColor={colors.mutedForeground}
        onChangeText={(t) => onChange(Number(t.replace(/\D/g, "")))}
        style={[styles.input, { width: 52, minHeight: 34, paddingHorizontal: 4, textAlign: "center" }]}
      />
      <Button label="+" variant="outline" size="sm" testID={`inc-${id}`} accessibilityLabel={`Thêm ${label}`} onPress={() => onChange(value + 1)} />
    </Row>
  );
}

// RN's Image cannot draw the stock pack SVGs.
const raster = (url: string | null) => (url && !url.endsWith(".svg") ? fileUri(url) : null);

export function ProductRow({
  product: p,
  retailMarkupPct,
  cart,
  setQty,
  picked,
}: {
  product: CatalogProduct;
  retailMarkupPct: number;
  cart: Cart;
  setQty: (packId: number, qty: number) => void;
  picked: boolean;
}) {
  const img = raster(p.image_url);
  return (
    <Card testID={`product-${p.id}`} style={picked ? { borderColor: colors.primary, borderWidth: 2 } : undefined}>
      <Row style={{ gap: 12 }}>
        {img ? (
          <Image source={{ uri: img }} style={{ width: 56, height: 56, borderRadius: 8 }} />
        ) : (
          <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: "#FFF1E8", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: colors.primary }}>{p.name.charAt(0)}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "600", fontSize: 15, color: colors.foreground }}>{p.name}</Text>
          <Muted style={{ fontSize: 12 }}>
            Sỉ {formatVnd(p.price_per_kg)}/kg · Lẻ {formatVnd(retailPerKg(p.price_per_kg, retailMarkupPct))}/kg
          </Muted>
        </View>
      </Row>
      {p.packs.map((pack) => (
        <Row key={pack.id} style={{ justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6 }}>
          <Text style={{ color: colors.foreground }}>{packSize(pack)}</Text>
          <QtyStepper id={pack.id} label={`${p.name} - ${packSize(pack)}`} value={cart[pack.id] ?? 0} onChange={(q) => setQty(pack.id, q)} />
        </Row>
      ))}
    </Card>
  );
}

export function wholesaleRule(terms: PricingTerms): string {
  return `Giá sỉ cho đơn từ ${formatKg(terms.wholesaleMinKg)} hoặc từ ${formatVnd(terms.wholesaleMinTotal)}`;
}

/** The web TierHint: which tier the cart gets and, while retail, how far it is from wholesale. */
export function TierHint({ order, terms }: { order: PricedOrder<LineInput>; terms: PricingTerms }) {
  if (order.lines.length === 0) return <Muted>{wholesaleRule(terms)}</Muted>;
  if (!order.toWholesale)
    return (
      <View testID="tier-hint" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <TierBadge tier="si" />
        <Text style={{ color: "#065F46", flex: 1 }}>Đơn được giá sỉ ({formatKg(order.totalKg)})</Text>
      </View>
    );
  return (
    <View testID="tier-hint" style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
      <TierBadge tier="le" />
      <Text style={{ color: "#7C2D12", flex: 1 }}>
        Đặt thêm <Text style={{ fontWeight: "700" }}>{formatKg(order.toWholesale.kg)}</Text> hoặc thêm {formatVnd(order.toWholesale.vnd)} để được giá sỉ
      </Text>
    </View>
  );
}
