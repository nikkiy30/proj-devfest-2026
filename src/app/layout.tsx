import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "お気持ちAI（仮名）｜気持ちに、ちいさな寄り道。",
    template: "%s｜お気持ちAI（仮名）",
  },
  description: "いまの気持ちに合う体験を選んで、ひと息つこう。",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
