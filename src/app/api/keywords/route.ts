import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const hintKeywords = searchParams.get('hintKeywords');
    const siteId = searchParams.get('siteId');
    const biztpId = searchParams.get('biztpId');
    const event = searchParams.get('event');
    const month = searchParams.get('month');
    const showDetail = searchParams.get('showDetail') || '1';

    if (!hintKeywords) {
      return NextResponse.json(
        { error: '힌트 키워드가 필요합니다.' },
        { status: 400 }
      );
    }

    // 환경변수에서 API 키 가져오기
    const customerSecret = process.env.NAVER_ADS_CUSTOMER_SECRET;
    const accessToken = process.env.NAVER_ADS_ACCESS_TOKEN;
    const customerId = process.env.NAVER_ADS_CUSTOMER_ID;

    if (!customerSecret || !accessToken || !customerId) {
      console.warn('네이버 검색광고 API 키가 설정되지 않았습니다. 실제 API 형태의 목 데이터를 반환합니다.');
      return NextResponse.json(getMockKeywordData(hintKeywords));
    }

    try {
      console.log('🔄 네이버 검색광고 API 호출 시작');
      console.log('📝 요청 파라미터:', { hintKeywords, siteId, biztpId, event, month, showDetail });
      
      // 네이버 검색광고 API 요청
      const queryParams = new URLSearchParams({
        hintKeywords,
        showDetail,
        ...(siteId && { siteId }),
        ...(biztpId && { biztpId }),
        ...(event && { event }),
        ...(month && { month })
      });

      const uri = '/keywordstool';
      const method = 'GET';
      const timestamp = Math.round(Date.now());
      
      // 시그니처 생성
      const message = `${timestamp}.${method}.${uri}`;
      const signature = crypto
        .createHmac('sha256', customerSecret)
        .update(message)
        .digest('base64');

      console.log('🌐 API URL:', `https://api.naver.com/keywordstool?${queryParams}`);
      console.log('🔐 시그니처 정보:', { timestamp, message, signature });
      
      const response = await fetch(`https://api.naver.com/keywordstool?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Timestamp': timestamp.toString(),
          'X-API-KEY': accessToken,
          'X-Customer': customerId,
          'X-Signature': signature
        }
      });

      console.log('📡 API 응답 상태:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API 에러 응답:', errorText);
        throw new Error(`네이버 API 에러: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ API 응답 데이터:', JSON.stringify(data, null, 2));
      
      // keywordList 추출
      const keywordList = data.keywordList || [];
      
      // API 응답 데이터를 프론트엔드에서 사용할 형태로 변환
      const transformedData = keywordList.map((item: Record<string, unknown>) => ({
        keyword: item.relKeyword,
        monthlyPcQcCnt: item.monthlyPcQcCnt,
        monthlyMobileQcCnt: item.monthlyMobileQcCnt,
        monthlyAvePcClkCnt: item.monthlyAvePcClkCnt,
        monthlyAveMobileClkCnt: item.monthlyAveMobileClkCnt,
        monthlyAvePcCtr: item.monthlyAvePcCtr,
        monthlyAveMobileCtr: item.monthlyAveMobileCtr,
        plAvgDepth: item.plAvgDepth,
        compIdx: item.compIdx
      }));

      console.log('🔄 변환된 데이터:', transformedData);
      return NextResponse.json(transformedData);

    } catch (error) {
      console.warn('네이버 검색광고 API 호출 실패, 실제 API 형태의 목 데이터를 반환합니다:', error);
      return NextResponse.json(getMockKeywordData(hintKeywords));
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
function getMockKeywordData(hintKeywords: string) {
  // 다양한 연관 키워드를 포함한 목 데이터 (실제 API 응답 형태)
  return [
    {
      keyword: hintKeywords,
      monthlyPcQcCnt: '1250',
      monthlyMobileQcCnt: '3420',
      monthlyAvePcClkCnt: '15',
      monthlyAveMobileClkCnt: '28',
      monthlyAvePcCtr: '2.5',
      monthlyAveMobileCtr: '1.8',
      plAvgDepth: '3.2',
      compIdx: 'mid'
    },
    {
      keyword: `${hintKeywords} 가격`,
      monthlyPcQcCnt: '890',
      monthlyMobileQcCnt: '2150',
      monthlyAvePcClkCnt: '12',
      monthlyAveMobileClkCnt: '22',
      monthlyAvePcCtr: '1.9',
      monthlyAveMobileCtr: '1.5',
      plAvgDepth: '2.8',
      compIdx: 'low'
    },
    {
      keyword: `${hintKeywords} 리뷰`,
      monthlyPcQcCnt: '2100',
      monthlyMobileQcCnt: '4800',
      monthlyAvePcClkCnt: '25',
      monthlyAveMobileClkCnt: '45',
      monthlyAvePcCtr: '3.1',
      monthlyAveMobileCtr: '2.2',
      plAvgDepth: '4.1',
      compIdx: 'high'
    },
    {
      keyword: `${hintKeywords} 추천`,
      monthlyPcQcCnt: '780',
      monthlyMobileQcCnt: '1950',
      monthlyAvePcClkCnt: '9',
      monthlyAveMobileClkCnt: '18',
      monthlyAvePcCtr: '1.6',
      monthlyAveMobileCtr: '1.2',
      plAvgDepth: '2.4',
      compIdx: 'low'
    },
    {
      keyword: `${hintKeywords} 비교`,
      monthlyPcQcCnt: '1680',
      monthlyMobileQcCnt: '3200',
      monthlyAvePcClkCnt: '20',
      monthlyAveMobileClkCnt: '35',
      monthlyAvePcCtr: '2.8',
      monthlyAveMobileCtr: '2.1',
      plAvgDepth: '3.7',
      compIdx: 'mid'
    },
    {
      keyword: `${hintKeywords} 할인`,
      monthlyPcQcCnt: '1430',
      monthlyMobileQcCnt: '2880',
      monthlyAvePcClkCnt: '18',
      monthlyAveMobileClkCnt: '32',
      monthlyAvePcCtr: '2.4',
      monthlyAveMobileCtr: '1.9',
      plAvgDepth: '3.1',
      compIdx: 'mid'
    },
    {
      keyword: `${hintKeywords} 구매`,
      monthlyPcQcCnt: '950',
      monthlyMobileQcCnt: '2350',
      monthlyAvePcClkCnt: '14',
      monthlyAveMobileClkCnt: '26',
      monthlyAvePcCtr: '2.1',
      monthlyAveMobileCtr: '1.7',
      plAvgDepth: '2.9',
      compIdx: 'low'
    },
    {
      keyword: `${hintKeywords} 사이트`,
      monthlyPcQcCnt: '1120',
      monthlyMobileQcCnt: '2640',
      monthlyAvePcClkCnt: '16',
      monthlyAveMobileClkCnt: '29',
      monthlyAvePcCtr: '2.3',
      monthlyAveMobileCtr: '1.8',
      plAvgDepth: '3.0',
      compIdx: 'mid'
    },
    {
      keyword: `${hintKeywords} 브랜드`,
      monthlyPcQcCnt: '670',
      monthlyMobileQcCnt: '1780',
      monthlyAvePcClkCnt: '8',
      monthlyAveMobileClkCnt: '16',
      monthlyAvePcCtr: '1.4',
      monthlyAveMobileCtr: '1.1',
      plAvgDepth: '2.2',
      compIdx: 'low'
    },
    {
      keyword: `저렴한 ${hintKeywords}`,
      monthlyPcQcCnt: '1320',
      monthlyMobileQcCnt: '2970',
      monthlyAvePcClkCnt: '17',
      monthlyAveMobileClkCnt: '31',
      monthlyAvePcCtr: '2.6',
      monthlyAveMobileCtr: '2.0',
      plAvgDepth: '3.3',
      compIdx: 'high'
    }
  ];
}