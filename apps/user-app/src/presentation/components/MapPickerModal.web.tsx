import { Text } from "react-native";
import type { ReferenceLocation } from "../../domain/models";
import { Sheet } from "./Sheet";
import { Button } from "./Primitives";
/** Maps are Android-only for now; the web build shows a notice instead. */
export function MapPickerModal({
  onClose,
}: {
  initial: ReferenceLocation | null;
  onClose: () => void;
  onConfirm: (point: ReferenceLocation) => void;
}) {
  return (
    <Sheet visible title="Peta" onClose={onClose}>
      <Text>Pemilihan lewat peta tersedia di aplikasi Android.</Text>
      <Button title="Tutup" onPress={onClose} secondary />
    </Sheet>
  );
}
