import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    console.log('🔥 [STEP 0] 사용자 여정지도 요청 시작:', {
      method: request.method,
      url: request.url,
      timestamp: new Date().toISOString()
    });

    const { data } = await request.json();

    // 환경변수 확인
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API 키가 설정되지 않았습니다. 목 데이터를 반환합니다.');
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

      console.log(`📝 사용자 여정지도 감정 분석 요청`);

      const result = await openai.responses.create({
        model: "gpt-5",
        input: prompt,
        reasoning: { effort: "low" },
        text: { verbosity: "low" },
      });

      console.log(`✅ GPT-5 사용자 여정지도 응답 받음`);

      // JSON 파싱 시도
      let journeyMapData;
      try {
        journeyMapData = JSON.parse(result.output_text);
        console.log(`✅ 사용자 여정지도 데이터 파싱 성공`);
      } catch (parseError) {
        console.error(`❌ JSON 파싱 실패:`, parseError);
        journeyMapData = getMockJourneyMapData();
      }

      // 간트차트 API 호출
      console.log(`📝 간트차트 전략 분석 시작`);
      let ganttData;
      try {
        const ganttPrompt = `###지시사항
입력(① **stageEmotionScores**(여정지도 결과), ② **키워드데이터**)값에 분석하여 각 범위(rangeId)에 대해 **연속 구간 단위 전략 5종**만 산출한다. 출력은 **JSON만** 반환한다.

###범위 자동 도출 규칙( ranges 미제공 시 )
- 감정 점수의 변화로 **연속 구간**을 2~3개 제안. 절대 비연속 금지.
- **컷포인트 후보**: |Δemotion| ≥ 2, 중립선(5) 교차, 국소 최소(≤4)·최대(≥8) 직후.
- 후보를 기반으로 2개 우선(기본: [1~3], [4~6]). 신호가 강하면 3개까지 허용.
- 각 범위에 간단한 라벨을 생성(예: "상단퍼널(1~3)", "하단퍼널(4~6)").

###자원 배분 가중(감정 점수 활용)
- 범위별 가중치 w = Σ(10 - emotion_i) / 범위내 단계수  (낮은 감정=마찰↑ → 더 많은 개선/콘텐츠 투자)
- 검색량 신호가 있으면 w를 곱해 보정(예: w' = w × normalized_search_volume). 신호 없으면 method="추정".

###산출물: 각 범위의 전략 5종(리스트 최대 3개, 실험 최대 2개)
1) resourceAllocation(총합 100% 또는 "-")
2) keywordTargeting(핵심/롱테일/브랜드vs일반/매치타입/네거티브/지역언어)
3) contentStrategy(광고소재·랜딩 IA/CTA·교육콘텐츠·소셜프루프)
4) nicheStrategy(세그먼트·가치제안·포지셔닝)
5) retentionStrategy(CRM/리마케팅·로열티·후기/NPS 루프)

※ KPI·직접 인용·리스크 필드 없음. 불확실 시 "-" 표기.

###출력 형식(JSON · 엄격)
{
  "ganttStrategy": [
    {
      "rangeId": "R1",
      "rangeLabel": "상단퍼널(1~3)",
      "startStageIndex": 1,
      "endStageIndex": 3,
      "resourceAllocation": {
        "method": "검색량 기반 | 추정 | -",
        "notes": "-",
        "budgetSplitPct": { "검색광고": 40, "디스플레이": 20, "콘텐츠": 20, "CRM/리텐션": 20 }
      },
      "keywordTargeting": {
        "coreKeywords": ["최대 3개"],
        "longTailKeywords": ["최대 3개"],
        "brandVsNonBrand": { "brandSharePct": 30, "nonBrandSharePct": 70 },
        "matchTypes": ["정확","구문","확장"],
        "negativeKeywords": ["최대 3개"],
        "geoLangNotes": "-"
      },
      "contentStrategy": {
        "adCreatives": ["최대 3개"],
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

        console.log(`✅ GPT-5 간트차트 전략 응답 받음`);

        try {
          ganttData = JSON.parse(ganttResult.output_text);
          console.log(`✅ 간트차트 데이터 파싱 성공`);
        } catch (ganttParseError) {
          console.error(`❌ 간트차트 JSON 파싱 실패:`, ganttParseError);
          ganttData = getMockGanttData();
        }
      } catch (ganttError) {
        console.warn('간트차트 GPT-5 API 호출 실패, 목 데이터를 반환합니다:', ganttError);
        ganttData = getMockGanttData();
      }

      // 두 결과를 통합하여 반환
      const combinedResult = {
        journeyMap: journeyMapData,
        ganttChart: ganttData
      };

      return NextResponse.json(combinedResult);

    } catch (error) {
      console.warn('GPT-5 API 호출 실패, 목 데이터를 반환합니다:', error);
      const fallbackResult = {
        journeyMap: getMockJourneyMapData(),
        ganttChart: getMockGanttData()
      };
      return NextResponse.json(fallbackResult);
    }

  } catch (error) {
    console.error('API Route 오류:', error);
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
          "method": "추정",
          "notes": "초기 인지 단계에 집중 투자",
          "budgetSplitPct": { "검색광고": 45, "디스플레이": 25, "콘텐츠": 20, "CRM/리텐션": 10 }
        },
        "keywordTargeting": {
          "coreKeywords": ["브랜드명", "카테고리명", "문제키워드"],
          "longTailKeywords": ["문제해결방법", "비교가이드", "사용법"],
          "brandVsNonBrand": { "brandSharePct": 30, "nonBrandSharePct": 70 },
          "matchTypes": ["정확","구문","확장"],
          "negativeKeywords": ["무료", "저렴한", "할인"],
          "geoLangNotes": "전국 타겟, 한국어 위주"
        },
        "contentStrategy": {
          "adCreatives": ["문제해결 메시지", "전문성 강조", "신뢰성 어필"],
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
          "method": "추정",
          "notes": "전환 및 유지에 집중 투자",
          "budgetSplitPct": { "검색광고": 30, "디스플레이": 15, "콘텐츠": 25, "CRM/리텐션": 30 }
        },
        "keywordTargeting": {
          "coreKeywords": ["구매", "주문", "결제"],
          "longTailKeywords": ["할인코드", "배송정보", "사용후기"],
          "brandVsNonBrand": { "brandSharePct": 60, "nonBrandSharePct": 40 },
          "matchTypes": ["정확","구문"],
          "negativeKeywords": ["무료체험", "취소", "환불"],
          "geoLangNotes": "전국 타겟, 한국어 위주"
        },
        "contentStrategy": {
          "adCreatives": ["할인 혜택", "긴급성 메시지", "보장 정책"],
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