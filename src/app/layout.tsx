import Link from "next/link";
import { Book, GitBranch, MessageSquare, LayoutDashboard } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased flex flex-col">
        <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
          <div className="container mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2 font-semibold">
                <Book className="w-5 h-5 text-primary" />
                <span>AI Doc Engine</span>
              </Link>
              <nav className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
                <Link href="/" className="hover:text-foreground transition-colors flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <Link href="/docs" className="hover:text-foreground transition-colors flex items-center gap-2">
                  <Book className="w-4 h-4" />
                  Documentation
                </Link>
                <Link href="/changes" className="hover:text-foreground transition-colors flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  Changes
                </Link>
                <Link href="/chat" className="hover:text-foreground transition-colors flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Chat
                </Link>
              </nav>
            </div>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 py-8">
          {children}
        </main>
        
        <Toaster />
      </body>
    </html>
  );
}
