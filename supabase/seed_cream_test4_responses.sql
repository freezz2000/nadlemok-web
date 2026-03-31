-- ============================================================
-- 크림 테스트4 가상 응답 데이터 생성
-- 기존 등록된 패널을 사용 (신규 사용자 생성 없음)
-- 예상 결과: CONDITIONAL GO
-- ============================================================

DO $$
DECLARE
  v_survey_id    UUID;
  v_questions    JSONB;
  v_panel_id     UUID;
  v_responses    JSONB;
  v_response_val INT;
  v_ks_no        INT;
  v_panel_count  INT := 0;
  j              INT;
  q              JSONB;
  q_key          TEXT;
  q_ks           BOOLEAN;
  q_type         TEXT;
  q_group        TEXT;
  h              INT;

  weakness_pool TEXT[] := ARRAY[
    '향이 조금 강한 편이에요',
    '발림성은 좋은데 끈적임이 있어요',
    '시간이 지나면 보습감이 줄어들어요',
    '가격 대비 용량이 아쉬워요',
    '흡수가 조금 느린 것 같아요',
    '처음엔 좋았는데 이후 건조해지는 느낌이에요',
    '민감한 피부에는 살짝 자극적일 수 있어요',
    '향이 호불호가 있을 것 같아요'
  ];
  improvement_pool TEXT[] := ARRAY[
    '향을 좀 더 가볍게 개선해주시면 좋겠어요',
    '끈적임 없는 제형으로 바꿔주세요',
    '보습 성분을 강화해주시면 좋겠어요',
    '용량을 늘려주시면 더 좋을 것 같아요',
    '흡수 속도를 개선해주시면 합니다',
    '지속력을 높여주시면 좋겠어요',
    '성분표 공개를 더 자세히 해주세요',
    '가격을 조금 낮춰주시면 재구매할 것 같아요'
  ];

BEGIN
  -- ① 설문 조회
  SELECT s.id, s.questions
  INTO v_survey_id, v_questions
  FROM surveys s
  WHERE s.project_id = '8456ed00-e88b-401d-9e44-0a3f6b6acd4b'
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_survey_id IS NULL THEN
    RAISE EXCEPTION '설문을 찾을 수 없습니다. 먼저 설문을 생성해주세요.';
  END IF;

  RAISE NOTICE '✓ 설문 ID: %', v_survey_id;
  RAISE NOTICE '✓ 문항 수: %', jsonb_array_length(v_questions);

  -- ② 기존 패널을 순서대로 순회하며 응답 생성
  FOR v_panel_id IN
    SELECT p.id
    FROM profiles p
    WHERE p.role = 'panel'
    ORDER BY p.created_at
    LIMIT 50
  LOOP
    v_panel_count := v_panel_count + 1;

    -- survey_panels 매칭 (없으면 추가)
    INSERT INTO survey_panels (survey_id, panel_id, status, matched_at)
    VALUES (v_survey_id, v_panel_id, 'completed', now() - make_interval(days => 21))
    ON CONFLICT DO NOTHING;

    -- 이미 응답이 있으면 건너뜀
    IF EXISTS (
      SELECT 1 FROM survey_responses
      WHERE survey_id = v_survey_id AND panel_id = v_panel_id
    ) THEN
      RAISE NOTICE '  패널 % 이미 응답 존재, 스킵', v_panel_count;
      CONTINUE;
    END IF;

    -- ③ 응답 JSON 생성
    v_responses := '{}'::jsonb;
    v_ks_no     := 0;

    FOR j IN 0 .. jsonb_array_length(v_questions) - 1 LOOP
      q       := v_questions -> j;
      q_key   := q ->> 'key';
      q_ks    := COALESCE((q ->> 'isKillSignal')::boolean, false);
      q_type  := COALESCE(q ->> 'type', 'scale');
      q_group := COALESCE(q ->> 'group', '');

      -- 주관식: 건너뜀 (별도 컬럼으로 저장)
      IF q_type = 'text' THEN CONTINUE; END IF;

      -- 객관식
      IF q_type = 'choice' THEN
        v_responses := v_responses || jsonb_build_object(q_key, 1 + (v_panel_count % 2));
        CONTINUE;
      END IF;

      -- 검증문항: 항상 2점
      IF q_group = 'verification' THEN
        v_response_val := 2;

      -- KS 문항
      ELSIF q_ks THEN
        v_ks_no := v_ks_no + 1;
        v_response_val := CASE
          -- 2번째 KS: 18% trigger → DANGER (panels 1-9)
          WHEN v_ks_no = 2 THEN
            CASE
              WHEN v_panel_count <= 5  THEN 4
              WHEN v_panel_count <= 9  THEN 3
              WHEN v_panel_count <= 25 THEN 2
              ELSE 1
            END
          -- 1번째 KS: 6% trigger → WARNING (panels 1-3)
          WHEN v_ks_no = 1 THEN
            CASE
              WHEN v_panel_count <= 3  THEN 3
              WHEN v_panel_count <= 28 THEN 1
              ELSE 2
            END
          -- 3번째 KS: 4% trigger (panels 1-2)
          WHEN v_ks_no = 3 THEN
            CASE
              WHEN v_panel_count <= 2  THEN 3
              WHEN v_panel_count <= 32 THEN 1
              ELSE 2
            END
          -- 나머지 KS: 2% (panel 1만)
          ELSE
            CASE
              WHEN v_panel_count = 1   THEN 3
              WHEN v_panel_count <= 35 THEN 1
              ELSE 2
            END
        END;

      -- 비KS 척도 문항: 그룹별 분포
      ELSE
        h := abs(hashtext(q_key || v_panel_count::text)) % 100;
        v_response_val := CASE q_group
          -- 사용감: 평균 ~3.35
          WHEN 'usage' THEN
            CASE WHEN h < 1  THEN 1
                 WHEN h < 12 THEN 2
                 WHEN h < 54 THEN 3
                 ELSE             4 END
          -- 기능성: 평균 ~3.10
          WHEN 'function' THEN
            CASE WHEN h < 3  THEN 1
                 WHEN h < 25 THEN 2
                 WHEN h < 70 THEN 3
                 ELSE             4 END
          -- 종합평가: 평균 ~3.12
          WHEN 'overall' THEN
            CASE WHEN h < 4  THEN 1
                 WHEN h < 22 THEN 2
                 WHEN h < 68 THEN 3
                 ELSE             4 END
          -- 기타: 평균 ~3.05
          ELSE
            CASE WHEN h < 4  THEN 1
                 WHEN h < 26 THEN 2
                 WHEN h < 64 THEN 3
                 ELSE             4 END
        END;
      END IF;

      v_responses := v_responses || jsonb_build_object(q_key, v_response_val);
    END LOOP;

    -- ④ 응답 저장
    INSERT INTO survey_responses (
      survey_id, panel_id, day_checkpoint, responses,
      open_weakness, open_improvement,
      responded_at, response_duration_sec
    ) VALUES (
      v_survey_id,
      v_panel_id,
      1,
      v_responses,
      CASE WHEN v_panel_count % 3 = 0 THEN weakness_pool[(v_panel_count % 8) + 1]    ELSE NULL END,
      CASE WHEN v_panel_count % 4 = 0 THEN improvement_pool[(v_panel_count % 8) + 1] ELSE NULL END,
      now() - make_interval(days => 14 - (v_panel_count % 14)),
      150 + (v_panel_count * 19 % 450)
    );

    IF v_panel_count % 10 = 0 THEN
      RAISE NOTICE '  ... %명 응답 완료', v_panel_count;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '✅ 완료: %명 패널 응답 생성', v_panel_count;
  RAISE NOTICE '   survey_id: %', v_survey_id;
  RAISE NOTICE '   예상 결과: CONDITIONAL GO';
  RAISE NOTICE '   - 2번째 KS: 9/50 = 18%% 트리거 [DANGER]';
  RAISE NOTICE '   - 1번째 KS: 3/50 = 6%% 트리거 [WARNING]';
  RAISE NOTICE '   - usage 평균: ~3.35 / overall 평균: ~3.12';

  IF v_panel_count < 50 THEN
    RAISE WARNING '등록된 패널이 %명뿐입니다 (50명 미만)', v_panel_count;
  END IF;
END;
$$;
