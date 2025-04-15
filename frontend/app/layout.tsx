import "@/app/globals.css";
import { Inter } from "next/font/google";
import type React from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "NeuraViva - AI-Powered Covalent Binding Prediction",
  description:
    "Enhancing drug discovery with advanced AI agents for accurate prediction of irreversible covalent binding of small molecule inhibitors to target proteins.",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

import { ThemeProvider } from "../components/theme-provider";
import "./globals.css";

