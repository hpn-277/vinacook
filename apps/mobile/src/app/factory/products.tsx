import { useQuery } from "@tanstack/react-query";
import { Image, Text, View } from "react-native";
import { priceRangeLabel } from "@noodle/core/domain/catalog";
import { ProductForm } from "@/components/factory/ProductForm";
import { ProductStatusBadge } from "@/components/status";
import { Body, Card, colors, Loaded, Muted, Row, Screen, Title } from "@/components/ui";
import { api, fileUri, json } from "@/lib/api";

export default function FactoryProducts() {
  const query = useQuery({ queryKey: ["factory", "products"], queryFn: () => json(api.factory.products.$get()) });
  return (
    <Screen refreshing={query.isRefetching} onRefresh={query.refetch} testID="factory-products">
      <Title>Sản phẩm của xưởng</Title>
      <ProductForm />
      <Loaded query={query}>
        {(products) =>
          products.length === 0 ? (
            <Muted>Xưởng chưa có sản phẩm. Bấm “Thêm sản phẩm” để gửi quản lý duyệt.</Muted>
          ) : (
            products.map((p) => (
              <Card key={p.id} testID={`product-${p.id}`}>
                <Row style={{ alignItems: "flex-start" }}>
                  {p.image_url ? (
                    <Image source={{ uri: fileUri(p.image_url) }} style={{ width: 48, height: 48, borderRadius: 6 }} />
                  ) : (
                    <View style={{ width: 48, height: 48, borderRadius: 6, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontWeight: "600", color: colors.mutedForeground }}>{p.name.charAt(0)}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 4 }}>
                    <Body style={{ fontWeight: "600" }}>{p.name}</Body>
                    {p.description && <Muted>{p.description}</Muted>}
                    <Body>Giá: {priceRangeLabel(p.pack_prices)}</Body>
                    <View testID={`product-status-${p.id}`}>
                      <ProductStatusBadge status={p.status} />
                    </View>
                    {p.status === "approved" && !p.active && <Muted style={{ fontSize: 12 }}>Tạm ngừng bán</Muted>}
                    {p.status === "rejected" && p.reject_reason && <Text style={{ fontSize: 12, color: colors.destructive }}>Lý do: {p.reject_reason}</Text>}
                  </View>
                </Row>
                {p.status === "approved" ? <Muted style={{ fontSize: 12 }}>Quản lý sửa</Muted> : <ProductForm product={p} />}
              </Card>
            ))
          )
        }
      </Loaded>
    </Screen>
  );
}
