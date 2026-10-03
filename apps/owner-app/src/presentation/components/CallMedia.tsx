import React from "react";
import { Card, T } from "./UI";
import { CallMediaProps } from "./CallMedia.types";
export default function CallMedia(_props: CallMediaProps) {
  return (
    <Card>
      <T>
        Panggilan audio/video asli tersedia pada development build Android dan
        iOS. Browser ini hanya menampilkan status panggilan.
      </T>
    </Card>
  );
}
