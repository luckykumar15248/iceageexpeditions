import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/ops/login-form";
import { getOpsStaff } from "@/lib/ops-auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function OpsLoginPage() {
  const staff = await getOpsStaff();
  if (staff) redirect("/ops");

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-16">
      <section className="w-full max-w-lg rounded-3xl border border-line bg-paper p-8 shadow-[0_12px_32px_rgba(26,29,27,0.07)] sm:p-10">
        <p className="h-1 w-12 bg-alpine" aria-hidden="true" />
        <p className="mt-5 text-base font-semibold tracking-[0.14em] text-alpine uppercase">The Era of Trails</p>
        <h1 className="mt-3 font-display text-5xl font-bold text-ink">Staff sign in</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          Ops admin, expedition lead, guide, finance, and viewer accounts sign in here. This form does not create a
          public account, and it does not show traveler medical notes.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
