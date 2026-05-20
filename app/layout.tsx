import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Управляй ветром | Интерактивный опыт",
  description: "Прокрути вниз — и посмотри что будет. Ветер срывает платье, одежда кружится вокруг.",
  openGraph: {
    title: "Управляй ветром",
    description: "Интерактивный шуточный опыт: скроллом управляй анимацией ветра.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
