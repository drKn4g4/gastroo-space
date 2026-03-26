import type { Metadata } from "next";
import { AuthProvider } from "../[lang]/providers/AuthProvider";
import ThemeRegistry from "../[lang]/components/ThemeRegistry";

export const metadata: Metadata = {
  title: "Offline | Gastroo Space",
  description: "No internet connection",
};

export default function OfflineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeRegistry>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeRegistry>
  );
}
