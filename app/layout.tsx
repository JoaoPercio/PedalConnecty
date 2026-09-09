import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { QueryProvider } from "@/contexts/QueryProvider";
import { SerwistRegister } from "@/components/SerwistRegister";
import { OfflineBanner } from "@/components/OfflineBanner";
import { PushNotificationPrompt } from "@/components/PushNotificationPrompt";
import { UsabilityTestHost } from "@/components/usability-tests/UsabilityTestHost";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PedalConnect",
  description: "Plataforma para organizar pedais em grupo",
  applicationName: "PedalConnect",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PedalConnect",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#1B5E20",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <AuthProvider>
            <SerwistRegister />
            <OfflineBanner />
            <PushNotificationPrompt />
            {children}
            <UsabilityTestHost />
            <Toaster position="top-center" richColors closeButton />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
