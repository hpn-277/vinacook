import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { cartLines, type Cart, type CatalogProduct } from "@noodle/core/domain/catalog";
import { DISTRICTS, type District } from "@noodle/core/domain/districts";
import { formatKg, formatVnd } from "@noodle/core/domain/money";
import { priceLines } from "@noodle/core/domain/pricing";
import type { CustomerLookup } from "@noodle/core/queries/sale";
import { ProductRow } from "@/components/sale/OrderPicker";
import { Body, Button, Card, Field, Loaded, Muted, Notice, Row, Screen, Title, colors, styles } from "@/components/ui";
import { api, json } from "@/lib/api";
import { useAction } from "@/lib/mutation";

const normalize = (raw: string | undefined) => (raw ?? "").replace(/[\s.-]/g, "");

/** "Mì Trứng" and "mi trung" match: lowercase, accents and đ stripped. */
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();

export default function NewStaffOrder() {
  const params = useLocalSearchParams<{ phone?: string }>();
  const [search, setSearch] = useState(normalize(params.phone));
  const [phone, setPhone] = useState(normalize(params.phone));
  // "Tạo đơn" on a customer navigates here with ?phone=, possibly while this tab is already mounted.
  const [seenParam, setSeenParam] = useState(params.phone);
  if (params.phone !== seenParam) {
    setSeenParam(params.phone);
    if (params.phone !== undefined) {
      setSearch(normalize(params.phone));
      setPhone(normalize(params.phone));
    }
  }

  const q = useQuery({ queryKey: ["sale", "order-form", phone], queryFn: () => json(api.sale["order-form"].$get({ query: { phone: phone || undefined } })) });
  const lookup = q.data?.lookup;

  return (
    <Screen testID="sale-new-order">
      <Title>Tạo đơn cho khách</Title>
      <Row>
        <TextInput
          testID="lookup-phone"
          accessibilityLabel="SĐT khách"
          placeholder="SĐT khách"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="phone-pad"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => setPhone(normalize(search))}
          style={[styles.input, { flex: 1 }]}
        />
        <Button label="Tìm khách" variant="outline" testID="lookup-submit" disabled={!search.trim()} onPress={() => setPhone(normalize(search))} />
      </Row>
      {phone && lookup && (
        <Text testID="lookup-note" accessibilityRole="text" style={{ fontSize: 14, color: colors.foreground }}>
          {lookup.found ? `Khách cũ: ${lookup.found.name}` : "Khách mới, nhập thông tin bên dưới."}
          {lookup.ownedByOther && (
            <Text style={{ fontWeight: "600", color: colors.warning }}> Khách thuộc {lookup.ownerName}; đơn vẫn được lưu nhưng tính cho nhân viên đó.</Text>
          )}
        </Text>
      )}
      <Loaded query={q}>{(d) => <OrderForm key={phone} phone={phone} lookup={d.lookup} catalog={d.catalog} />}</Loaded>
    </Screen>
  );
}

function OrderForm({ phone: initialPhone, lookup, catalog }: { phone: string; lookup: CustomerLookup; catalog: CatalogProduct[] }) {
  const found = lookup?.found;
  const defaults = { phone: initialPhone, name: found?.name ?? "", address: found?.default_address ?? "", district: found?.default_district ?? "", note: "" };
  const [contact, setContact] = useState(defaults);
  const [cart, setCart] = useState<Cart>({});
  const [query, setQuery] = useState("");
  const [onlyPicked, setOnlyPicked] = useState(false);
  const [pickingDistrict, setPickingDistrict] = useState(false);
  const set = (k: keyof typeof defaults) => (v: string) => setContact((c) => ({ ...c, [k]: v }));
  const setQty = (packId: number, qty: number) => setCart((c) => ({ ...c, [packId]: Math.max(0, Math.floor(qty) || 0) }));

  const order = priceLines(cartLines(catalog, cart));
  const pickedIds = new Set(order.lines.map((l) => l.product.id));
  const q = fold(query.trim());
  const shown = catalog.filter((p) => (!onlyPicked || pickedIds.has(p.id)) && (!q || fold(p.name).includes(q)));

  // Like the web form after a successful submit: cart cleared, fields back to the looked-up customer.
  const place = useAction(
    () =>
      api.shop["staff-orders"].$post({
        json: {
          ...contact,
          district: contact.district as District,
          items: Object.entries(cart)
            .filter(([, qty]) => qty > 0)
            .map(([packId, qty]) => ({ pack_id: Number(packId), pack_qty: qty })),
        },
      }),
    () => {
      setCart({});
      setContact(defaults);
    },
  );

  return (
    <View style={{ gap: 12 }}>
      <Card>
        <Field label="Số điện thoại" testID="order-phone" keyboardType="phone-pad" value={contact.phone} onChangeText={set("phone")} />
        <Field label="Họ tên" testID="order-name" value={contact.name} onChangeText={set("name")} />
        <Field label="Địa chỉ" testID="order-address" value={contact.address} onChangeText={set("address")} />
        <View style={{ gap: 6 }}>
          <Text style={styles.label}>Quận/Huyện</Text>
          <Pressable
            testID="order-district"
            accessibilityRole="button"
            accessibilityLabel="Quận/Huyện"
            onPress={() => setPickingDistrict((v) => !v)}
            style={[styles.input, { justifyContent: "center" }]}
          >
            <Text style={{ fontSize: 16, color: contact.district ? colors.foreground : colors.mutedForeground }}>{contact.district || "Chọn quận/huyện"}</Text>
          </Pressable>
          {pickingDistrict && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {DISTRICTS.map((d) => (
                <Button
                  key={d}
                  label={d}
                  size="sm"
                  variant={contact.district === d ? "default" : "outline"}
                  testID={`district-${d}`}
                  onPress={() => {
                    set("district")(d);
                    setPickingDistrict(false);
                  }}
                />
              ))}
            </View>
          )}
        </View>
      </Card>

      <Text style={styles.label}>Sản phẩm</Text>
      <Row>
        <TextInput
          testID="product-search"
          accessibilityLabel="Tìm sản phẩm"
          placeholder="Tìm sản phẩm…"
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={setQuery}
          style={[styles.input, { flex: 1 }]}
        />
        {query ? <Button label="✕" variant="ghost" size="sm" testID="product-search-clear" accessibilityLabel="Xoá tìm kiếm" onPress={() => setQuery("")} /> : null}
      </Row>
      <View accessibilityLabel="Lọc sản phẩm" style={{ flexDirection: "row", gap: 8 }}>
        <Button label={`Tất cả (${catalog.length})`} size="sm" variant={onlyPicked ? "outline" : "default"} testID="filter-all" onPress={() => setOnlyPicked(false)} />
        <Button label={`Đã chọn (${pickedIds.size})`} size="sm" variant={onlyPicked ? "default" : "outline"} testID="filter-picked" onPress={() => setOnlyPicked(true)} />
      </View>
      {shown.length === 0 ? (
        <Muted style={{ textAlign: "center", paddingVertical: 24 }}>{onlyPicked && !q ? "Chưa chọn sản phẩm nào" : "Không tìm thấy sản phẩm"}</Muted>
      ) : (
        shown.map((p) => <ProductRow key={p.id} product={p} cart={cart} setQty={setQty} picked={pickedIds.has(p.id)} />)
      )}

      <Field label="Ghi chú" testID="order-note" multiline numberOfLines={2} value={contact.note} onChangeText={set("note")} />

      <Card testID="order-summary">
        <Row style={{ justifyContent: "space-between" }}>
          <View>
            <Muted style={{ fontSize: 12 }}>{order.lines.length ? `Tạm tính · ${formatKg(order.totalKg)}` : "Tạm tính"}</Muted>
            <Body testID="order-estimate" style={{ fontSize: 18, fontWeight: "700" }}>
              {formatVnd(order.total)}
            </Body>
          </View>
          <Button label="Tạo đơn" size="lg" testID="place-order" disabled={order.lines.length === 0} pending={place.pending} onPress={() => place.run()} />
        </Row>
      </Card>
      <Notice result={place.result} />
    </View>
  );
}
