import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navigation, Footer } from "@/components/navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "BracketForge - Tournament Bracket Generator",
  description: "Create and manage professional tournament brackets with real-time updates, game-specific features, and comprehensive participant management.",
  keywords: "tournament, bracket, esports, gaming, competition, management, league of legends, smash bros, cs2, valorant",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Navigation />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
