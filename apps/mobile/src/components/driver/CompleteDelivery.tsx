import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Image, Modal, Pressable, View } from "react-native";
import { api, filePart, upload } from "@/lib/api";
import { useAction } from "@/lib/mutation";
import { Body, Button, colors, Heading, Muted, Notice } from "@/components/ui";

const MAX_SIDE = 1600;

/** Same re-encode as the web's downscale(): JPEG 0.8, long edge at most MAX_SIDE. */
async function downscale(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  const context = ImageManipulator.manipulate(asset.uri);
  const long = Math.max(asset.width, asset.height);
  if (long > MAX_SIDE) context.resize(asset.width >= asset.height ? { width: MAX_SIDE, height: null } : { width: null, height: MAX_SIDE });
  const image = await context.renderAsync();
  return (await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 })).uri;
}

export function CompleteDelivery({ orderId, code, collect }: { orderId: number; code: string; collect: string }) {
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const action = useAction(
    async () => {
      const fd = new FormData();
      fd.append("order_id", String(orderId));
      if (photo) fd.append("photo", filePart(photo, `${code}.jpg`));
      return upload(api.driver.orders[":id"].complete.$url({ param: { id: String(orderId) } }), "POST", fd);
    },
    () => setOpen(false),
  );

  async function pick(source: "camera" | "library") {
    setPhotoError(null);
    try {
      if (source === "camera" && !(await ImagePicker.requestCameraPermissionsAsync()).granted) throw new Error("camera denied");
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: "images" };
      const result = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return;
      setPhoto(await downscale(result.assets[0]));
    } catch {
      setPhoto(null);
      setPhotoError("Không đọc được ảnh, hãy chụp lại");
    }
  }

  return (
    <>
      <Button size="lg" label="HOÀN THÀNH GIAO HÀNG" testID={`complete-${code}`} onPress={() => setOpen(true)} />
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 16 }}>
          <View testID={`complete-dialog-${code}`} style={{ backgroundColor: colors.card, borderRadius: 12, padding: 16, gap: 12 }}>
            <Heading>Hoàn thành đơn {code}</Heading>
            <Muted>{collect}</Muted>
            <Pressable
              testID={`photo-${code}`}
              accessibilityRole="button"
              accessibilityLabel="Ảnh bằng chứng giao hàng"
              onPress={() => pick("camera")}
              style={{ minHeight: 160, borderWidth: 1, borderStyle: "dashed", borderColor: colors.border, borderRadius: 10, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center", padding: 12, overflow: "hidden" }}
            >
              {photo ? (
                <Image source={{ uri: photo }} accessibilityLabel="Ảnh bằng chứng giao hàng" style={{ width: "100%", height: 240 }} resizeMode="contain" />
              ) : (
                <Body style={{ textAlign: "center", color: colors.mutedForeground }}>Chụp phiếu ký nhận hoặc ảnh hàng tại điểm nhận (không bắt buộc)</Body>
              )}
            </Pressable>
            {photo && <Muted style={{ textAlign: "center" }}>Bấm vào ảnh để chụp lại</Muted>}
            <Button variant="ghost" size="sm" label="Chọn ảnh từ thư viện" testID={`photo-library-${code}`} onPress={() => pick("library")} />
            {photoError ? <Notice result={{ ok: false, text: photoError }} /> : <Notice result={action.result} />}
            <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
              <Button variant="outline" label="Quay lại" testID={`complete-cancel-${code}`} onPress={() => setOpen(false)} />
              <Button label="Xác nhận đã giao" testID={`complete-confirm-${code}`} pending={action.pending} onPress={() => action.run()} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
