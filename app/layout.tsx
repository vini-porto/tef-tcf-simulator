import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Simulateur TEF/TCF Canada (non officiel)",
  description:
    "Simulateur indépendant et non officiel des examens TEF Canada et TCF Canada. Aucune affiliation avec le CCIP, France Éducation International ou le gouvernement du Canada.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8">
          <header className="mb-8">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
              Projet indépendant — aucune affiliation officielle avec le CCIP, France
              Éducation International ou le gouvernement du Canada
            </p>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="mt-12 border-t border-slate-200 pt-4 text-xs text-slate-500">
            Simulateur non officiel — à des fins d&rsquo;entraînement uniquement.
          </footer>
        </div>
      </body>
    </html>
  );
}
