"use client";

/** ANC Rave Editorial Noir: optional, subtle sound keeps the visitor in control. */
import { useEffect, useRef, useState } from "react";

const AMBIENT_TRACK = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663820533004/ITSnVXHPqDcOzWbC.mp3";

export default function AmbientSoundControl() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    setEnabled(sessionStorage.getItem("anc-sound") === "on");
  }, []);

  useEffect(() => {
    if (!ready || !audioRef.current) return;
    sessionStorage.setItem("anc-sound", enabled ? "on" : "off");
    if (enabled) {
      audioRef.current.play().catch(() => setEnabled(false));
      return;
    }
    audioRef.current.pause();
  }, [enabled, ready]);

  return (
    <div className="absolute bottom-6 right-5 z-20 sm:bottom-8 sm:right-10">
      <audio ref={audioRef} src={AMBIENT_TRACK} loop preload="metadata" />
      <button
        type="button"
        aria-pressed={enabled}
        aria-label={enabled ? "Desactivar sonido ambiental" : "Activar sonido ambiental"}
        onClick={() => setEnabled((value) => !value)}
        className="flex items-center gap-2 rounded-full border border-white/25 bg-black/35 px-3 py-2 text-[10px] font-black tracking-[.18em] text-white backdrop-blur-md transition hover:border-[#c3adff] hover:text-[#c3adff]"
      >
        <span className={`h-1.5 w-1.5 rounded-full ${enabled ? "bg-[#a77fff] shadow-[0_0_10px_#a77fff]" : "bg-white/45"}`} />
        {enabled ? "SOUND ON" : "SOUND OFF"}
      </button>
    </div>
  );
}
