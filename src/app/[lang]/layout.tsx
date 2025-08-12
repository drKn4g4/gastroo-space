// src/app/[lang]/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./providers/AuthProvider";
import ThemeRegistry from "./components/ThemeRegistry";
import Navbar from "./components/Navbar"; // Importujemy Navbar
import { languages } from "@/lib/i18n/settings";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "gastroo_space",
  description: "Twój pilot do zarządzania restauracją!",
};

export async function generateStaticParams() {
  return languages.map((lng) => ({ lang: lng }));
}

export default function RootLayout({
  children,
  params: { lang },
}: {
  children: React.ReactNode;
  params: { lang: string };
}) {
  return (
    <html lang={lang} dir="ltr" suppressHydrationWarning={true}>
      <body className={inter.className}>
        <AuthProvider>
          <ThemeRegistry>
            <Navbar /> {/* Navbar jest częścią layoutu */}
            <main>{children}</main> {/* Tutaj renderuje się treść strony */}
          </ThemeRegistry>
        </AuthProvider>
      </body>
    </html>
  );
}