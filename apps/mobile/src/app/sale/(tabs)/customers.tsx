import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Linking, Text, View } from "react-native";
import { formatVnd } from "@noodle/core/domain/money";
import { Body, Button, Card, Loaded, Muted, Screen, Title, colors } from "@/components/ui";
import { api, json } from "@/lib/api";

export default function SaleCustomers() {
  const q = useQuery({ queryKey: ["sale", "customers"], queryFn: () => json(api.sale.customers.$get()) });
  return (
    <Screen testID="sale-customers" refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Loaded query={q}>
        {(customers) => (
          <>
            <Title>Khách hàng của tôi ({customers.length})</Title>
            {customers.map((c) => (
              <Card key={c.id} testID={`customer-${c.phone}`}>
                <View style={{ gap: 2 }}>
                  <Body>
                    <Text style={{ fontWeight: "700" }}>{c.name}</Text> ·{" "}
                    <Text accessibilityRole="link" style={{ color: colors.primary }} onPress={() => Linking.openURL(`tel:${c.phone}`)}>
                      {c.phone}
                    </Text>
                  </Body>
                  <Muted>
                    {c.default_address}, {c.default_district}
                  </Muted>
                  <Muted>
                    {c.orders} đơn · {formatVnd(c.total)}
                  </Muted>
                </View>
                <Button
                  label="Tạo đơn"
                  variant="outline"
                  size="sm"
                  testID={`new-order-${c.phone}`}
                  accessibilityLabel={`Tạo đơn ${c.name}`}
                  onPress={() => router.navigate({ pathname: "/sale/new", params: { phone: c.phone } })}
                />
              </Card>
            ))}
          </>
        )}
      </Loaded>
    </Screen>
  );
}
