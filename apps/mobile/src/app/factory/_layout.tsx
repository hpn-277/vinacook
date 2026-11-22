import { RoleTabs } from "@/components/RoleTabs";

export default function FactoryLayout() {
  return (
    <RoleTabs
      role="factory"
      tabs={[
        { name: "index", title: "Hôm nay" },
        { name: "overview", title: "Tổng quan tháng" },
        { name: "products", title: "Sản phẩm" },
      ]}
    />
  );
}
