"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/i18n/useTranslation";
import { createClient } from "@/lib/supabase/client";

function InquiryModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    company: "",
    name: "",
    phone: "",
    email: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [privacyAgreed, setPrivacyAgreed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: dbError } = await supabase.from("inquiries").insert({
      company: form.company,
      name: form.name,
      phone: form.phone,
      email: form.email,
      message: form.message || null,
    });

    setLoading(false);
    if (dbError) {
      setError("전송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-navy">참여 문의</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {submitted ? (
          <div className="px-6 py-12 text-center">
            <div className="w-14 h-14 bg-go/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-go" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-base font-semibold text-text mb-1">문의가 전송되었습니다</p>
            <p className="text-sm text-text-muted">빠른 시일 내에 연락드리겠습니다.</p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2.5 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy/90 transition-colors"
            >
              닫기
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  회사명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                  placeholder="회사명 입력"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  담당자명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                  placeholder="담당자명 입력"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                연락처 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                placeholder="010-0000-0000"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                이메일 <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                placeholder="email@company.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">문의사항</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy resize-none"
                placeholder="문의 내용을 입력해주세요"
              />
            </div>

            <div className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="privacy"
                checked={privacyAgreed}
                onChange={(e) => setPrivacyAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-navy cursor-pointer flex-shrink-0"
              />
              <label htmlFor="privacy" className="text-xs text-gray-600 leading-relaxed cursor-pointer">
                <span className="font-medium text-gray-800">[필수]</span> 개인정보 수집·이용에 동의합니다.{" "}
                <span className="text-gray-400">
                  (수집 항목: 회사명, 담당자명, 연락처, 이메일, 문의내용 / 이용 목적: 문의 처리 및 답변 / 보유 기간: 문의 처리 완료 후 1년)
                </span>
              </label>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading || !privacyAgreed}
                className="flex-1 py-2.5 bg-navy text-white rounded-lg text-sm font-bold hover:bg-navy/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "전송 중..." : "문의 보내기"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function CtaSection() {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <section id="cta" className="py-24 bg-navy relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-gold/5 blur-3xl" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{t.cta.title}</h2>
          <p className="text-white/70 leading-relaxed mb-8 whitespace-pre-line">{t.cta.description}</p>

          <Link
            href="/register"
            className="inline-block px-10 py-4 bg-gold text-navy font-bold rounded-lg hover:bg-gold-light transition-colors text-lg mb-4"
          >
            {t.cta.button}
          </Link>
          <div className="text-sm text-white/50 mb-10">{t.cta.offer}</div>

          <div className="flex flex-col sm:flex-row justify-center gap-6 text-sm text-white/60">
            <button
              onClick={() => setShowModal(true)}
              className="hover:text-gold transition-colors"
            >
              문의하기
            </button>
            <span className="hidden sm:inline text-white/20">|</span>
            <a href={`mailto:${t.cta.email}`} className="hover:text-gold transition-colors">
              {t.cta.email}
            </a>
          </div>

          <div className="mt-12 pt-8 border-t border-white/10">
            <p className="text-gold/80 font-medium italic">{t.cta.closing}</p>
          </div>
        </div>
      </section>

      {showModal && <InquiryModal onClose={() => setShowModal(false)} />}
    </>
  );
}
