import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { NotificationProvider } from "@/context/NotificationContext";
import { AppModalProvider } from "@/context/AppModalContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OSdex — Sistema de Gestão para Restaurantes",
  description: "Gerencie pedidos, mesas e equipes em tempo real",
  icons: {
    icon: "/icone-osdex.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
          (function() {
            try {
              var stored = localStorage.getItem('osdex-theme');
              var theme = stored === 'light' || stored === 'dark'
                ? stored
                : window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
              document.documentElement.classList.add('theme-' + theme);
              document.documentElement.style.colorScheme = theme;
            } catch(e) {}
          })();
        `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <AppModalProvider>
            <NotificationProvider>{children}</NotificationProvider>
          </AppModalProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
