import "./globals.css";
import { headers } from "next/headers";
import type { Metadata } from "next";
import ClientRootLayout from "./ClientRootLayout";

export async function generateMetadata(): Promise<Metadata> {
  const headerStore = await headers();
  const host = headerStore.get("host") || "";
  const isTestSite = host.includes("test.camel-global.com");

  if (isTestSite) {
    return {
      title: "Camel Global Test",
      description: "Customer staging environment",
      robots: {
        index: false,
        follow: false,
        nocache: true,
        googleBot: {
          index: false,
          follow: false,
          noimageindex: true,
          "max-video-preview": -1,
          "max-image-preview": "none",
          "max-snippet": -1,
        },
      },
    };
  }

  return {
    title: "Camel Global",
    description: "Meet & greet car hire platform",
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientRootLayout>{children}</ClientRootLayout>;
}