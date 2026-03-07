import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StudioAI Neural Studio",
  description: "Orchestrate your local AI pipeline and publishing channels from one high-performance command center.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-background text-foreground`}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top bar */}
            <header className="h-12 border-b flex items-center px-6 gap-3 bg-white shrink-0">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-5 h-5 border rounded flex items-center justify-center text-xs">⊞</div>
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-xs font-medium tracking-widest uppercase text-muted-foreground">System Online</span>
              </div>
            </header>
            {/* Main content */}
            <main className="flex-1 overflow-y-auto bg-[#f0f4ff] p-8">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
