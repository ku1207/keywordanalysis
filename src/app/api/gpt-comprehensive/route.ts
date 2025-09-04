import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openai-client';
import { apiLogger } from '@/lib/api-logger';

export async function POST(request: NextRequest) {
  try {
    apiLogger.apiStart('사용자 여정지도', {
      method: request.method,
      url: request.url
    });

    const { data } = await request.json();

    // 환경변수 확인
    if (!process.env.OPENAI_API_KEY) {
      apiLogger.warning('OpenAI API 키가 설정되지 않았습니다. 목 데이터를 반환합니다.');
      return NextResponse.json(getMockJourneyMapData());
    }

    if (!data) {
      return NextResponse.json(
        { error: 'gpt-insights 데이터가 필요합니다.' },
        { status: 400 }
      );
    }

    try {
      const prompt = `###지시사항
아래 **데이터**를 바탕으로 구매여정 6단계 각각에서 사용자가 느끼는 **감정(emotion)**을 1~10 **정수**로만 산출하시오.  
출력은 **JSON만** 반환하며, 지정된 키/형식 외의 어떤 텍스트도 포함하지 않는다.

####고정 단계(참고; 출력에는 이름 미포함)
1: 문제 인식, 2: 정보 탐색, 3: 대안 평가, 4: 구매 결정, 5: 구매 행동, 6: 구매 후 행동

####평가 규칙
- 1 = 매우 부정/불안/혼란, 5 = 중립, 10 = 매우 긍정/확신/만족.
- 신호(후기·문의 톤·클레임·이탈/재구매 등)로 정성 감정을 추정하되, 수치가 필요하지는 않음.
- 소수점 산출 시 **반올림**하여 1~10 **정수**로 **클램핑**.
- 데이터가 불충분하면 **0(데이터없음)**로 설정.

####출력 형식(JSON · 엄격)
{
  "stageEmotionScores": [
    { "stageIndex": 1, "emotion": <0~10> },
    { "stageIndex": 2, "emotion": <0~10> },
    { "stageIndex": 3, "emotion": <0~10> },
    { "stageIndex": 4, "emotion": <0~10> },
    { "stageIndex": 5, "emotion": <0~10> },
    { "stageIndex": 6, "emotion": <0~10> }
  ]
}

###데이터
${JSON.stringify(data, null, 2)}`;

      apiLogger.info('사용자 여정지도 감정 분석 요청');

      const openai = getOpenAIClient();
      const result = await openai.responses.create({
        model: "gpt-5",
        input: prompt,
        reasoning: { effort: "low" },
        text: { verbosity: "low" },
      });

      apiLogger.apiSuccess('GPT-5 사용자 여정지도');

      // JSON 파싱 시도
      let journeyMapData;
      try {
        journeyMapData = JSON.parse(result.output_text);
        apiLogger.parseSuccess('사용자 여정지도');
      } catch (parseError) {
        apiLogger.parseError('사용자 여정지도', parseError);
        journeyMapData = getMockJourneyMapData();
      }

      // 간트차트 API 호출
      apiLogger.info('간트차트 전략 분석 시작');
      let ganttData;
      try {
        const ganttPrompt = `###지시사항
입력(① **stageEmotionScores**(여정지도 결과), ② **키워드데이터**)값에 분석하여 각 범위(rangeId)에 대해 **연속 구간 단위 전략 5종**만 산출한다. 출력은 **JSON만** 반환한다.

###범위 자동 도출 규칙
- 감정 점수의 변화로 **연속 구간**을 2~3개 제안(비연속 금지).
- **컷포인트 후보**: |Δemotion| ≥ 2, 중립선(5) 교차, 국소 최소(≤4)·최대(≥8) 직후.
- 기본 2개: [1~3], [4~6]; 신호 강하면 3개까지.
- 각 범위 라벨 예: "첫 번째퍼널(1)", "두 번째퍼널(2~3)", ....

###자원 배분 가중
- 범위별 가중치 구성요소:
  - w_emotion = 평균(10 - emotion_i)   // 낮은 감정일수록 투자↑
  - w_demand  = 정규화된 검색량(0~1)    // 키워드데이터 search_volume
  - w_quality = 정규화된 CTR(0~1)       // 키워드데이터 ctr
- 최종 w_final = α·w_emotion + β·w_demand + γ·w_quality
  - 기본값: α=0.5, β=0.3, γ=0.2 (가중치 합=1)
  - 결측 처리: 없는 항목의 가중치는 0으로 두고 남은 비율로 **재정규화**
- budgetSplitPct는 w_final을 기준으로 채널(검색광고/디스플레이/콘텐츠/CRM)을 100%로 분배
  - 예: w_emotion↑이면 콘텐츠·CRM 비중↑, w_quality↑이면 검색광고 비중↑

###산출물: 각 범위의 전략 5종
- 기본 리스트 상한: **최대 3개** (예외: **coreKeywords/longTailKeywords/adCreatives는 5개**)
- 실험 상한: **최대 2개**
- KPI·직접 인용·리스크 필드 없음. 불확실 시 "-".

###출력 형식(JSON · 엄격)
{
  "ganttStrategy": [
    {
      "rangeId": "R1",
      "rangeLabel": "첫 번째퍼널(1~3)",
      "startStageIndex": 1,
      "endStageIndex": 3,
      "resourceAllocation": {
        "method": "검색량 기반 | 추정 | -",
        "methodRationale": "감정가중·검색량·CTR을 합성한 w_final로 채널 비중을 100%로 정규화(≤100자)",
        "budgetSplitPct": { "검색광고": 40, "디스플레이": 20, "콘텐츠": 20, "CRM/리텐션": 20 }
      },
      "keywordTargeting": {
        "coreKeywords": ["최대 5개"],
        "longTailKeywords": ["최대 5개"],
        "brandVsNonBrand": { "brandSharePct": 30, "nonBrandSharePct": 70 },
        "negativeKeywords": ["최대 3개"]
      },
      "contentStrategy": {
        "adCreatives": ["최대 5개"],
        "landingPage": { "keySections": ["최대 3개"], "primaryCTA": "한 문장" },
        "educationalContent": ["최대 3개"],
        "socialProof": ["최대 3개"]
      },
      "nicheStrategy": {
        "segments": ["최대 3개"],
        "personaValueProps": ["최대 3개"],
        "positioning": "한 문장"
      },
      "retentionStrategy": {
        "crmScenarios": ["최대 3개"],
        "loyaltyOffers": ["최대 3개"],
        "reviewNPSLoop": ["최대 3개"]
      },
      "experiments": ["최대 2개"]
    }
  ]
}

###여정지도결과
${JSON.stringify(journeyMapData.stageEmotionScores, null, 2)}

###키워드데이터
${JSON.stringify(data, null, 2)}`;

        const ganttResult = await openai.responses.create({
          model: "gpt-5",
          input: ganttPrompt,
          reasoning: { effort: "low" },
          text: { verbosity: "low" },
        });

        apiLogger.apiSuccess('GPT-5 간트차트 전략');

        try {
          ganttData = JSON.parse(ganttResult.output_text);
          apiLogger.parseSuccess('간트차트');
        } catch (ganttParseError) {
          apiLogger.parseError('간트차트', ganttParseError);
          ganttData = getMockGanttData();
        }
      } catch (ganttError) {
        apiLogger.warning('간트차트 GPT-5 API 호출 실패, 목 데이터를 반환합니다', { error: ganttError.message || ganttError });
        ganttData = getMockGanttData();
      }

      // 두 결과를 통합하여 반환
      const combinedResult = {
        journeyMap: journeyMapData,
        ganttChart: ganttData
      };

      return NextResponse.json(combinedResult);

    } catch (error) {
      apiLogger.warning('GPT-5 API 호출 실패, 목 데이터를 반환합니다', { error: error.message || error });
      const fallbackResult = {
        journeyMap: getMockJourneyMapData(),
        ganttChart: getMockGanttData()
      };
      return NextResponse.json(fallbackResult);
    }

  } catch (error) {
    apiLogger.error('API Route 오류', { error: error.message || error });
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 목 데이터 생성 함수
function getMockJourneyMapData() {
  return {
    "stageEmotionScores": [
      { "stageIndex": 1, "emotion": 4 },
      { "stageIndex": 2, "emotion": 6 },
      { "stageIndex": 3, "emotion": 5 },
      { "stageIndex": 4, "emotion": 7 },
      { "stageIndex": 5, "emotion": 8 },
      { "stageIndex": 6, "emotion": 6 }
    ]
  };
}

function getMockGanttData() {
  return {
    "ganttStrategy": [
      {
        "rangeId": "R1",
        "rangeLabel": "상단퍼널(1~3)",
        "startStageIndex": 1,
        "endStageIndex": 3,
        "resourceAllocation": {
          "method": "검색량 기반",
          "methodRationale": "낮은 감정점수(4점)로 콘텐츠 투자 증대, 높은 검색량으로 검색광고 집중",
          "budgetSplitPct": { "검색광고": 45, "디스플레이": 25, "콘텐츠": 20, "CRM/리텐션": 10 }
        },
        "keywordTargeting": {
          "coreKeywords": ["브랜드명", "카테고리명", "문제키워드", "주요상품명", "핵심서비스"],
          "longTailKeywords": ["문제해결방법", "비교가이드", "사용법", "구매팁", "선택기준"],
          "brandVsNonBrand": { "brandSharePct": 30, "nonBrandSharePct": 70 },
          "matchTypes": ["정확","구문","확장"],
          "negativeKeywords": ["무료", "저렴한", "할인"],
          "geoLangNotes": "전국 타겟, 한국어 위주"
        },
        "contentStrategy": {
          "adCreatives": ["문제해결 메시지", "전문성 강조", "신뢰성 어필", "차별화 포인트", "고객 성공사례"],
          "landingPage": { "keySections": ["문제정의", "솔루션소개", "신뢰지표"], "primaryCTA": "무료 상담 신청하기" },
          "educationalContent": ["가이드 콘텐츠", "비교 분석", "사용 사례"],
          "socialProof": ["고객 후기", "전문가 추천", "언론 보도"]
        },
        "nicheStrategy": {
          "segments": ["초보자", "시간부족자", "품질중시자"],
          "personaValueProps": ["간편함", "전문성", "신뢰성"],
          "positioning": "믿을 수 있는 전문 솔루션 파트너"
        },
        "retentionStrategy": {
          "crmScenarios": ["웰컴 시리즈", "교육 콘텐츠", "체크인 메시지"],
          "loyaltyOffers": ["첫구매 할인", "리뷰 적립", "추천 보상"],
          "reviewNPSLoop": ["구매 후 만족도", "리뷰 요청", "개선 피드백"]
        },
        "experiments": ["랜딩페이지 A/B 테스트", "광고 메시지 최적화"]
      },
      {
        "rangeId": "R2",
        "rangeLabel": "하단퍼널(4~6)",
        "startStageIndex": 4,
        "endStageIndex": 6,
        "resourceAllocation": {
          "method": "검색량 기반",
          "methodRationale": "높은 구매의도 감정점수(7-8점)로 검색광고 집중, CTR 최적화로 전환률 향상",
          "budgetSplitPct": { "검색광고": 30, "디스플레이": 15, "콘텐츠": 25, "CRM/리텐션": 30 }
        },
        "keywordTargeting": {
          "coreKeywords": ["구매", "주문", "결제", "할인", "특가"],
          "longTailKeywords": ["할인코드", "배송정보", "사용후기", "구매가이드", "최저가"],
          "brandVsNonBrand": { "brandSharePct": 60, "nonBrandSharePct": 40 },
          "matchTypes": ["정확","구문"],
          "negativeKeywords": ["무료체험", "취소", "환불"],
          "geoLangNotes": "전국 타겟, 한국어 위주"
        },
        "contentStrategy": {
          "adCreatives": ["할인 혜택", "긴급성 메시지", "보장 정책", "무료배송", "즉시할인"],
          "landingPage": { "keySections": ["상품정보", "할인혜택", "간편결제"], "primaryCTA": "지금 구매하기" },
          "educationalContent": ["사용 가이드", "FAQ", "고객 지원"],
          "socialProof": ["구매 후기", "사용 사례", "평점"]
        },
        "nicheStrategy": {
          "segments": ["결정단계고객", "재구매고객", "충성고객"],
          "personaValueProps": ["가성비", "편의성", "지속성"],
          "positioning": "최고의 가치를 제공하는 선택"
        },
        "retentionStrategy": {
          "crmScenarios": ["구매 확인", "사용법 안내", "재구매 제안"],
          "loyaltyOffers": ["멤버십 혜택", "재구매 할인", "VIP 서비스"],
          "reviewNPSLoop": ["만족도 조사", "리뷰 인센티브", "개선사항 반영"]
        },
        "experiments": ["가격 정책 테스트", "리텐션 프로그램 최적화"]
      }
    ]
  };
}