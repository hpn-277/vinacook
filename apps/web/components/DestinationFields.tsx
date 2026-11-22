"use client";

import { useState } from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { AU_STATES, COUNTRIES, COUNTRY_LABEL, HCMC, VN_PROVINCES, type Country, type Destination } from "@noodle/core/domain/destination";
import { DISTRICTS } from "@noodle/core/domain/districts";

/**
 * Country, then Việt Nam's tỉnh/thành (HCMC picks a dispatch district) or an Australian address.
 * Field names match lib/mutations' destination(fd). `id` prefixes the input ids so two forms can share a page.
 */
export function DestinationFields({ id, value }: { id: string; value?: Destination | null }) {
  const [country, setCountry] = useState<Country>(value?.country ?? "VN");
  const [region, setRegion] = useState(value?.region ?? (country === "VN" ? HCMC : ""));
  const same = value?.country === country;
  const pickCountry = (c: Country) => {
    setCountry(c);
    setRegion(c === value?.country ? value.region : c === "VN" ? HCMC : "");
  };

  return (
    <>
      <Field>
        <FieldLabel htmlFor={`${id}-country`}>Quốc gia</FieldLabel>
        <NativeSelect id={`${id}-country`} name="country" value={country} onChange={(e) => pickCountry(e.target.value as Country)} className="w-full">
          {COUNTRIES.map((c) => (
            <NativeSelectOption key={c} value={c}>
              {COUNTRY_LABEL[c]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      {country === "AU" && (
        <Field>
          <FieldLabel htmlFor={`${id}-company`}>Công ty (nếu có)</FieldLabel>
          <Input id={`${id}-company`} name="company" defaultValue={value?.company ?? ""} placeholder="KHOUSE PTY LTD" />
        </Field>
      )}
      <Field>
        <FieldLabel htmlFor={`${id}-address`}>{country === "AU" ? "Street address" : "Địa chỉ (số nhà, đường)"}</FieldLabel>
        <Input id={`${id}-address`} name="address" required defaultValue={same ? value?.address : ""} placeholder={country === "AU" ? "7 Glassop St" : undefined} />
      </Field>
      {country === "VN" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`${id}-region`}>Tỉnh/Thành</FieldLabel>
            <NativeSelect id={`${id}-region`} name="region" required value={region} onChange={(e) => setRegion(e.target.value)} className="w-full">
              {VN_PROVINCES.map((p) => (
                <NativeSelectOption key={p}>{p}</NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          {region === HCMC ? (
            <Field key="hcmc">
              <FieldLabel htmlFor={`${id}-district`}>Quận/Huyện</FieldLabel>
              <NativeSelect
                id={`${id}-district`}
                name="district"
                required
                defaultValue={same && value?.region === HCMC ? value.district : ""}
                className="w-full"
              >
                <NativeSelectOption value="" disabled>
                  Chọn quận/huyện
                </NativeSelectOption>
                {DISTRICTS.map((d) => (
                  <NativeSelectOption key={d}>{d}</NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          ) : (
            <Field key="province">
              <FieldLabel htmlFor={`${id}-district`}>Phường/Xã, Quận/Huyện</FieldLabel>
              <Input id={`${id}-district`} name="district" required defaultValue={same && value?.region === region ? value.district : ""} />
            </Field>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_auto_auto] gap-3">
          <Field>
            <FieldLabel htmlFor={`${id}-district`}>Suburb</FieldLabel>
            <Input id={`${id}-district`} name="district" required defaultValue={same ? value?.district : ""} placeholder="Yagoona" />
          </Field>
          <Field className="w-24">
            <FieldLabel htmlFor={`${id}-region`}>State</FieldLabel>
            <NativeSelect id={`${id}-region`} name="region" required value={region} onChange={(e) => setRegion(e.target.value)} className="w-full">
              <NativeSelectOption value="" disabled>
                —
              </NativeSelectOption>
              {AU_STATES.map((s) => (
                <NativeSelectOption key={s}>{s}</NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field className="w-24">
            <FieldLabel htmlFor={`${id}-postcode`}>Postcode</FieldLabel>
            <Input
              id={`${id}-postcode`}
              name="postcode"
              required
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              defaultValue={same ? (value?.postcode ?? "") : ""}
              placeholder="2199"
            />
          </Field>
        </div>
      )}
    </>
  );
}
