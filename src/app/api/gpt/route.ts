import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openai-client';
import { apiLogger } from '@/lib/api-logger';

export async function POST(request: NextRequest) {
  try {
    const { keywords } = await request.json();

    if (!keywords || !Array.isArray(keywords)) {
      return NextResponse.json(
        { error: '키워드 배열이 필요합니다.' },
        { status: 400 }
      );
    }

    // 환경변수 확인
    if (!process.env.OPENAI_API_KEY) {
      apiLogger.warning('OpenAI API 키가 설정되지 않았습니다. 목 데이터를 반환합니다.');
      return NextResponse.json(getMockCategoryData(keywords));
    }

    try {
      // 키워드를 50개 단위로 분할
      const batchSize = 50;
      const keywordBatches = [];
      
      for (let i = 0; i < keywords.length; i += batchSize) {
        keywordBatches.push(keywords.slice(i, i + batchSize));
      }
      
      apiLogger.info(`GPT-5 요청 시작`, { batchCount: keywordBatches.length, totalKeywords: keywords.length });
      
      // 모든 배치 결과를 저장할 객체
      let allCategoryData = {};
      
      // 각 배치를 병행 처리하기 위한 프로미스 배열 생성
      const batchPromises = keywordBatches.map(async (batch, batchIndex) => {
        // 프롬프트 구성
        const prompt = `###지시사항
아래 단어들을 충분히 분석하고 '구매여정 6단계 항목'중 가장 적절한 값에 매칭하여 JSON 형태로 출력하십시오.
사용자가 단어를 검색할 때 어떤 목적을 갖고 있는 지에 대한 관점으로 분석하십시오.
JSON 형태로 출력할 때 '''json과 같이 영역은 출력하지 말고 구조만 출력하십시오.

###구매여정 6단계 항목
['문제 인식 단계', '정보 탐색 단계', '대안 평가 단계', '구매 결정 단계', '구매 행동 단계', '구매 후 행동 단계']

###단어 목록
[${batch.map(k => `"${k}"`).join(', ')}]

###출력형태(JSON)
{
  "${batch[0]}": "<구매여정 6단계 항목 중 1개>",
  "${batch[1] || 'keyword2'}": "<구매여정 6단계 항목 중 1개>",
  ...
}`;

        apiLogger.info(`배치 ${batchIndex + 1}/${keywordBatches.length} 처리 시작`, { keywordCount: batch.length });
        
        try {
          const openai = getOpenAIClient();
          const result = await openai.responses.create({
            model: "gpt-5",
            input: prompt,
            reasoning: { effort: "low" },
            text: { verbosity: "low" },
          });

          apiLogger.success(`배치 ${batchIndex + 1} GPT-5 응답 받음`);

          // JSON 파싱 시도
          try {
            const batchCategoryData = JSON.parse(result.output_text);
            return batchCategoryData;
          } catch (parseError) {
            apiLogger.parseError(`배치 ${batchIndex + 1}`, parseError);
            // 파싱 실패 시 해당 배치만 목 데이터로 대체
            return getMockCategoryData(batch);
          }
        } catch (apiError) {
          apiLogger.apiError(`배치 ${batchIndex + 1} GPT-5`, apiError);
          // API 호출 실패 시 해당 배치만 목 데이터로 대체
          return getMockCategoryData(batch);
        }
      });

      // 모든 배치를 병행 처리
      const batchResults = await Promise.all(batchPromises);
      
      // 모든 결과를 병합
      batchResults.forEach(batchData => {
        allCategoryData = { ...allCategoryData, ...batchData };
      });
      
      apiLogger.success('모든 배치 처리 완료');
      return NextResponse.json(allCategoryData);

    } catch (error) {
      apiLogger.warning('GPT-5 API 호출 실패, 목 데이터를 반환합니다', { error: error.message || error });
      return NextResponse.json(getMockCategoryData(keywords));
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
function getMockCategoryData(keywords: string[]) {
  const categories = [
    '문제 인식 단계',
    '정보 탐색 단계',
    '대안 평가 단계',
    '구매 결정 단계',
    '구매 행동 단계',
    '구매 후 행동 단계'
  ];

  const result: { [key: string]: string } = {};
  
  keywords.forEach((keyword, index) => {
    // 키워드 패턴에 따른 간단한 분류 로직
    if (keyword.includes('가격') || keyword.includes('비교') || keyword.includes('리뷰')) {
      result[keyword] = '정보 탐색 단계';
    } else if (keyword.includes('구매') || keyword.includes('주문') || keyword.includes('결제')) {
      result[keyword] = '대안 평가 단계';
    } else if (keyword.includes('할인') || keyword.includes('쿠폰')) {
      result[keyword] = '구매 결정 단계';
    } else if (keyword.includes('사용법') || keyword.includes('문의') || keyword.includes('AS')) {
      result[keyword] = '구매 행동 단계';
    } else if (keyword.includes('브랜드') || keyword.includes('추천')) {
      result[keyword] = '구매 후 행동 단계';
    } else {
      // 기본값은 순환하여 배정
      result[keyword] = categories[index % categories.length];
    }
  });

  return result;
}