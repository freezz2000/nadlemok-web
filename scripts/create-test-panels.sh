#!/bin/bash
# 가상 패널 계정 50개 생성 스크립트

SUPABASE_URL="${SUPABASE_URL:-https://your-project.supabase.co}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-your-service-role-key}"
PASSWORD="${PANEL_PASSWORD:-your-password}"

GENDERS=("여성" "남성")
AGE_GROUPS=("20대" "30대" "40대")
SKIN_TYPES=("건성" "복합성" "지성" "중성" "민감성")
CONCERNS=("모공" "주름" "색소침착" "여드름" "건조" "민감" "탄력" "각질")

NAMES_F=("김서연" "이지은" "박수빈" "정민지" "최하은" "한예진" "윤소희" "임채원" "오다인" "배지현"
         "송유나" "조은서" "신하늘" "류민서" "홍지아" "강수정" "양세은" "전가은" "문지수" "서예원"
         "권나연" "남보람" "심유진" "황미래" "장소연" "노하나" "구지영" "방수현" "설하영" "진아름"
         "고은채" "도수아" "마지혜" "우진이" "하보미")
NAMES_M=("김민준" "이서준" "박도윤" "정시우" "최예준" "한주원" "윤하준" "임지호" "오건우" "배우진"
         "송현우" "조태양" "신준서" "류은호" "홍민재")

SUCCESS=0
FAIL=0

for i in $(seq 1 50); do
  EMAIL="panel${i}@nadlemok.test"

  # 성별 (70% 여성, 30% 남성)
  if [ $i -le 35 ]; then
    GENDER="여성"
    NAME_IDX=$(( (i - 1) % ${#NAMES_F[@]} ))
    NAME="${NAMES_F[$NAME_IDX]}"
  else
    GENDER="남성"
    NAME_IDX=$(( (i - 36) % ${#NAMES_M[@]} ))
    NAME="${NAMES_M[$NAME_IDX]}"
  fi

  AGE_IDX=$(( (i - 1) % ${#AGE_GROUPS[@]} ))
  AGE="${AGE_GROUPS[$AGE_IDX]}"

  SKIN_IDX=$(( (i - 1) % ${#SKIN_TYPES[@]} ))
  SKIN="${SKIN_TYPES[$SKIN_IDX]}"

  CONCERN_IDX=$(( (i - 1) % ${#CONCERNS[@]} ))
  CONCERN="${CONCERNS[$CONCERN_IDX]}"

  IS_SENSITIVE="false"
  if [ $SKIN == "민감성" ]; then
    IS_SENSITIVE="true"
  fi

  # 1. Supabase Auth에 사용자 생성
  RESULT=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/admin/users" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"${EMAIL}\",
      \"password\": \"${PASSWORD}\",
      \"email_confirm\": true,
      \"user_metadata\": {
        \"role\": \"panel\",
        \"name\": \"${NAME}\"
      }
    }")

  USER_ID=$(echo "$RESULT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)

  if [ -z "$USER_ID" ] || [ "$USER_ID" == "" ]; then
    echo "FAIL [$i] ${EMAIL} - user creation failed"
    FAIL=$((FAIL + 1))
    continue
  fi

  # 2. panel_profiles 업데이트
  curl -s -X PATCH "${SUPABASE_URL}/rest/v1/panel_profiles?id=eq.${USER_ID}" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    --data-binary "{\"gender\":\"${GENDER}\",\"age_group\":\"${AGE}\",\"skin_type\":\"${SKIN}\",\"skin_concern\":\"${CONCERN}\",\"is_sensitive\":${IS_SENSITIVE}}" > /dev/null 2>&1

  echo "OK  [$i] ${EMAIL} - ${NAME} (${GENDER}/${AGE}/${SKIN}/${CONCERN})"
  SUCCESS=$((SUCCESS + 1))
done

echo ""
echo "=== 완료: 성공 ${SUCCESS}건, 실패 ${FAIL}건 ==="
