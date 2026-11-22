import { RoleTabs } from "@/components/RoleTabs";

export default function SaleTabs() {
  return (
    <RoleTabs
      role="sale"
      tabs={[
        { name: "index", title: "Tổng quan" },
        { name: "new", title: "Tạo đơn" },
        { name: "customers", title: "Khách hàng" },
      ]}
    />
  );
}
