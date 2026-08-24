import { Check, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GEMINI_MODEL_OPTIONS, type GeminiModel } from "../../../shared/geminiModels";
import { useLanguage } from "@/hooks/useLanguage";
import { trpc } from "@/lib/trpc";

export function GeminiModelSettings() {
  const { language } = useLanguage();
  const settings = trpc.profile.geminiModel.useQuery();
  const [selectedModel, setSelectedModel] = useState<GeminiModel>(GEMINI_MODEL_OPTIONS[0]!.value);
  const updateModel = trpc.profile.updateGeminiModel.useMutation({
    onSuccess: async () => {
      await settings.refetch();
      toast.success(language === "en" ? "Gemini model saved" : "Đã lưu mô hình Gemini");
    },
    onError: error => toast.error(error.message),
  });
  const [connectionModel, setConnectionModel] = useState<GeminiModel | null>(null);
  const testConnection = trpc.profile.testGeminiConnection.useMutation({
    onSuccess: result => {
      setConnectionModel(result.model);
      toast.success(language === "en" ? "Gemini connection is working" : "Kết nối Gemini đang hoạt động");
    },
    onError: error => {
      setConnectionModel(null);
      toast.error(error.message);
    },
  });

  useEffect(() => {
    if (settings.data) setSelectedModel(settings.data);
  }, [settings.data]);

  const details = GEMINI_MODEL_OPTIONS.find(option => option.value === selectedModel) ?? GEMINI_MODEL_OPTIONS[0]!;
  const isEnglish = language === "en";
  return (
    <section className="mt-8 border-t border-[var(--line)] pt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mono-label text-[var(--terracotta)]">Gemini AI</p>
          <h4 className="mt-1 text-lg font-semibold tracking-[-0.03em]">{isEnglish ? "Gemini model" : "Mô hình Gemini"}</h4>
        </div>
        <Sparkles className="mt-1 h-5 w-5 text-[var(--terracotta)]" aria-hidden="true" />
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">{isEnglish ? "Used for Help guide and new email summaries." : "Dùng cho Trợ lý hướng dẫn và các bản tóm tắt email mới."}</p>
      <label className="mt-4 block">
        <span className="sr-only">{isEnglish ? "Gemini model" : "Mô hình Gemini"}</span>
        <select value={selectedModel} onChange={event => { setSelectedModel(event.target.value as GeminiModel); setConnectionModel(null); }} disabled={settings.isLoading || updateModel.isPending || testConnection.isPending} className="swiss-input">
          {GEMINI_MODEL_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{isEnglish ? details.descriptionEn : details.descriptionVi}</p>
      <button type="button" disabled={updateModel.isPending || settings.isLoading || selectedModel === settings.data} onClick={() => updateModel.mutate({ model: selectedModel })} className="swiss-button mt-4 disabled:cursor-not-allowed disabled:opacity-60">
        {updateModel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        {isEnglish ? "Save Gemini model" : "Lưu mô hình Gemini"}
      </button>
      <button type="button" disabled={testConnection.isPending || settings.isLoading || updateModel.isPending} onClick={() => testConnection.mutate()} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[var(--line-strong)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--terracotta)] hover:text-[var(--terracotta)] disabled:cursor-not-allowed disabled:opacity-60">
        {testConnection.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        {isEnglish ? "Test Gemini connection" : "Kiểm tra kết nối Gemini"}
      </button>
      {connectionModel && <p role="status" className="mt-3 text-xs font-semibold text-[var(--sage)]">{isEnglish ? `Connected successfully with ${connectionModel}.` : `Kết nối thành công với ${connectionModel}.`}</p>}
      <p className="mt-3 text-xs leading-5 text-[var(--ink-muted)]">{isEnglish ? "The choice is saved only for the current account. Existing summaries remain unchanged." : "Lựa chọn được lưu riêng cho tài khoản hiện tại. Các bản tóm tắt đã tạo vẫn giữ nguyên."}</p>
    </section>
  );
}
