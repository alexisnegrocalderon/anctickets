import GoogleSignInButton from "./google-sign-in-button";
import MagicLinkForm from "./magic-link-form";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center gap-6 px-4 text-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ANC Tickets</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Inicia sesión para comprar entradas o crear tus propios eventos.
        </p>
      </div>
      <GoogleSignInButton />
      <div className="flex w-full items-center gap-3 text-xs text-neutral-400">
        <span className="h-px flex-1 bg-neutral-200" />
        <span>o</span>
        <span className="h-px flex-1 bg-neutral-200" />
      </div>
      <MagicLinkForm />
    </div>
  );
}
