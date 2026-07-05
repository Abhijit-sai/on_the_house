"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { formatMoney } from "@/lib/format";

export function QrSheet({
  open,
  onClose,
  upiUri,
  payeeName,
  amount,
}: {
  open: boolean;
  onClose: () => void;
  upiUri: string;
  payeeName: string;
  amount: number;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    QRCode.toDataURL(upiUri, { width: 480, margin: 2, color: { dark: "#070707", light: "#FFF4D6" } })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [open, upiUri]);

  return (
    <BottomSheet open={open} onClose={onClose} title="Scan to pay">
      <div className="space-y-4 pb-2 text-center">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt={`UPI QR code paying ${payeeName}`} className="mx-auto w-64 rounded-2xl" />
        ) : (
          <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-2xl bg-elevated text-sm text-muted">
            Generating QR…
          </div>
        )}
        <p className="text-sm text-muted">
          Pay <span className="font-bold text-white">{formatMoney(amount)}</span> to{" "}
          <span className="font-bold text-white">{payeeName}</span> with any UPI app.
        </p>
      </div>
    </BottomSheet>
  );
}
