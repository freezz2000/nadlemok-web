import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: '파일 파싱에 실패했습니다' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: '파일 크기는 10MB 이하여야 합니다' }, { status: 400 })
  }

  const filename = file.name
  const ext = filename.toLowerCase().split('.').pop()
  const buffer = Buffer.from(await file.arrayBuffer())

  let text = ''

  try {
    if (ext === 'txt') {
      text = buffer.toString('utf-8')
    } else if (ext === 'pdf') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse')
      const result = await pdfParse(buffer)
      text = result.text
    } else if (ext === 'docx' || ext === 'doc') {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    } else if (ext === 'xlsx' || ext === 'xls') {
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const lines: string[] = []
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName]
        const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false })
        if (csv.trim()) {
          lines.push(`[시트: ${sheetName}]`)
          lines.push(csv)
        }
      }
      text = lines.join('\n')
    } else {
      return NextResponse.json(
        { error: '지원하지 않는 파일 형식입니다. PDF, DOCX, XLSX, TXT 파일을 업로드해주세요.' },
        { status: 400 }
      )
    }
  } catch (e) {
    console.error('[dev-request] 파일 파싱 오류:', e)
    return NextResponse.json({ error: '파일 내용을 읽는 중 오류가 발생했습니다. 파일이 손상됐거나 암호화된 파일일 수 있습니다.' }, { status: 422 })
  }

  // 빈 텍스트 처리
  const trimmed = text.trim()
  if (!trimmed) {
    return NextResponse.json({ error: '파일에서 텍스트를 추출하지 못했습니다. 이미지 기반 PDF이거나 내용이 없는 파일일 수 있습니다.' }, { status: 422 })
  }

  // DB 저장
  const { error } = await admin
    .from('projects')
    .update({
      dev_request_text: trimmed,
      dev_request_filename: filename,
    })
    .eq('id', projectId)

  if (error) {
    console.error('[dev-request] DB 저장 오류:', error)
    return NextResponse.json({ error: 'DB 저장에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ text: trimmed, filename })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data } = await admin
    .from('projects')
    .select('dev_request_text, dev_request_filename')
    .eq('id', projectId)
    .single()

  return NextResponse.json({
    text: data?.dev_request_text ?? null,
    filename: data?.dev_request_filename ?? null,
  })
}
