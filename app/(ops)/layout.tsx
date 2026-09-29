import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Ops", template: "%s · Ops · Ice Age Expeditions" },
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default function OpsGroupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
