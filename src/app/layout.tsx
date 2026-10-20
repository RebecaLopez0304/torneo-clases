import type { Metadata } from "next";
import { Saira, Saira_Condensed } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

const saira = Saira({
  variable: "--font-saira",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const sairaCondensed = Saira_Condensed({
  variable: "--font-saira-condensed",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Torneo de clases",
  description: "Eliminatorias y marcador en vivo para torneos entre equipos de clases universitarias.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${saira.variable} ${sairaCondensed.variable}`}>
        <AuthProvider>
          <div className="relative z-10">{children}</div>
        </AuthProvider>
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            style: {
              background: "var(--navy-800)",
              border: "1px solid var(--line)",
              color: "var(--ink)",
              fontFamily: "var(--font-saira)",
            },
          }}
        />
      </body>
    </html>
  );
}
