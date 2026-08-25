import type { Metadata, Viewport } from "next";
import { Caprasimo, Figtree } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const caprasimo = Caprasimo({
  variable: "--font-caprasimo",
  weight: "400",
  subsets: ["latin"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  weight: "variable",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "dispensa.me",
  description: "Gestão de estoque doméstico",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "dispensa.me",
  },
};

export const viewport: Viewport = {
  themeColor: "#c67139",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${caprasimo.variable} ${figtree.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-ink">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
