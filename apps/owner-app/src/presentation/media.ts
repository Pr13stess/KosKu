import * as Picker from "expo-image-picker";
import * as Manipulator from "expo-image-manipulator";
import { MediaInput } from "../domain/models";
export async function chooseImage(
  camera = false,
): Promise<Omit<MediaInput, "purpose"> | null> {
  if (camera) {
    const p = await Picker.requestCameraPermissionsAsync();
    if (!p.granted)
      throw new Error(
        "Izin kamera belum diberikan. Anda masih dapat memilih dari galeri.",
      );
  }
  const result = camera
    ? await Picker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 })
    : await Picker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const photo = await Manipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: Math.min(asset.width || 1200, 1600) } }],
    { compress: 0.75, format: Manipulator.SaveFormat.JPEG, base64: true },
  );
  if (!photo.base64) throw new Error("Foto gagal diproses.");
  if (photo.base64.length > 7_000_000)
    throw new Error("Foto terlalu besar. Pilih gambar di bawah 5 MB.");
  return { base64: photo.base64, mime: "image/jpeg" };
}
