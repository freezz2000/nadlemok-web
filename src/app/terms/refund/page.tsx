import Link from 'next/link'

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* 헤더 */}
        <div className="mb-8">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">
            ← 홈으로
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">환불 정책</h1>
          <p className="text-sm text-gray-500 mt-2">시행일: 2026년 1월 1일 | 운영사: 선을넘는사람들 (LineBreakers)</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8">

          {/* 구독 환불 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">1. 구독 환불 정책</h2>
            <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
              <div className="flex gap-3">
                <span className="text-green-600 font-bold flex-shrink-0">①</span>
                <p>
                  <strong>결제일로부터 7일 이내, 크레딧 미사용 시 전액 환불</strong><br />
                  구독 결제일로부터 7일 이내이며 충전된 크레딧을 전혀 사용하지 않은 경우,
                  전자상거래 등에서의 소비자보호에 관한 법률 제17조에 따라 전액 환불이 가능합니다.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-amber-600 font-bold flex-shrink-0">②</span>
                <p>
                  <strong>당월 미사용(크레딧 전액 잔여) 시 전액 환불</strong><br />
                  구독 당월 내 크레딧을 전혀 사용하지 않은 상태에서 환불을 요청하면 전액 환불됩니다.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-red-600 font-bold flex-shrink-0">③</span>
                <p>
                  <strong>구독 중도 해지 시 잔여 크레딧 비례 환불 불가</strong><br />
                  크레딧 일부를 사용한 후 중도 해지하는 경우, 잔여 크레딧에 대한 환불은 불가합니다.
                  단, 당월 말까지 서비스는 계속 이용 가능합니다.
                </p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-500">
              <p className="font-medium text-gray-700 mb-1">구독 해지 안내</p>
              <p>구독을 해지하면 당월 말 자동 갱신이 중단됩니다. 이미 결제된 당월 구독료는 환불되지 않으며, 당월 말까지 서비스는 정상 이용 가능합니다.</p>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* 크레딧 환불 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">2. 크레딧 환불 정책</h2>
            <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
              <div className="flex gap-3">
                <span className="text-green-600 font-bold flex-shrink-0">①</span>
                <p>
                  <strong>구매 후 7일 이내 & 미사용 크레딧 전액 잔여 시 전액 환불</strong><br />
                  크레딧 구매일로부터 7일 이내이며 구매한 크레딧을 전혀 사용하지 않은 경우 전액 환불이 가능합니다.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-red-600 font-bold flex-shrink-0">②</span>
                <p>
                  <strong>일부 사용 시 환불 불가</strong><br />
                  크레딧 일부를 소모한 경우, 남은 크레딧에 대한 환불은 불가합니다.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="text-blue-600 font-bold flex-shrink-0">③</span>
                <p>
                  <strong>서비스 오류로 인한 크레딧 소모 시 복구</strong><br />
                  나들목 서비스의 기술적 오류로 인해 크레딧이 의도치 않게 소모된 경우,
                  동일한 크레딧을 복구해 드립니다. 오류 발생 시 고객센터로 문의해주세요.
                </p>
              </div>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* 환불 신청 방법 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">3. 환불 신청 방법</h2>
            <div className="text-sm text-gray-700 leading-relaxed space-y-2">
              <p>환불을 원하시는 경우 아래 방법으로 문의해주세요:</p>
              <ul className="space-y-1 pl-4">
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5">•</span>
                  <span>이메일: <a href="mailto:official@linebreakers.co.kr" className="text-navy underline">official@linebreakers.co.kr</a></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5">•</span>
                  <span>문의 시 가입 이메일, 결제일, 환불 사유를 함께 기재해주세요</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5">•</span>
                  <span>환불 처리 기간: 영업일 기준 3~5일 이내</span>
                </li>
              </ul>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* 기타 사항 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">4. 기타 사항</h2>
            <div className="text-sm text-gray-700 leading-relaxed space-y-2">
              <p>
                본 환불 정책은 전자상거래 등에서의 소비자보호에 관한 법률 및 관련 법령에 따라 운영되며,
                관련 법령과 상충되는 경우 관련 법령이 우선 적용됩니다.
              </p>
              <p>
                나들목은 서비스 운영 정책에 따라 환불 정책을 변경할 수 있으며,
                변경 시 서비스 내 공지를 통해 사전 안내합니다.
              </p>
            </div>
          </section>
        </div>

        {/* 관련 링크 */}
        <div className="flex gap-4 mt-6 text-sm text-gray-500">
          <Link href="/terms/service" className="hover:text-gray-700">이용약관</Link>
          <Link href="/terms/privacy" className="hover:text-gray-700">개인정보처리방침</Link>
          <Link href="/" className="hover:text-gray-700">홈으로</Link>
        </div>
      </div>
    </div>
  )
}
