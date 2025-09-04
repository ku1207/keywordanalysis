import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openai-client';
import { apiLogger } from '@/lib/api-logger';

interface KeywordInfo {
  keyword: string;
  pcCount: number;
  mobileCount: number;
  pcCtr: number;
  mobileCtr: number;
}

export async function POST(request: NextRequest) {
  try {
    const { stage, keywords } = await request.json();

    if (!stage || !keywords || !Array.isArray(keywords)) {
      return NextResponse.json(
        { error: '구매여정 단계와 키워드 배열이 필요합니다.' },
        { status: 400 }
      );
    }

    // 환경변수 확인
    if (!process.env.OPENAI_API_KEY) {
      apiLogger.warning('OpenAI API 키가 설정되지 않았습니다. 목 데이터를 반환합니다.');
      return NextResponse.json(getMockInsightData(stage));
    }

    try {
      // 키워드 정보를 문자열로 변환
      const keywordInfoString = keywords.map((kw: KeywordInfo) => 
        `키워드: ${kw.keyword}, 월간검색량(PC): ${kw.pcCount}, 월간검색량(MO): ${kw.mobileCount}, 월간클릭률(PC): ${kw.pcCtr}%, 월간클릭률(MO): ${kw.mobileCtr}%`
      ).join('\n');

      // 키워드가 없는 경우 특별한 응답 반환
      if (!keywordInfoString || keywordInfoString.trim() === '') {
        const emptyKeywordResponse = {
          "customerPsychology": {
            "dataDriven": {
              "emotions": "해당되는 키워드가 없습니다.",
              "motivations": "해당되는 키워드가 없습니다.",
              "cognitiveLevel": "해당되는 키워드가 없습니다."
            },
            "generalInsight": {
              "needs": "해당되는 키워드가 없습니다.",
              "anxieties": "해당되는 키워드가 없습니다."
            }
          },
          "risksAndBarriers": {
            "dataDriven": {
              "internal": "해당되는 키워드가 없습니다.",
              "external": "해당되는 키워드가 없습니다.",
              "riskTypes": "해당되는 키워드가 없습니다."
            },
            "generalInsight": {
              "commonBarriers": "해당되는 키워드가 없습니다."
            }
          },
          "contentMessagingStrategy": {
            "dataDriven": {
              "messageTone": "해당되는 키워드가 없습니다.",
              "contentTypes": "해당되는 키워드가 없습니다.",
              "corePoints": "해당되는 키워드가 없습니다."
            },
            "generalInsight": {
              "psychologyRelief": "해당되는 키워드가 없습니다.",
              "valueProposition": "해당되는 키워드가 없습니다."
            }
          }
        };
        return NextResponse.json(emptyKeywordResponse);
      }

      // 프롬프트 구성
      const prompt = `###지시사항
온라인 포털 사이트에서 수집한 **검색 키워드, 검색 횟수, 클릭률**를 분석하여 ${stage}에서의 마케팅 인사이트를 json 형식으로 도출하십시오.
이 데이터는 고객이 어떤 문제를 인식하고, 어떤 정보를 탐색하며, 어떤 대안을 고려하는지의 **행동적 단서**로 활용하십시오.
키워드와 클릭율은 고객의 **관심 수준 의사결정 강도, 정보 탐색 의도**를 반영합니다.
단, json 형식을 출력할 때 '''json과 같은 json 영역이 아닌 구조만 출력하십시오. 

###작성 가이드라인
1. customerPsychology  
   - dataDriven  
     - emotions: 데이터가 보여주는 고객의 **즉각적 감정 상태**는 무엇인가? (예: 혼란, 기대, 불안, 확신 등)  
     - motivations: 특정 키워드 검색 및 CTR 패턴을 근거로, 고객의 **행동 동기**는 무엇인가? (예: 학습 효율성 추구, 빠른 문제 해결, 최신 정보 욕구 등)  
     - cognitiveLevel: 데이터상 고객이 해당 단계에서 가진 **문제·해결책 인지 수준**은 어느 정도인가? (예: 문제만 인식, 해결책 탐색 중, 구매 실행 직전 등)  
   - generalInsight  
     - needs: 일반적으로 고객이 해당 단계에서 가지는 **핵심 욕구**는 무엇인가?  
     - anxieties: 고객이 흔히 경험하는 **심리적 불안/걱정 요소**는 무엇인가?  

2. risksAndBarriers  
   - dataDriven  
     - internal: CTR/검색 패턴에서 드러나는 고객의 **내적 저항 요인**은 무엇인가? (예: 선택 회피, 의사결정 피로, 무관심 등)  
     - external: 데이터가 시사하는 **외적 장벽**은 무엇인가? (예: 검색량은 높으나 CTR 저조 → 정보 신뢰 부족, PC CTR 0% → 접근성 문제 등)  
     - riskTypes: 이 단계에서 중요한 **리스크 유형**은 무엇인가? (경제적, 기능적, 사회적, 심리적 리스크 중 구체적으로)  
   - generalInsight  
     - commonBarriers: 고객이 전형적으로 직면하는 **일반적 장벽**은 무엇인가? (예: 가격 부담, 시간 부족, 복잡한 절차, 정보 과잉 등)  

3. contentMessagingStrategy  
   - dataDriven  
     - messageTone: 데이터 기반으로 볼 때, 고객에게 가장 효과적인 **메시지 톤**은 무엇인가? (예: 교육적, 안심, 긴급, 신뢰 중심 등)  
     - contentTypes: 검색 키워드 및 CTR 결과를 참고할 때, 고객이 반응할 가능성이 높은 **콘텐츠 유형**은 무엇인가? (예: 리뷰, 비교표, 퀵 체험, 핵심 요약 자료 등)  
     - corePoints: 이 단계에서 반드시 전달해야 할 **핵심 메시지 포인트**는 무엇인가? (예: “신뢰 확보”, “시간 절약”, “점수 향상 보장” 등)  
   - generalInsight  
     - psychologyRelief: 고객 불안과 장벽을 줄이기 위해 어떤 **심리적 해소 메시지**가 필요한가?  
     - valueProposition: 고객이 체감할 수 있는 **차별적 가치 제안**은 무엇인가?   

###출력형식(JSON)
{
  "customerPsychology": {
    "dataDriven": {
      "emotions": "...",
      "motivations": "...",
      "cognitiveLevel": "..."
    },
    "generalInsight": {
      "needs": "...",
      "anxieties": "..."
    }
  },
  "risksAndBarriers": {
    "dataDriven": {
      "internal": "...",
      "external": "...",
      "riskTypes": "..."
    },
    "generalInsight": {
      "commonBarriers": "..."
    }
  },
  "contentMessagingStrategy": {
    "dataDriven": {
      "messageTone": "...",
      "contentTypes": "...",
      "corePoints": "..."
    },
    "generalInsight": {
      "psychologyRelief": "...",
      "valueProposition": "..."
    }
  }
}

###키워드 정보
${keywordInfoString}`;

      apiLogger.info(`${stage} 마케팅 인사이트 분석 요청`);

      const openai = getOpenAIClient();
      const result = await openai.responses.create({
        model: "gpt-5",
        input: prompt,
        reasoning: { effort: "low" },
        text: { verbosity: "low" },
      });

      apiLogger.apiSuccess(`${stage} GPT-5 인사이트`);

      // JSON 파싱 시도
      try {
        const insightData = JSON.parse(result.output_text);
        return NextResponse.json(insightData);
      } catch (parseError) {
        apiLogger.parseError(`${stage}`, parseError);
        return NextResponse.json(getMockInsightData(stage));
      }

    } catch (error) {
      apiLogger.warning('GPT-5 API 호출 실패, 목 데이터를 반환합니다', { error: error.message || error });
      return NextResponse.json(getMockInsightData(stage));
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
function getMockInsightData(stage: string) {
  const mockData = {
    "customerPsychology": {
      "dataDriven": {
        "emotions": `${stage}에서 고객들은 혼란과 기대감이 공존하는 복합적 감정 상태를 보입니다.`,
        "motivations": "특정 키워드들에 대한 높은 관심도와 정보 탐색 의도가 드러나며, 빠른 문제 해결에 대한 욕구가 강합니다.",
        "cognitiveLevel": "클릭률 데이터를 통해 볼 때 고객들의 문제 인식 수준은 명확하지만 해결책에 대한 구체적 지식은 부족한 상태입니다."
      },
      "generalInsight": {
        "needs": "이 단계에서 고객들은 자신의 니즈에 대한 명확한 이해와 신뢰할 수 있는 정보에 대한 욕구가 큽니다.",
        "anxieties": "불확실성과 잘못된 선택에 대한 두려움, 시간 낭비에 대한 걱정이 주요 불안 요소입니다."
      }
    },
    "risksAndBarriers": {
      "dataDriven": {
        "internal": "낮은 클릭률을 보이는 키워드들에서 선택 회피 성향과 의사결정 피로감이 관찰됩니다.",
        "external": "특정 키워드 집중 현상은 정보 접근성 문제와 검색 결과의 신뢰성 부족을 나타냅니다.",
        "riskTypes": "이 단계에서는 주로 기능적 리스크와 심리적 리스크가 중요한 요소로 작용합니다."
      },
      "generalInsight": {
        "commonBarriers": `${stage}에서 고객들이 직면하는 주요 장벽은 정보 과부하, 복잡한 선택지, 그리고 신뢰할 수 있는 정보원의 부족입니다.`
      }
    },
    "contentMessagingStrategy": {
      "dataDriven": {
        "messageTone": "높은 클릭률을 보이는 키워드 분석 결과 신뢰 중심의 교육적 톤이 가장 효과적입니다.",
        "contentTypes": "고객이 반응할 가능성이 높은 콘텐츠는 비교표, 핵심 요약 자료, 그리고 실제 후기입니다.",
        "corePoints": "이 단계에서는 '신뢰 확보'와 '명확한 가이드 제공'이 핵심 메시지 포인트입니다."
      },
      "generalInsight": {
        "psychologyRelief": "고객 불안 해소를 위해 단계별 가이드와 성공 사례 제시가 필요합니다.",
        "valueProposition": `${stage}에 적합한 차별적 가치 제안은 전문성과 맞춤형 솔루션 제공입니다.`
      }
    }
  };

  return mockData;
}