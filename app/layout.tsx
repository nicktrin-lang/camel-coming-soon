import Script from "next/script";

export const metadata = {
  title: "Camel Global",
  description: "Meet and Greet Car Hire",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-1Y758X38G4"
          strategy="afterInteractive"
        />
        <Script id="ga-customer-site" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-1Y758X38G4');
          `}
        </Script>

        {children}
      </body>
    </html>
  );
}