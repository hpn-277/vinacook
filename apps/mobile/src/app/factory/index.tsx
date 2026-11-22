import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";
import { formatKg } from "@noodle/core/domain/money";
import { JobBadge } from "@/components/status";
import { Badge, Body, Card, Heading, Loaded, Muted, Row, Screen, Title } from "@/components/ui";
import { api, json } from "@/lib/api";

export default function FactoryToday() {
  const query = useQuery({ queryKey: ["factory", "days"], queryFn: () => json(api.factory.days.$get()) });
  return (
    <Screen refreshing={query.isRefetching} onRefresh={query.refetch} testID="factory-today">
      <Title>Lệnh sản xuất</Title>
      <Muted>Trước khi quản lý chốt, xưởng thấy số kg dự kiến của cả ngày để chuẩn bị. Sau khi chốt, đây là lệnh chính thức của xưởng.</Muted>
      <Loaded query={query}>
        {(days) =>
          days.map((d) => (
            <Card key={d.date} testID={`factory-day-${d.date}`}>
              <Row style={{ flexWrap: "wrap" }}>
                <Heading>{d.label}</Heading>
                <Muted>· {d.date}</Muted>
                <Badge label={d.closed ? "Đã chốt" : "Dự kiến (chưa chốt)"} tone={d.closed ? "neutral" : "warning"} />
              </Row>
              {d.rows.length === 0 ? (
                <Muted>{d.closed ? "Xưởng không có lệnh ngày này." : "Chưa có đơn."}</Muted>
              ) : (
                <>
                  {d.rows.map((r) => (
                    <Row key={r.key} style={{ justifyContent: "space-between" }}>
                      <View testID={d.closed ? `job-${r.key}` : `draft-${d.date}-${r.key}`} style={{ flex: 1, gap: 4 }}>
                        <Body style={{ fontWeight: "500" }}>{r.product}</Body>
                        {r.status ? <JobBadge status={r.status} /> : <Badge label="Dự kiến" />}
                      </View>
                      <Body>{formatKg(r.kg)}</Body>
                    </Row>
                  ))}
                  <Row style={{ justifyContent: "space-between", borderTopWidth: 1, borderColor: "#E5E5E5", paddingTop: 8 }}>
                    <Body style={{ fontWeight: "600" }}>Tổng</Body>
                    <Body testID={`day-total-${d.date}`} style={{ fontWeight: "600" }}>
                      {formatKg(d.rows.reduce((s, r) => s + r.kg, 0))}
                    </Body>
                  </Row>
                  {!d.closed && <Muted>Tổng nhu cầu của cả ngày, chưa chia cho từng xưởng. Số kg có thể thay đổi đến khi chốt.</Muted>}
                </>
              )}
            </Card>
          ))
        }
      </Loaded>
    </Screen>
  );
}
