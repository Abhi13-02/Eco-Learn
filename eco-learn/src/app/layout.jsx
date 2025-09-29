import { Geist, Geist_Mono } from "next/font/google";
import Providers from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bodyClass = [geistSans.variable, geistMono.variable, "antialiased"].join(" ");

export const metadata = {
  title: "Eco-Learn",
  description: "...",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={bodyClass}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
