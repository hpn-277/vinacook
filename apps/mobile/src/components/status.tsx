import { Text, View } from "react-native";
import {
  JOB_STATUS_LABEL,
  ORDER_STATUS_LABEL,
  PRODUCT_STATUS_LABEL,
  REVIEW_STATUS_LABEL,
  type JobStatus,
  type OrderStatus,
  type ProductStatus,
  type ReviewStatus,
} from "@noodle/core/domain/status";

/** Same tones as the web app's components/status-badge.tsx (Tailwind *-100 background, *-900 text). */
const ORDER_TONE: Record<OrderStatus, [string, string]> = {
  placed: ["#FEF9C2", "#733E0A"],
  in_production: ["#E0E7FF", "#312C85"],
  ready: ["#CBFBF1", "#0B4F4A"],
  assigned: ["#F3E8FF", "#59168B"],
  out_for_delivery: ["#DBEAFE", "#1C398E"],
  delivered: ["#DCFCE7", "#0D542B"],
  failed: ["#FFE2E2", "#82181A"],
  cancelled: ["#F5F5F5", "#737373"],
};
const JOB_TONE: Record<JobStatus, [string, string]> = { producing: ORDER_TONE.in_production, received: ORDER_TONE.ready };
const PRODUCT_TONE: Record<ProductStatus, [string, string]> = { pending: ORDER_TONE.placed, approved: ORDER_TONE.delivered, rejected: ORDER_TONE.failed };

const REVIEW_TONE: Record<ReviewStatus, [string, string]> = { pending: ["#FEF3C6", "#7B3306"], approved: ["#D0FAE5", "#004F3B"], rejected: ["#FFE2E2", "#82181A"] };

function Pill({ label, tone }: { label: string; tone: [string, string] }) {
  return (
    <View style={{ backgroundColor: tone[0], borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start" }}>
      <Text style={{ color: tone[1], fontSize: 12, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

export const OrderBadge = ({ status }: { status: OrderStatus }) => <Pill label={ORDER_STATUS_LABEL[status]} tone={ORDER_TONE[status]} />;
export const JobBadge = ({ status }: { status: JobStatus }) => <Pill label={JOB_STATUS_LABEL[status]} tone={JOB_TONE[status]} />;
export const ProductStatusBadge = ({ status }: { status: ProductStatus }) => <Pill label={PRODUCT_STATUS_LABEL[status]} tone={PRODUCT_TONE[status]} />;
export const ReviewBadge = ({ status }: { status: ReviewStatus }) => <Pill label={REVIEW_STATUS_LABEL[status]} tone={REVIEW_TONE[status]} />;
