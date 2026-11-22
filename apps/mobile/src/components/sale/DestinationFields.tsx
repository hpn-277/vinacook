import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { AU_STATES, COUNTRIES, COUNTRY_LABEL, HCMC, VN_PROVINCES, type Destination } from "@noodle/core/domain/destination";
import { DISTRICTS } from "@noodle/core/domain/districts";
import { Button, Field, colors, styles } from "@/components/ui";

/** The web DestinationFields: country, then a VN tỉnh/thành (HCMC picks a dispatch district) or an Australian address. */
export function DestinationFields({ value, onChange }: { value: Destination; onChange: (d: Destination) => void }) {
  const set = (patch: Partial<Destination>) => onChange({ ...value, ...patch });
  const vn = value.country === "VN";
  return (
    <>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {COUNTRIES.map((c) => (
          <Button
            key={c}
            label={COUNTRY_LABEL[c]}
            size="sm"
            variant={value.country === c ? "default" : "outline"}
            testID={`country-${c}`}
            onPress={() => c !== value.country && onChange({ country: c, region: c === "VN" ? HCMC : "", district: "", postcode: null, address: "", company: null })}
          />
        ))}
      </View>
      {!vn && <Field label="Công ty (nếu có)" testID="order-company" value={value.company ?? ""} onChangeText={(company) => set({ company: company || null })} />}
      <Field label={vn ? "Địa chỉ (số nhà, đường)" : "Street address"} testID="order-address" value={value.address} onChangeText={(address) => set({ address })} />
      {vn ? (
        <>
          <Picker label="Tỉnh/Thành" testID="order-region" value={value.region} options={VN_PROVINCES} onPick={(region) => set({ region, district: "" })} />
          {value.region === HCMC ? (
            <Picker label="Quận/Huyện" testID="order-district" value={value.district} options={DISTRICTS} onPick={(district) => set({ district })} />
          ) : (
            <Field label="Phường/Xã, Quận/Huyện" testID="order-district" value={value.district} onChangeText={(district) => set({ district })} />
          )}
        </>
      ) : (
        <>
          <Field label="Suburb" testID="order-district" value={value.district} onChangeText={(district) => set({ district })} />
          <Picker label="State" testID="order-region" value={value.region} options={AU_STATES} onPick={(region) => set({ region })} />
          <Field label="Postcode" testID="order-postcode" keyboardType="number-pad" maxLength={4} value={value.postcode ?? ""} onChangeText={(postcode) => set({ postcode })} />
        </>
      )}
    </>
  );
}

function Picker({ label, testID, value, options, onPick }: { label: string; testID: string; value: string; options: readonly string[]; onPick: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={() => setOpen((v) => !v)} style={[styles.input, { justifyContent: "center" }]}>
        <Text style={{ fontSize: 16, color: value ? colors.foreground : colors.mutedForeground }}>{value || `Chọn ${label.toLowerCase()}`}</Text>
      </Pressable>
      {open && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {options.map((o) => (
            <Button
              key={o}
              label={o}
              size="sm"
              variant={value === o ? "default" : "outline"}
              testID={`${testID}-${o}`}
              onPress={() => {
                onPick(o);
                setOpen(false);
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
