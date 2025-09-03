"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAnalysisStore } from '@/store/keyword-analysis';
import { JourneyMap } from '@/components/ui/journey-map';
import axios from 'axios';

const stepLabels = ['키워드 검색량 조회', '분석 개요', '세부 분석', '종합 인사이트'];


interface JourneyMapData {
  stageEmotionScores: Array<{
    stageIndex: number;
    emotion: number;
  }>;
}

interface GanttData {
  ganttStrategy: Array<{
    rangeId: string;
    rangeLabel: string;
    startStageIndex: number;
    endStageIndex: number;
    resourceAllocation: {
      method: string;
      notes: string;
      budgetSplitPct: {
        검색광고: number;
        디스플레이: number;
        콘텐츠: number;
        "CRM/리텐션": number;
      };
    };
    keywordTargeting: {
      coreKeywords: string[];
      longTailKeywords: string[];
      brandVsNonBrand: {
        brandSharePct: number;
        nonBrandSharePct: number;
      };
      matchTypes: string[];
      negativeKeywords: string[];
      geoLangNotes: string;
    };
    contentStrategy: {
      adCreatives: string[];
      landingPage: {
        keySections: string[];
        primaryCTA: string;
      };
      educationalContent: string[];
      socialProof: string[];
    };
    nicheStrategy: {
      segments: string[];
      personaValueProps: string[];
      positioning: string;
    };
    retentionStrategy: {
      crmScenarios: string[];
      loyaltyOffers: string[];
      reviewNPSLoop: string[];
    };
    experiments: string[];
  }>;
}

interface ComprehensiveInsights {
  journeyMap: JourneyMapData;
  ganttChart: GanttData;
}

export default function ComprehensiveInsightsPage() {
  const router = useRouter();
  const { 
    currentStep,
    keywordData,
    categoryData,
    searchVolumeTrends,
    setCurrentStep,
    prevStep
  } = useAnalysisStore();
  
  const [loading, setLoading] = useState(false);
  const [comprehensiveInsights, setComprehensiveInsights] = useState<ComprehensiveInsights | null>(null);
  const [stagePercentages, setStagePercentages] = useState<{[key: string]: number}>({});
  const [activeTab, setActiveTab] = useState<string>('');


  useEffect(() => {
    const initializePage = async () => {
      setCurrentStep(5);
      
      // step3에서 가져온 검색량 분포 계산
      if (categoryData && Object.keys(categoryData).length > 0) {
        if (!categoryData || Object.keys(categoryData).length === 0) return;
        
        const stageCounts: {[key: string]: number} = {
          'awareness': 0,
          'consideration': 0,
          'decision': 0,
          'purchase': 0,
          'retention': 0,
          'special': 0
        };
        
        const stageMapping: {[key: string]: string} = {
          '문제 인식 단계': 'awareness',
          '정보 탐색 단계': 'consideration',
          '대안 평가 단계': 'decision',
          '구매 결정 단계': 'purchase',
          '구매 행동 단계': 'retention',
          '구매 후 행동 단계': 'special'
        };
        
        let totalCount = 0;
        
        Object.values(categoryData).forEach(category => {
          const stageKey = stageMapping[category as string];
          if (stageKey) {
            stageCounts[stageKey]++;
            totalCount++;
          }
        });
        
        const percentages: {[key: string]: number} = {};
        Object.keys(stageCounts).forEach(stageKey => {
          percentages[stageKey] = totalCount > 0 ? Math.round((stageCounts[stageKey] / totalCount) * 100) : 0;
        });
        
        setStagePercentages(percentages);
      }
      
      // 종합 인사이트 생성
      if (keywordData && keywordData.length > 0) {
        setLoading(true);
        try {
          // step4에서 생성된 마케팅 인사이트 데이터 수집
          const marketingInsights = sessionStorage.getItem('marketingInsights');
          const step4Insights = marketingInsights ? JSON.parse(marketingInsights) : null;
          
          const dataForGPT = {
            keywordData: keywordData.slice(0, 20),
            categoryData,
            searchVolumeTrends,
            marketingInsights: step4Insights
          };
          
          console.log('종합 인사이트 생성 시작', { timestamp: new Date().toISOString() });
          
          const response = await axios.post('/api/gpt-comprehensive', {
            data: JSON.stringify(dataForGPT, null, 2)
          });
          
          setComprehensiveInsights(response.data);
          // 첫 번째 탭을 기본으로 설정
          if (response.data?.ganttChart?.ganttStrategy?.length > 0) {
            setActiveTab(response.data.ganttChart.ganttStrategy[0].rangeId);
          }
          console.log('종합 인사이트 생성 완료', { timestamp: new Date().toISOString() });
          
        } catch (error) {
          console.error('종합 인사이트 생성 실패:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    initializePage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCurrentStep, categoryData, keywordData]);

  const handleNext = () => {
    router.push('/step6');
  };

  const handlePrev = () => {
    prevStep();
    router.push('/step4');
  };

  return (
    <div className="space-y-8">
      <Progress 
        currentStep={currentStep - 1} 
        totalSteps={4} 
        stepLabels={stepLabels} 
      />

      <Card className="p-8 bg-white">
        <div className="w-[95%] mx-auto space-y-6 bg-white">
          <div>
            <h2 className="text-2xl font-bold mb-2 text-blue-600">종합 인사이트</h2>
            <p className="text-gray-600">사용자 여정지도 & 전략</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-4 text-gray-600 text-lg">종합 인사이트를 분석하는 중...</span>
            </div>
          ) : (
            <div className="space-y-0">
              {/* 사용자 여정지도 + 간트차트 통합 */}
              {comprehensiveInsights && (
                <JourneyMap 
                  stageEmotionScores={comprehensiveInsights.journeyMap.stageEmotionScores || []}
                  stagePercentages={stagePercentages}
                  ganttStrategy={comprehensiveInsights.ganttChart.ganttStrategy || []}
                />
              )}
              
              {/* 상세 인사이트 및 간트 전략 */}
              {comprehensiveInsights && comprehensiveInsights.ganttChart.ganttStrategy && (
                <div className="mt-8">
                  {/* 탭 헤더 */}
                  <div className="flex border-b border-gray-200 bg-white rounded-t-lg">
                    {comprehensiveInsights.ganttChart.ganttStrategy.map((range) => (
                      <button
                        key={range.rangeId}
                        onClick={() => setActiveTab(range.rangeId)}
                        className={`px-6 py-3 text-sm font-medium transition-colors ${
                          activeTab === range.rangeId
                            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        {range.rangeLabel}
                      </button>
                    ))}
                  </div>
                  
                  {/* 탭 콘텐츠 */}
                  {comprehensiveInsights.ganttChart.ganttStrategy.filter(range => range.rangeId === activeTab).map((range, rangeIndex) => (
                    <div key={rangeIndex} className="bg-white border border-t-0 shadow-sm overflow-hidden rounded-b-lg">
                      {/* Range 헤더 */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-xl font-bold text-gray-900">{range.rangeLabel}</h4>
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                            단계 {range.startStageIndex} → {range.endStageIndex}
                          </span>
                        </div>
                        <p className="text-gray-700">구매여정 {range.startStageIndex}~{range.endStageIndex}단계 마케팅 전략</p>
                      </div>

                      {/* 인사이트 및 간트 전략 그리드 */}
                      <div className="p-6">
                        <div className="space-y-6">

                          {/* 간트 전략 섹션 */}
                          <div className="space-y-4">
                              
                              {/* 1. 자원 배분 */}
                              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                <h6 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                                  <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs">1</span>
                                  검색량 기반 자원 배분
                                </h6>
                                <div className="space-y-2">
                                  <p className="text-sm text-gray-700">
                                    <span className="font-medium">방법:</span> {range.resourceAllocation.method}
                                  </p>
                                  {range.resourceAllocation.notes && (
                                    <p className="text-sm text-gray-600">{range.resourceAllocation.notes}</p>
                                  )}
                                  
                                  {/* 원형 그래프 */}
                                  <div className="flex flex-col items-center mt-4">
                                    <div className="text-sm font-medium text-gray-700 mb-3">예산 배분:</div>
                                    <div className="relative w-48 h-48">
                                      <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                                        {(() => {
                                          const validEntries = Object.entries(range.resourceAllocation.budgetSplitPct)
                                            .filter(([_, value]) => value && value !== 0);
                                          
                                          const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];
                                          let cumulativeAngle = 0;
                                          const centerX = 100;
                                          const centerY = 100;
                                          const radius = 80;
                                          
                                          return validEntries.map(([key, value], index) => {
                                            const percentage = value as number;
                                            const angle = (percentage / 100) * 360;
                                            const startAngle = cumulativeAngle;
                                            const endAngle = cumulativeAngle + angle;
                                            
                                            cumulativeAngle += angle;
                                            
                                            const startAngleRad = (startAngle * Math.PI) / 180;
                                            const endAngleRad = (endAngle * Math.PI) / 180;
                                            
                                            const x1 = centerX + radius * Math.cos(startAngleRad);
                                            const y1 = centerY + radius * Math.sin(startAngleRad);
                                            const x2 = centerX + radius * Math.cos(endAngleRad);
                                            const y2 = centerY + radius * Math.sin(endAngleRad);
                                            
                                            const largeArc = angle > 180 ? 1 : 0;
                                            
                                            return (
                                              <path
                                                key={key}
                                                d={`M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                                                fill={colors[index % colors.length]}
                                                stroke="white"
                                                strokeWidth="2"
                                              />
                                            );
                                          });
                                        })()}
                                      </svg>
                                    </div>
                                    
                                    {/* 범례 */}
                                    <div className="grid grid-cols-2 gap-3 mt-4 w-full">
                                      {Object.entries(range.resourceAllocation.budgetSplitPct)
                                        .filter(([_, value]) => value && value !== 0)
                                        .map(([key, value], index) => {
                                          const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];
                                          return (
                                            <div key={key} className="flex items-center gap-2">
                                              <div 
                                                className="w-3 h-3 rounded-full" 
                                                style={{ backgroundColor: colors[index % colors.length] }}
                                              />
                                              <span className="text-xs text-gray-700">{key}</span>
                                              <span className="text-xs font-semibold text-green-700">{value}%</span>
                                            </div>
                                          );
                                        })}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* 나머지 4개 전략 - 2열 레이아웃 */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                
                                {/* 2. 키워드 타겟팅 */}
                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <h6 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                                  <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
                                  키워드 타겟팅 전략
                                </h6>
                                <div className="space-y-3">
                                  {range.keywordTargeting.coreKeywords.length > 0 && (
                                    <div>
                                      <span className="text-sm font-medium text-gray-700">핵심 키워드:</span>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {range.keywordTargeting.coreKeywords.slice(0, 6).map((keyword, i) => (
                                          <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                            {keyword}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {range.keywordTargeting.longTailKeywords.length > 0 && (
                                    <div>
                                      <span className="text-sm font-medium text-gray-700">롱테일 키워드:</span>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {range.keywordTargeting.longTailKeywords.slice(0, 4).map((keyword, i) => (
                                          <span key={i} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded border">
                                            {keyword}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                )
                                  {(range.keywordTargeting.brandVsNonBrand.brandSharePct || range.keywordTargeting.brandVsNonBrand.nonBrandSharePct) && (
                                    <div className="bg-white p-3 rounded border">
                                      <div className="text-sm font-medium text-gray-700 mb-2">브랜드 vs 일반 키워드 비중</div>
                                      <div className="flex gap-4">
                                        {range.keywordTargeting.brandVsNonBrand.brandSharePct && (
                                          <div className="text-sm">
                                            <span className="text-blue-600 font-medium">브랜드:</span> {range.keywordTargeting.brandVsNonBrand.brandSharePct}%
                                          </div>
                                        )}
                                        {range.keywordTargeting.brandVsNonBrand.nonBrandSharePct && (
                                          <div className="text-sm">
                                            <span className="text-gray-600 font-medium">일반:</span> {range.keywordTargeting.brandVsNonBrand.nonBrandSharePct}%
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  {range.keywordTargeting.negativeKeywords.length > 0 && (
                                    <div>
                                      <span className="text-sm font-medium text-gray-700">네거티브 키워드:</span>
                                      <div className="text-sm text-gray-600 mt-1">
                                        {range.keywordTargeting.negativeKeywords.slice(0, 5).join(', ')}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* 3. 콘텐츠 전략 */}
                              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                                <h6 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                                  <span className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs">3</span>
                                  콘텐츠 전략
                                </h6>
                                <div className="space-y-3">
                                  {range.contentStrategy.adCreatives.length > 0 && (
                                    <div>
                                      <span className="text-sm font-medium text-gray-700">광고 소재:</span>
                                      <ul className="text-sm text-gray-600 ml-4 mt-1 space-y-1">
                                        {range.contentStrategy.adCreatives.slice(0, 4).map((creative, i) => (
                                          <li key={i} className="list-disc">{creative}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {range.contentStrategy.landingPage.keySections.length > 0 && (
                                    <div>
                                      <span className="text-sm font-medium text-gray-700">랜딩페이지 핵심 섹션:</span>
                                      <ul className="text-sm text-gray-600 ml-4 mt-1 space-y-1">
                                        {range.contentStrategy.landingPage.keySections.slice(0, 3).map((section, i) => (
                                          <li key={i} className="list-disc">{section}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {range.contentStrategy.landingPage.primaryCTA && (
                                    <div className="bg-white p-3 rounded border">
                                      <span className="text-sm font-medium text-gray-700">주요 CTA:</span>
                                      <p className="text-sm text-orange-700 font-medium mt-1">{range.contentStrategy.landingPage.primaryCTA}</p>
                                    </div>
                                  )}
                                  {range.contentStrategy.educationalContent.length > 0 && (
                                    <div>
                                      <span className="text-sm font-medium text-gray-700">교육 콘텐츠:</span>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {range.contentStrategy.educationalContent.slice(0, 4).map((content, i) => (
                                          <span key={i} className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                                            {content}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {range.contentStrategy.socialProof.length > 0 && (
                                    <div>
                                      <span className="text-sm font-medium text-gray-700">소셜 증명:</span>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {range.contentStrategy.socialProof.slice(0, 4).map((proof, i) => (
                                          <span key={i} className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                                            {proof}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* 4. 특화시장 전략 */}
                              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                                <h6 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                                  <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs">4</span>
                                  특화시장 전략
                                </h6>
                                <div className="space-y-3">
                                  {range.nicheStrategy.segments.length > 0 && (
                                    <div>
                                      <span className="text-sm font-medium text-gray-700">타겟 세그먼트:</span>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {range.nicheStrategy.segments.map((segment, i) => (
                                          <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                                            {segment}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {range.nicheStrategy.personaValueProps.length > 0 && (
                                    <div>
                                      <span className="text-sm font-medium text-gray-700">페르소나 가치제안:</span>
                                      <ul className="text-sm text-gray-600 ml-4 mt-1 space-y-1">
                                        {range.nicheStrategy.personaValueProps.slice(0, 3).map((prop, i) => (
                                          <li key={i} className="list-disc">{prop}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {range.nicheStrategy.positioning && (
                                    <div className="bg-white p-3 rounded border">
                                      <span className="text-sm font-medium text-gray-700">포지셔닝:</span>
                                      <p className="text-sm text-purple-700 mt-1">{range.nicheStrategy.positioning}</p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* 5. 리텐션 전략 */}
                              <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                                <h6 className="font-semibold text-indigo-800 mb-3 flex items-center gap-2">
                                  <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs">5</span>
                                  리텐션 전략
                                </h6>
                                <div className="space-y-3">
                                  {range.retentionStrategy.crmScenarios.length > 0 && (
                                    <div>
                                      <span className="text-sm font-medium text-gray-700">CRM 시나리오:</span>
                                      <ul className="text-sm text-gray-600 ml-4 mt-1 space-y-1">
                                        {range.retentionStrategy.crmScenarios.slice(0, 3).map((scenario, i) => (
                                          <li key={i} className="list-disc">{scenario}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {range.retentionStrategy.loyaltyOffers.length > 0 && (
                                    <div>
                                      <span className="text-sm font-medium text-gray-700">로열티 혜택:</span>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {range.retentionStrategy.loyaltyOffers.map((offer, i) => (
                                          <span key={i} className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded">
                                            {offer}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {range.retentionStrategy.reviewNPSLoop.length > 0 && (
                                    <div>
                                      <span className="text-sm font-medium text-gray-700">후기/NPS 루프:</span>
                                      <ul className="text-sm text-gray-600 ml-4 mt-1 space-y-1">
                                        {range.retentionStrategy.reviewNPSLoop.slice(0, 3).map((loop, i) => (
                                          <li key={i} className="list-disc">{loop}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              </div>
                            </div>
                        </div>
                      </div>
                    </div>
                  ))}

                </div>
              )}
              
              {!comprehensiveInsights && !loading && (
                <div className="text-center py-12">
                  <p className="text-gray-500">종합 인사이트를 생성해 주세요.</p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-start">
            <Button variant="outline" onClick={handlePrev}>
              이전 단계
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}