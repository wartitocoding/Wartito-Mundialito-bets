import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wartito Mundialito Bets",
  description: "Predicciones del Mundial 2026 — Competí con tus amigos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
