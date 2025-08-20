import axios from 'axios';

export interface KeywordAnalysisData {
  keyword: string;
  monthlyPcQcCnt: string;
  monthlyMobileQcCnt: string;
  monthlyAvePcClkCnt: string;
  monthlyAveMobileClkCnt: string;
  monthlyAvePcCtr: string;
  monthlyAveMobileCtr: string;
  plAvgDepth: string;
  compIdx: string;
}

export async function getKeywordTrendData(
  hintKeywords: string,
  siteId?: string,
  biztpId?: number,
  event?: number,
  month?: number,
  showDetail: number = 1
): Promise<KeywordAnalysisData[]> {
  try {
    const queryParams = new URLSearchParams({
      hintKeywords,
      showDetail: showDetail.toString(),
      ...(siteId && { siteId }),
      ...(biztpId && { biztpId: biztpId.toString() }),
      ...(event && { event: event.toString() }),
      ...(month && { month: month.toString() })
    });

    const response = await axios.get(`/api/keywords?${queryParams}`);
    return response.data;
  } catch (error) {
    console.error('키워드 데이터 조회 실패:', error);
    throw new Error('키워드 데이터를 가져오는데 실패했습니다.');
  }
}