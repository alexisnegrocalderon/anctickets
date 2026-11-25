"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/dashboard/ui";
import { resendOrderEmail } from "./actions";

export default function ResendEmailButton({ orderId, label = "Reenviar a mi correo" }: { orderId: string; label?: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button
        variant="outline"
        className="px-3 py-1.5 text-xs"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await resendOrderEmail(orderId);
            setMessage({ ok: res.ok, text: res.message });
          })
        }
      >
        {pending ? "Enviando…" : label}
      </Button>
      {message ? (
        <p role="status" className={`text-xs ${message.ok ? "text-emerald-400" : "text-red-400"}`}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
