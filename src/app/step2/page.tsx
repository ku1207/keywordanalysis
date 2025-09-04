"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { useAnalysisStore } from '@/store/keyword-analysis';
import { getKeywordTrendData } from '@/lib/api-client';

const stepLabels = ['키워드 검색량 조회', '분석 개요', '세부 분석', '종합 인사이트'];


export default function DataDisplayPage() {
  const router = useRouter();
  const { 
    currentStep, 
    keyword, 
    keywordData,
    setCurrentStep,
    setKeywordData,
    nextStep,
    prevStep 
  } = useAnalysisStore();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  useEffect(() => {
    setCurrentStep(2);
    
    const fetchKeywordData = async () => {
      if (!keyword) {
        router.push('/');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await getKeywordTrendData(keyword);
        setKeywordData(data);
      } catch (err) {
        setError('데이터를 가져오는데 실패했습니다.');
        console.error('키워드 데이터 가져오기 실패:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchKeywordData();
  }, [keyword]);

  const handleNext = () => {
    if (keywordData.length === 0) {
      alert('데이터가 없습니다.');
      return;
    }
    nextStep();
    router.push('/step3');
  };

  const handlePrev = () => {
    prevStep();
    router.push('/');
  };

  return (
    <div className="space-y-8">
      <Progress 
        currentStep={currentStep - 1} 
        totalSteps={4} 
        stepLabels={stepLabels} 
      />

      <Card className="p-8 bg-white">
        <div className="space-y-6 bg-white">
          <div>
            <p className="text-gray-600">
              &apos;{keyword}&apos; 키워드 관련 검색 데이터입니다. (총 {keywordData.length}개)
            </p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">데이터를 가져오는 중...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {!loading && !error && keywordData.length > 0 && (
            <div className="w-[95%] mx-auto border rounded-lg overflow-hidden bg-white">
              <Table className="w-full bg-white">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-900">순번</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-900">연관키워드</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-900">월간검색수(PC)</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-900">월간검색수(모바일)</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-900">월평균클릭수(PC)</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-900">월평균클릭수(모바일)</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-900">월평균클릭률(PC)</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-900">월평균클릭률(모바일)</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-900">월평균노출광고수</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-900">경쟁정도</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {keywordData
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((item, index) => {
                    const actualIndex = (currentPage - 1) * itemsPerPage + index;
                    const getCompetitiveClass = (compIdx: string) => {
                      switch(compIdx) {
                        case '높음': return 'text-red-600 font-semibold';
                        case '중간': return 'text-yellow-600 font-semibold';
                        case '낮음': return 'text-green-600 font-semibold';
                        default: return 'text-gray-600';
                      }
                    };
                    
                    const getCompetitiveText = (compIdx: string) => {
                      switch(compIdx) {
                        case '높음': return '고경쟁';
                        case '중간': return '중경쟁';
                        case '낮음': return '저경쟁';
                        default: return '-';
                      }
                    };
                    
                    const formatNumber = (value: string) => {
                      if (value === '<10' || value === '0') return value;
                      const num = parseInt(value);
                      return isNaN(num) ? value : num.toLocaleString();
                    };
                    
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs text-center text-gray-900">{actualIndex + 1}</td>
                        <td className="px-4 py-3 text-xs text-center text-gray-900">{item.keyword}</td>
                        <td className="px-4 py-3 text-xs text-right text-blue-600">{formatNumber(item.monthlyPcQcCnt)}</td>
                        <td className="px-4 py-3 text-xs text-right text-green-600">{formatNumber(item.monthlyMobileQcCnt)}</td>
                        <td className="px-4 py-3 text-xs text-right text-gray-600">{formatNumber(item.monthlyAvePcClkCnt)}</td>
                        <td className="px-4 py-3 text-xs text-right text-gray-600">{formatNumber(item.monthlyAveMobileClkCnt)}</td>
                        <td className="px-4 py-3 text-xs text-right text-purple-600">{item.monthlyAvePcCtr}%</td>
                        <td className="px-4 py-3 text-xs text-right text-purple-600">{item.monthlyAveMobileCtr}%</td>
                        <td className="px-4 py-3 text-xs text-right text-orange-600">{item.plAvgDepth}</td>
                        <td className={`px-4 py-3 text-xs text-center ${getCompetitiveClass(item.compIdx)}`}>{getCompetitiveText(item.compIdx)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
              
              {/* 페이지네이션 */}
              {keywordData.length > itemsPerPage && (
                <div className="flex justify-center items-center py-4 border-t bg-gray-50">
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm"
                    >
                      이전
                    </Button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.ceil(keywordData.length / itemsPerPage) }, (_, i) => i + 1)
                        .filter(page => {
                          const totalPages = Math.ceil(keywordData.length / itemsPerPage);
                          if (totalPages <= 7) return true;
                          if (page === 1 || page === totalPages) return true;
                          if (page >= currentPage - 2 && page <= currentPage + 2) return true;
                          return false;
                        })
                        .map((page, index, array) => {
                          const prevPage = array[index - 1];
                          const showEllipsis = prevPage && page - prevPage > 1;
                          
                          return (
                            <div key={page} className="flex items-center">
                              {showEllipsis && (
                                <span className="px-2 py-1 text-sm text-gray-500">...</span>
                              )}
                              <Button
                                variant={currentPage === page ? "default" : "outline"}
                                onClick={() => setCurrentPage(page)}
                                className={`px-3 py-1 text-sm ${
                                  currentPage === page 
                                    ? 'bg-blue-600 text-white border-blue-600' 
                                    : 'text-gray-700'
                                }`}
                              >
                                {page}
                              </Button>
                            </div>
                          );
                        })}
                    </div>
                    
                    <Button 
                      variant="outline" 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(keywordData.length / itemsPerPage)))}
                      disabled={currentPage === Math.ceil(keywordData.length / itemsPerPage)}
                      className="px-3 py-1 text-sm"
                    >
                      다음
                    </Button>
                  </div>
                  
                  <div className="ml-4 text-sm text-gray-600">
                    {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, keywordData.length)} / {keywordData.length}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={handlePrev}>
              이전 단계
            </Button>
            <Button onClick={handleNext}>
              다음 단계
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}