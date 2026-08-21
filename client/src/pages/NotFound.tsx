import { Button } from "@/components/ui/button";
import { ArrowLeft, Compass } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const copy = language === "en"
    ? {
        label: "Page not found",
        title: "It looks like you wandered off the plan.",
        description: "This page does not exist or has been moved. Return to your workspace to continue your day.",
        action: "Back to TaskFlow",
      }
    : {
        label: "Không tìm thấy trang",
        title: "Có vẻ bạn đã đi lệch khỏi kế hoạch.",
        description: "Trang này không tồn tại hoặc đã được di chuyển. Trở về không gian làm việc để tiếp tục ngày của bạn.",
        action: "Về TaskFlow",
      };

  return (
    <main className="not-found-shell min-h-screen px-5 py-10">
      <section className="not-found-card mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center overflow-hidden">
        <div className="grid w-full gap-12 px-7 py-14 md:grid-cols-[0.7fr_1fr] md:items-center md:px-14">
          <div aria-hidden="true" className="not-found-mark">
            404
          </div>
          <div>
            <p className="mono-label text-[var(--terracotta)]">{copy.label}</p>
            <h1 className="mt-4 max-w-xl font-display text-5xl leading-[0.96] tracking-[-0.04em] text-[var(--ink)] md:text-7xl">
              {copy.title}
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-[var(--ink-muted)]">
              {copy.description}
            </p>
            <Button onClick={() => setLocation("/")} size="lg" className="mt-9 rounded-xl px-5 shadow-sm">
              <ArrowLeft className="h-4 w-4" />
              {copy.action}
            </Button>
          </div>
        </div>
        <Compass aria-hidden="true" className="not-found-compass" />
      </section>
    </main>
  );
}
