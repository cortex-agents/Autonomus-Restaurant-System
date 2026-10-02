import "../styles/globals.css";
import { Inter, Playfair_Display } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { QueryClientProviderWrapper } from "@/components/providers/QueryClientProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BistroBot — Restaurant Dashboard",
  description:
    "Run your restaurant on autopilot: WhatsApp AI order-taking, live orders, menu and customer escalations in one place.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#5f1a22",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-body">
        <AuthProvider>
          <ToastProvider>
            <QueryClientProviderWrapper>{children}</QueryClientProviderWrapper>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
