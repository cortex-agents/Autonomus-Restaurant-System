import "../styles/globals.css";
import { Inter } from "next/font/google";
import { Playfair_Display } from "next/font/google";
import type { Metadata } from "next";
import { QueryClientProviderWrapper } from "@/components/providers/QueryClientProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";

// Initialize fonts to inject CSS (we don't need the className as we use CSS variables)
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] });
const playfairDisplay = Playfair_Display({ subsets: ['latin'], weight: ['500', '600', '700'] });
// Use the variables to prevent unused variable warnings
inter;
playfairDisplay;

export const metadata: Metadata = {
  title: "Restaurant Owner Dashboard",
  description: "Manage your restaurant operations with AI-powered order taking",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head></head>
      <body className="font-body">
        <AuthProvider>
          <ToastProvider>
            <QueryClientProviderWrapper>
              {children}
            </QueryClientProviderWrapper>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
