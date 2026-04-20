/**
 * 나들목 알리고 알림톡 발송 유틸리티
 *
 * 알리고 등록 템플릿 목록:
 * ┌─────────────────────────────────────────────────────────────┐
 * │ 코드          │ 명칭               │ 발송 시점              │
 * ├─────────────────────────────────────────────────────────────┤
 * │ NDM_INVITE    │ 패널 초대          │ 클라이언트가 초대 발송  │
 * │ NDM_REMIND    │ 설문 응답 독촉     │ 마감 3일 전 미응답 패널 │
 * │ NDM_RESULT    │ 분석 완료 안내     │ 분석 완료 시 클라이언트 │
 * └─────────────────────────────────────────────────────────────┘
 */

const ALIGO_API_URL = 'https://kakaoapi.aligo.in/akv10/alimtalk/send/'

function getAligoConfig() {
  return {
    apikey: process.env.ALIGO_API_KEY!,
    userid: process.env.ALIGO_USER_ID!,
    senderkey: process.env.ALIGO_SENDER_KEY!,
    sender: process.env.ALIGO_SENDER_PHONE!,
  }
}

function makeButton(name: string, url: string) {
  return JSON.stringify({
    button: [
      {
        name,
        linkType: 'WL',
        linkTypeName: '웹링크',
        linkPc: url,
        linkMo: url,
      },
    ],
  })
}

interface AlimtalkResult {
  ok: boolean
  message?: string
}

async function sendOne(
  phone: string,
  tplCode: string,
  message: string,
  button?: string
): Promise<AlimtalkResult> {
  const config = getAligoConfig()

  if (!config.apikey || !config.userid || !config.senderkey || !config.sender) {
    return { ok: false, message: '알리고 환경변수 미설정' }
  }

  const cleanPhone = phone.replace(/-/g, '')

  const params: Record<string, string> = {
    ...config,
    tpl_code: tplCode,
    receiver_1: cleanPhone,
    recvname_1: '고객',
    message_1: message,
  }
  if (button) params.button_1 = button

  try {
    const body = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&')

    const res = await fetch(ALIGO_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })

    const text = await res.text()

    let data: Record<string, unknown>
    try {
      data = JSON.parse(text)
    } catch {
      return { ok: false, message: `응답 파싱 실패 (HTTP ${res.status}): ${text.slice(0, 200)}` }
    }

    if (data.code === 0) return { ok: true }
    return { ok: false, message: `[Aligo ${data.code}] ${data.message}` }
  } catch (e) {
    return { ok: false, message: `네트워크 오류: ${e instanceof Error ? e.message : String(e)}` }
  }
}

// ─────────────────────────────────────────────────────────
// 템플릿별 발송 함수
// ─────────────────────────────────────────────────────────

/**
 * UG_9429 — 패널 초대
 *
 * 알리고 등록 템플릿 (실제 내용):
 * ┌─────────────────────────────────────────────────┐
 * │ [나들목] 제품 테스트 패널 초대                  │
 * │                                                 │
 * │ #{제품명} 테스트 패널로 초대드립니다.           │
 * │                                                 │
 * │ 아래 버튼을 클릭하여 참여해 주세요.             │
 * │ 초대 링크는 14일 후 만료됩니다.                 │
 * └─────────────────────────────────────────────────┘
 * 버튼: [채널추가] + [패널 참여하기] → https://linebreakers.co.kr/login (고정)
 * ※ 버튼 URL이 고정이므로 button_1 파라미터 미전송 (템플릿 등록 버튼 그대로 사용)
 */
export async function sendInvite(phone: string, productName: string, inviteUrl: string) {
  const tplCode = process.env.ALIGO_TPL_INVITE!
  const message =
    `[나들목] 제품 테스트 패널 초대\n\n` +
    `${productName} 테스트 패널로 초대드립니다.\n\n` +
    `아래 버튼을 클릭하여 참여해 주세요.\n` +
    `초대 링크는 14일 후 만료됩니다.`
  // 채널추가(AC) + 실제 초대 링크(WL) — inviteUrl에 token + client_id 포함
  const button = JSON.stringify({
    button: [
      { name: '채널추가', linkType: 'AC' },
      { name: '패널 참여하기', linkType: 'WL', linkTypeName: '웹링크', linkPc: inviteUrl, linkMo: inviteUrl },
    ],
  })
  return sendOne(phone, tplCode, message, button)
}

/**
 * NDM_REMIND — 설문 응답 독촉
 *
 * 알리고 등록 템플릿:
 * ┌─────────────────────────────────────────────────┐
 * │ [나들목] 설문 응답을 기다리고 있어요            │
 * │                                                 │
 * │ #{제품명} 설문 마감이 #{마감일}까지입니다.      │
 * │ 아직 응답하지 않으셨다면 지금 참여해 주세요!   │
 * │ #{설문링크}                                     │
 * └─────────────────────────────────────────────────┘
 * 버튼: [설문 참여하기] → 웹링크
 */
export async function sendReminder(phone: string, productName: string, deadline: string, surveyUrl: string) {
  const tplCode = process.env.ALIGO_TPL_REMIND!
  const message =
    `[나들목] 설문 응답을 기다리고 있어요\n\n` +
    `${productName} 설문 마감이 ${deadline}까지입니다.\n` +
    `아직 응답하지 않으셨다면 지금 참여해 주세요!\n` +
    `${surveyUrl}`
  return sendOne(phone, tplCode, message, makeButton('설문 참여하기', surveyUrl))
}

/**
 * NDM_RESULT — 분석 완료 안내 (클라이언트 수신)
 *
 * 알리고 등록 템플릿:
 * ┌─────────────────────────────────────────────────┐
 * │ [나들목] 분석 결과가 준비되었습니다             │
 * │                                                 │
 * │ #{제품명} 테스트 분석이 완료되었습니다.         │
 * │ 신호등 판정 및 상세 결과를 확인해 보세요.       │
 * │ #{결과링크}                                     │
 * └─────────────────────────────────────────────────┘
 * 버튼: [결과 확인하기] → 웹링크
 */
export async function sendResultReady(phone: string, productName: string, resultUrl: string) {
  const tplCode = process.env.ALIGO_TPL_RESULT!
  const message =
    `[나들목] 분석 결과가 준비되었습니다\n\n` +
    `${productName} 테스트 분석이 완료되었습니다.\n` +
    `신호등 판정 및 상세 결과를 확인해 보세요.\n` +
    `${resultUrl}`
  return sendOne(phone, tplCode, message, makeButton('결과 확인하기', resultUrl))
}
