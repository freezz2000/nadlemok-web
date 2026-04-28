import { NextResponse } from 'next/server'

// 임시 진단 엔드포인트 — 사용 후 삭제 예정
export async function GET() {
  const apikey = process.env.ALIGO_API_KEY
  const userid = process.env.ALIGO_USER_ID
  const sender = process.env.ALIGO_SENDER_PHONE ?? process.env.ALIGO_SENDER

  if (!apikey || !userid || !sender) {
    return NextResponse.json({ ok: false, step: 'env_missing', apikey: !!apikey, userid: !!userid, sender: !!sender })
  }

  // 1. 잔액 조회 (SMS 차감 없음)
  let remainData: unknown = null
  try {
    const remainParams = new URLSearchParams({ key: apikey, user_id: userid })
    const remainRes = await fetch('https://apis.aligo.in/remain/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: remainParams.toString(),
    })
    const remainText = await remainRes.text()
    try { remainData = JSON.parse(remainText) } catch { remainData = remainText }
  } catch (e) {
    return NextResponse.json({ ok: false, step: 'remain_error', error: String(e) })
  }

  // 2. 실제 SMS 발송 테스트 (발신번호로 자기 자신에게)
  let sendData: unknown = null
  try {
    const sendParams = new URLSearchParams({
      key: apikey,
      user_id: userid,
      sender,
      receiver: sender, // 발신번호로 자기 자신에게 테스트 발송
      msg: '[나들목] SMS 테스트 메시지입니다.',
      msg_type: 'SMS',
    })
    const sendRes = await fetch('https://apis.aligo.in/send/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: sendParams.toString(),
    })
    const sendText = await sendRes.text()
    try { sendData = JSON.parse(sendText) } catch { sendData = sendText }
  } catch (e) {
    sendData = { fetch_error: String(e) }
  }

  return NextResponse.json({
    ok: true,
    apikey_prefix: apikey.slice(0, 8),
    apikey_length: apikey.length,
    userid,
    sender,
    remainResult: remainData,
    sendResult: sendData,
  })
}
