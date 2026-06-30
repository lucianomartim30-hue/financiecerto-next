import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

// Fonte auto-hospedada pelo próprio site (sem pedido externo render-blocking).
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-inter",
});
import Header from "@/components/Header";
import ChatFab from "@/components/ChatFab";
import FooterWrapper from "@/components/FooterWrapper";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "FinancieCerto — Plataforma Inteligente de Descoberta Imobiliária",
  description: "Simule seu financiamento e encontre o imóvel certo — do econômico ao médio e alto padrão. Descubra sua faixa, taxa real e os imóveis compatíveis com sua renda. MCMV, SBPE, SFI e FGTS.",
  keywords: "financiamento imobiliário, imóveis São Paulo, MCMV, SBPE, SFI, alto padrão, médio padrão, simulador de financiamento, FGTS, Caixa Econômica",
  verification: {
    google: 'l34uBI3ef56FcK3A9RXJPN4eiOXmRx-gJDTxcbQ_zNc',
  },
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    title: 'FinancieCerto',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    title: "FinancieCerto — Plataforma Inteligente de Descoberta Imobiliária",
    description: "Descubra o imóvel certo para sua realidade financeira.",
    url: "https://financiecerto.com.br",
    siteName: "FinancieCerto",
    locale: "pt_BR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: '#1d4ed8',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-5FCF1KE9XP"
          strategy="beforeInteractive"
        />
        <Script id="google-analytics" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-5FCF1KE9XP');
          `}
        </Script>
        <Header />
        <main style={{ flex: 1 }}>
          {children}
        </main>
        <FooterWrapper />
        <ChatFab />
        <Analytics />
        <SpeedInsights />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
