import GoogleSignInButton from "./google-sign-in-button";
import MagicLinkForm from "./magic-link-form";

export default function LoginPage() {
  return (
    <main className="relative isolate grid min-h-screen place-items-center overflow-hidden bg-[#090909] px-5 py-10 text-[#f5f4f1]">
      <video className="absolute inset-0 -z-20 h-full w-full object-cover grayscale contrast-125 brightness-[.3]" autoPlay muted loop playsInline preload="metadata" poster="https://files.manuscdn.com/user_upload_by_module/session_file/310519663820533004/tmjnuDhpwrWwdDyk.jpg"><source src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663820533004/GbHXpGORdFcoZgeV.mp4" type="video/mp4" /></video>
      <div className="absolute inset-0 -z-10 bg-black/60" />
      <div className="w-full max-w-md rounded-[2rem] border border-white/15 bg-black/70 p-7 shadow-2xl backdrop-blur-xl sm:p-9">
        <p className="text-xs font-bold tracking-[.28em] text-[#c3adff]">ANC / ACCESO</p>
        <h1 className="mt-3 text-4xl font-black leading-[.86] tracking-[-.07em]">ENTRA A<br /><span className="text-[#a77fff]">LA NOCHE.</span></h1>
        <p className="mt-5 text-sm leading-6 text-neutral-300">Ingresa para comprar entradas, crear experiencias y controlar tu puerta.</p>
        <div className="mt-7">
          <GoogleSignInButton />
        </div>
        <div className="my-6 flex w-full items-center gap-3 text-xs text-neutral-500">
          <span className="h-px flex-1 bg-white/15" />
          <span>o por correo</span>
          <span className="h-px flex-1 bg-white/15" />
        </div>
        <MagicLinkForm />
      </div>
    </main>
  );
}
