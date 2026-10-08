// Login page. Sign in with a Nigerian phone number, then a 6-digit code.
import type { Metadata } from "next";
import { LoginFlow } from "./login-flow";

export const metadata: Metadata = {
  title: "Sign in — Foodrun",
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center bg-[#FFFCF7] px-6 py-10">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-500">
        Foodrun
      </p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-stone-900">
        Sign in
      </h1>
      <p className="mt-2 text-sm leading-6 text-stone-500">
        We send a 6-digit code to your phone. No password to remember.
      </p>

      <div className="mt-6">
        <LoginFlow />
      </div>

      <p className="mt-6 text-xs leading-5 text-stone-400">
        You can browse restaurants without signing in. We ask for this at
        checkout.
      </p>
    </main>
  );
}