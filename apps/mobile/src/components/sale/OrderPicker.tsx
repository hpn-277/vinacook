import { Image, Text, TextInput, View } from "react-native";
import { packSize, priceRangeLabel, type CatalogProduct, type Cart } from "@noodle/core/domain/catalog";
import { formatVnd } from "@noodle/core/domain/money";
import { packPrice } from "@noodle/core/domain/pricing";
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
  cart,
  setQty,
  picked,
}: {
  product: CatalogProduct;
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
          <Muted style={{ fontSize: 12 }}>{priceRangeLabel(p.packs.map((pack) => pack.price_per_kg))}</Muted>
        </View>
      </Row>
      {p.packs.map((pack) => (
        <Row key={pack.id} style={{ justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6 }}>
          <Text style={{ color: colors.foreground }}>
            {packSize(pack)} <Muted style={{ fontSize: 12 }}>{formatVnd(packPrice(pack.kg_per_unit, pack.price_per_kg))}</Muted>
          </Text>
          <QtyStepper id={pack.id} label={`${p.name} - ${packSize(pack)}`} value={cart[pack.id] ?? 0} onChange={(q) => setQty(pack.id, q)} />
        </Row>
      ))}
    </Card>
  );
}
