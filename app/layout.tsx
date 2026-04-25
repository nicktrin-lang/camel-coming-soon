import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";
import { headers } from "next/headers";
import type { Metadata } from "next";
import ClientRootLayout from "./ClientRootLayout";

const font = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const headerStore = await headers();
  const host = headerStore.get("host") || "";
  const isTestSite = host.includes("test.camel-global.com");

  if (isTestSite) {
    return {
      title: "Camel Global",
      description: "Meet & greet car hire, delivered to your door.",
      robots: {
        index: false, follow: false, nocache: true,
        googleBot: {
          index: false, follow: false, noimageindex: true,
          "max-video-preview": -1, "max-image-preview": "none", "max-snippet": -1,
        },
      },
    };
  }
  return { title: "Camel Global", description: "Meet & greet car hire platform" };
}

function getGaId(host: string): string {
  if (host.includes("portal.camel-global.com")) return "G-YCZMDQJDM7";
  if (host.includes("test.camel-global.com"))   return "G-G90QB28J12";
  return "G-1Y758X38G4"; // camel-global.com (production customer site)
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers();
  const host = headerStore.get("host") || "";
  const gaId = getGaId(host);

  return (
    <html lang="en">
      <head>
        {/* Google Analytics */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
        <script
          // biome-ignore lint: GA inline script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){window.dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${gaId}');`,
          }}
        />
      </head>
      <body className={`${font.variable} min-h-screen flex flex-col`}>
        <ClientRootLayout fontClass={font.variable}>
          {children}
        </ClientRootLayout>
      </body>
    </html>
  );
}