import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import Header from "@/components/Header";
import ChatFab from "@/components/ChatFab";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "FinancieCerto — Plataforma Inteligente de Descoberta Imobiliária",
  description: "Simule seu financiamento, descubra sua faixa MCMV e encontre imóveis compatíveis com sua realidade financeira. MCMV, SBPE, crédito associativo — tudo em um só lugar.",
  keywords: "financiamento imobiliário, MCMV, Minha Casa Minha Vida, simulador, FGTS, Caixa Econômica",
  verification: {
    google: 'l34uBI3ef56FcK3A9RXJPN4eiOXmRx-gJDTxcbQ_zNc',
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-5FCF1KE9XP"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
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
        <Footer />
        <ChatFab />
      </body>
    </html>
  );
}
