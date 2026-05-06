import Header from "./Header";
import ChatAssistant from "./ChatAssistant";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white tt-grain">
      <Header />
      <main className="w-full max-w-screen-2xl mx-auto px-4 md:px-8 py-6 md:py-8" data-testid="app-main">
        {children}
      </main>
      <footer className="border-t border-white/5 mt-12 py-8 text-center text-xs text-zinc-600 uppercase tracking-widest" data-testid="app-footer">
        TT PRO · The Live Table Tennis Command Center
      </footer>
      <ChatAssistant />
    </div>
  );
}
