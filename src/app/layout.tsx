import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";

export const metadata: Metadata = {
  title: "Huntly — Personal AI Job Discovery",
  description: "Automated startup and ATS job discovery platform for software engineering opportunities",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0B0F17] text-slate-100 min-h-screen antialiased flex">
        <Sidebar />
        <main className="ml-64 flex-1 min-h-screen flex flex-col bg-[#0B0F17]">
          {children}
        </main>
      </body>
    </html>
  );
}

