
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import DailyGoalWidget from "./_components/widgets/DailyGoalWidget";
import { ConfirmProvider } from "./_components/modals/ConfirmDialog";
import Companion from "./_components/AI/companion/Companion";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Your Mind",
  description: "Organize ideias, código, lembretes e processos em fluxogramas.",
  icons: {
    icon: "/logo2.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col relative">
        {/* Widget da meta do dia */}
        <DailyGoalWidget />

        <ConfirmProvider>
          {children}
        </ConfirmProvider>

        
      </body>
    </html>
  );
}
