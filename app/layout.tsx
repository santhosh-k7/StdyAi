import type { Metadata, Viewport } from "next";
import "./globals.css";
import ThemeToggle from "@/components/theme-toggle";
import A11yBar from "@/components/a11y-bar";

export const metadata: Metadata = {
  title: "StdyAI — BIS-Compliant Adaptive Learning",
  description: "Generative BIS compliance engine + Digital Twin + Living Certificate. NEP 2020 aligned.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = { themeColor: "#4f46e5" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4f46e5" />
      </head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('stdyai-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}` }} />
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{})})}` }} />
        {children}
        <ThemeToggle />
        <A11yBar />
      </body>
    </html>
  );
}
