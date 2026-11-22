import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { launchImageLibraryAsync } from "expo-image-picker";
import { useState } from "react";
import { Image, Modal, View } from "react-native";
import type { FactoryProduct } from "@noodle/core/queries/factory";
import { Button, Field, Heading, Muted, Notice, Row, Screen, Title } from "@/components/ui";
import { api, filePart, fileUri, upload } from "@/lib/api";
import { useAction } from "@/lib/mutation";

const MAX_SIDE = 800;

/** Same as the web's ImageFileInput: a JPEG no larger than MAX_SIDE on its long edge. */
async function pickImage() {
  const picked = await launchImageLibraryAsync({ mediaTypes: "images" });
  const asset = picked.canceled ? null : picked.assets[0];
  if (!asset) return null;
  const ctx = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > MAX_SIDE) ctx.resize(asset.width >= asset.height ? { width: MAX_SIDE, height: null } : { width: null, height: MAX_SIDE });
  const image = await (await ctx.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  return image.uri;
}

type Draft = { name: string; price: string; description: string; image: string | null };
const draftOf = (p?: FactoryProduct): Draft => ({ name: p?.name ?? "", price: p ? String(p.pack_prices[0] ?? "") : "", description: p?.description ?? "", image: null });

/** Add (no product) or fix-and-resubmit (pending/rejected product); closes once the server accepts it. */
export function ProductForm({ product }: { product?: FactoryProduct }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(draftOf(product));
  const key = product ? String(product.id) : "new";
  const action = useAction(
    async () => {
      const fd = new FormData();
      fd.append("name", draft.name);
      fd.append("price_per_kg", draft.price);
      fd.append("description", draft.description);
      if (draft.image) fd.append("image_file", filePart(draft.image, "image.jpg"));
      const url = product ? api.factory.products[":id"].$url({ param: { id: String(product.id) } }) : api.factory.products.$url();
      return upload(url, product ? "PATCH" : "POST", fd);
    },
    () => setOpen(false),
  );
  const title = product ? `Sửa ${product.name}` : "Thêm sản phẩm";

  return (
    <View style={{ gap: 8 }}>
      <Button
        label={product ? "Sửa" : "Thêm sản phẩm"}
        accessibilityLabel={title}
        size={product ? "sm" : "md"}
        variant={product ? "outline" : "default"}
        testID={product ? `edit-product-${product.id}` : "add-product"}
        onPress={() => {
          setDraft(draftOf(product));
          action.reset();
          setOpen(true);
        }}
      />
      {!open && <Notice result={action.result} />}
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <Screen testID={`product-form-${key}`}>
          <Title>{title}</Title>
          <Muted>Quản lý duyệt xong thì khách mới thấy. Quy cách mặc định: Cây 5 kg, Thùng 5/10/15 kg, Bao 30 kg.</Muted>
          <Field label="Tên sản phẩm" testID="product-name" value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} />
          <Field label="Giá đề xuất (đ/kg)" testID="product-price" keyboardType="number-pad" value={draft.price} onChangeText={(price) => setDraft({ ...draft, price })} />
          <Field
            label="Mô tả"
            testID="product-description"
            placeholder="Nguyên liệu, cách dùng, hạn dùng"
            maxLength={1000}
            multiline
            style={{ minHeight: 80, textAlignVertical: "top" }}
            value={draft.description}
            onChangeText={(description) => setDraft({ ...draft, description })}
          />
          <Heading>Ảnh sản phẩm</Heading>
          <Row>
            {(draft.image ?? product?.image_url) && (
              <Image
                testID="product-image-preview"
                accessibilityLabel={draft.image ? "Ảnh mới" : `Ảnh hiện tại ${product?.name}`}
                source={{ uri: draft.image ?? fileUri(product!.image_url!) }}
                style={{ width: 80, height: 80, borderRadius: 8 }}
              />
            )}
            <Button
              label={draft.image ? "Chọn ảnh khác" : "Chọn ảnh"}
              variant="outline"
              size="sm"
              accessibilityLabel={`Tải ảnh ${product?.name ?? "sản phẩm mới"}`}
              testID="product-image"
              onPress={async () => {
                const image = await pickImage().catch(() => null);
                if (image) setDraft((d) => ({ ...d, image }));
              }}
            />
          </Row>
          <Muted>{product?.image_url ? "Chọn ảnh khác để thay; để trống thì giữ ảnh cũ." : "JPEG, PNG hoặc WebP; ảnh được tự thu nhỏ trước khi tải lên."}</Muted>
          <Notice result={action.result} />
          <Button label={product ? "Lưu và gửi duyệt lại" : "Gửi để duyệt"} testID="product-submit" pending={action.pending} onPress={() => action.run()} />
          <Button label="Đóng" variant="ghost" testID="product-cancel" onPress={() => setOpen(false)} />
        </Screen>
      </Modal>
    </View>
  );
}
