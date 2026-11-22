import { RoleTabs } from "@/components/RoleTabs";

export default function DriverLayout() {
  return <RoleTabs role="driver" tabs={[{ name: "index", title: "Đơn cần giao" }]} />;
}
