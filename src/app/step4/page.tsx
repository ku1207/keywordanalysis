"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAnalysisStore } from '@/store/keyword-analysis';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';
import axios from 'axios';
import { MarketingInsights } from '@/types/marketing-insights';

const stepLabels = ['키워드 검색량 조회', '분석 개요', '세부 분석', '종합 인사이트', '마케팅 전략 제안'];

const journeyStages = [
  { stage: '전체', key: 'all', color: 'bg-gray-700', borderColor: 'border-gray-700', textColor: 'text-gray-700', chartColor: '#374151' },
  { stage: '1. 문제 인식', key: 'awareness', color: 'bg-red-500', borderColor: 'border-red-500', textColor: 'text-red-700', chartColor: '#ef4444' },
  { stage: '2. 정보 탐색', key: 'consideration', color: 'bg-orange-500', borderColor: 'border-orange-500', textColor: 'text-orange-700', chartColor: '#f97316' },
  { stage: '3. 대안 평가', key: 'decision', color: 'bg-yellow-500', borderColor: 'border-yellow-500', textColor: 'text-yellow-700', chartColor: '#eab308' },
  { stage: '4. 구매 결정', key: 'purchase', color: 'bg-green-500', borderColor: 'border-green-500', textColor: 'text-green-700', chartColor: '#22c55e' },
  { stage: '5. 구매 행동', key: 'retention', color: 'bg-blue-500', borderColor: 'border-blue-500', textColor: 'text-blue-700', chartColor: '#3b82f6' },
  { stage: '6. 구매 후 행동', key: 'special', color: 'bg-purple-500', borderColor: 'border-purple-500', textColor: 'text-purple-700', chartColor: '#8b5cf6' },
];

export default function DetailedAnalysisPage() {
  const router = useRouter();
  const { 
    currentStep, 
    keywordData,
    categoryData,
    setCurrentStep,
    setCategoryData,
    nextStep,
    prevStep 
  } = useAnalysisStore();
  
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [stageKeywords, setStageKeywords] = useState<{[key: string]: Array<{
    keyword: string;
    x: number;
    y: number;
    z: number;
    pcCtr: number;
    mobileCtr: number;
    pcCount: number;
    mobileCount: number;
    totalVolume: number;
  }>}>({});
  const [loading, setLoading] = useState(false);
  const [marketingInsights, setMarketingInsights] = useState<{[key: string]: MarketingInsights}>({});

  useEffect(() => {
    setCurrentStep(4);
    
    // 구매여정 단계별 키워드 분류
    const classifyKeywords = async () => {
      if (keywordData.length === 0) return;
      
      setLoading(true);
      try {
        let currentCategoryData = categoryData;
        
        // 스토어에 저장된 분류 결과가 없으면 GPT API 호출
        if (!currentCategoryData || Object.keys(currentCategoryData).length === 0) {
          console.log('step4: 스토어에 categoryData 없음, GPT API 호출 시작', { timestamp: new Date().toISOString() });
          const keywords = keywordData.map(item => item.keyword);
          const response = await axios.post('/api/gpt', { keywords });
          currentCategoryData = response.data;
          setCategoryData(currentCategoryData);
          console.log('step4: GPT API 호출 완료', { timestamp: new Date().toISOString() });
        } else {
          console.log('step4: 스토어의 categoryData 재사용', { categoryCount: Object.keys(currentCategoryData).length, timestamp: new Date().toISOString() });
        }
        
        // 단계별로 키워드 그룹핑
        const stages: {[key: string]: Array<{
          keyword: string;
          x: number;
          y: number;
          z: number;
          pcCtr: number;
          mobileCtr: number;
          pcCount: number;
          mobileCount: number;
          totalVolume: number;
          stageKey?: string; // 전체 단계에서 색상 구분을 위한 필드
        }>} = {
          'awareness': [],
          'consideration': [],
          'decision': [],
          'purchase': [],
          'retention': [],
          'special': [],
          'all': [] // 전체 단계 추가
        };
        
        const stageMapping: {[key: string]: string} = {
          '문제 인식 단계': 'awareness',
          '정보 탐색 단계': 'consideration',
          '대안 평가 단계': 'decision',
          '구매 결정 단계': 'purchase',
          '구매 행동 단계': 'retention',
          '구매 후 행동 단계': 'special'
        };
        
        keywordData.forEach(item => {
          const category = currentCategoryData[item.keyword];
          const stageKey = stageMapping[category];
          
          if (stageKey) {
            const pcCtr = parseFloat(item.monthlyAvePcCtr) || 0;
            const mobileCtr = parseFloat(item.monthlyAveMobileCtr) || 0;
            const pcCount = item.monthlyPcQcCnt === '<10' ? 10 : (parseInt(item.monthlyPcQcCnt) || 0);
            const mobileCount = item.monthlyMobileQcCnt === '<10' ? 10 : (parseInt(item.monthlyMobileQcCnt) || 0);
            const totalVolume = pcCount + mobileCount;
            
            const keywordData = {
              keyword: item.keyword,
              x: pcCtr,
              y: mobileCtr,
              z: totalVolume,
              pcCtr,
              mobileCtr,
              pcCount,
              mobileCount,
              totalVolume,
              stageKey
            };
            
            // 각 단계별로 추가
            stages[stageKey].push(keywordData);
            
            // 전체 단계에도 추가
            stages['all'].push(keywordData);
          }
        });
        
        setStageKeywords(stages);
        
        // 모든 단계의 마케팅 인사이트를 병렬로 생성
        await generateAllMarketingInsights(stages);
        
      } catch (error) {
        console.error('키워드 분류 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    // 모든 단계의 마케팅 인사이트를 병렬로 생성하는 함수
    const generateAllMarketingInsights = async (stages: {[key: string]: Array<{
      keyword: string;
      x: number;
      y: number;
      z: number;
      pcCtr: number;
      mobileCtr: number;
      pcCount: number;
      mobileCount: number;
      totalVolume: number;
    }>}) => {
      console.log('모든 단계의 마케팅 인사이트 생성 시작');
      
      const insightPromises = journeyStages.map(async (stage) => {
        const stageKeywords = stages[stage.key];
        if (!stageKeywords || stageKeywords.length === 0) {
          return { stageKey: stage.key, insights: null };
        }

        try {
          const keywordData = stageKeywords.map(kw => ({
            keyword: kw.keyword,
            pcCount: kw.pcCount,
            mobileCount: kw.mobileCount,
            pcCtr: kw.pcCtr,
            mobileCtr: kw.mobileCtr
          }));
          
          const response = await axios.post('/api/gpt-insights', {
            stage: stage.stage,
            keywords: keywordData
          });
          
          console.log(`${stage.stage} 마케팅 인사이트 생성 완료`);
          return { stageKey: stage.key, insights: response.data };
        } catch (error) {
          console.error(`${stage.stage} 마케팅 인사이트 생성 실패:`, error);
          return { stageKey: stage.key, insights: null };
        }
      });

      // 모든 API 호출이 완료될 때까지 대기
      const results = await Promise.all(insightPromises);
      
      // 결과를 상태에 저장
      const insightsData: {[key: string]: MarketingInsights} = {};
      results.forEach(result => {
        if (result.insights) {
          insightsData[result.stageKey] = result.insights;
        }
      });
      
      setMarketingInsights(insightsData);
      
      // step5에서 사용할 수 있도록 sessionStorage에 저장
      sessionStorage.setItem('marketingInsights', JSON.stringify(insightsData));
      
      console.log('모든 마케팅 인사이트 생성 완료');
    };
    
    classifyKeywords();
  }, [setCurrentStep, keywordData, categoryData, setCategoryData]);

  const handleStageClick = (stageKey: string) => {
    setSelectedStage(stageKey);
  };

  const handleNext = () => {
    nextStep();
    router.push('/step5');
  };

  const handlePrev = () => {
    prevStep();
    router.push('/step3');
  };

  return (
    <div className="space-y-8">
      <Progress 
        currentStep={currentStep - 1} 
        totalSteps={5} 
        stepLabels={stepLabels} 
      />

      <Card className="p-8 bg-white">
        <div className="w-[90%] mx-auto space-y-6 bg-white">
          <div>
            <h2 className="text-2xl font-bold mb-2 text-blue-600">구매여정 세부분석</h2>
          </div>

          <div className="flex flex-wrap gap-4 justify-center py-8">
            {journeyStages.map((stage, index) => (
              <button
                key={index}
                onClick={() => handleStageClick(stage.key)}
                className={`
                  px-6 py-3 rounded-full border-2 transition-all duration-300 hover:scale-105 
                  ${selectedStage === stage.key 
                    ? `${stage.color} text-white ${stage.borderColor}` 
                    : `bg-white ${stage.textColor} ${stage.borderColor} hover:bg-opacity-20 hover:${stage.color.replace('bg-', 'bg-')}`
                  }
                  text-sm font-medium min-w-[140px] text-center
                `}
              >
                {stage.stage}
              </button>
            ))}
          </div>

          {selectedStage && (
            <div className="mt-8 p-6 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">
                {journeyStages.find(s => s.key === selectedStage)?.stage} 세부분석
              </h3>
              
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">키워드 분류 및 마케팅 인사이트를 분석하는 중...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 버블 차트 */}
                  <div className="p-4 bg-white rounded-lg border">
                    <h4 className="font-medium text-gray-900 mb-4">
                      키워드 포지션(버블 차트)
                      {selectedStage === 'all' && <span className="text-sm text-gray-600 ml-2">- 전 단계 통합</span>}
                    </h4>
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart
                          data={stageKeywords[selectedStage] || []}
                          margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            type="number" 
                            dataKey="x" 
                            name="PC 클릭률"
                            unit="%"
                            label={{ value: 'PC 클릭률 (%)', position: 'insideBottom', offset: -10 }}
                          />
                          <YAxis 
                            type="number" 
                            dataKey="y" 
                            name="MO 클릭률"
                            unit="%"
                            label={{ value: 'MO 클릭률 (%)', angle: -90, position: 'insideLeft' }}
                          />
                          <ZAxis 
                            type="number" 
                            dataKey="z" 
                            range={[20, 400]}
                            name="총 검색량"
                          />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                const stageInfo = data.stageKey && selectedStage === 'all' 
                                  ? journeyStages.find(s => s.key === data.stageKey) 
                                  : null;
                                return (
                                  <div className="bg-white p-3 border rounded-lg shadow-lg">
                                    <p className="font-semibold text-gray-900">{data.keyword}</p>
                                    {stageInfo && (
                                      <p className="text-sm font-medium mb-1" style={{color: stageInfo.chartColor}}>
                                        {stageInfo.stage}
                                      </p>
                                    )}
                                    <p className="text-sm text-gray-600">PC 클릭률: {data.pcCtr}%</p>
                                    <p className="text-sm text-gray-600">MO 클릭률: {data.mobileCtr}%</p>
                                    <p className="text-sm text-gray-600">총 검색량: {data.totalVolume.toLocaleString()}</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          {selectedStage === 'all' ? (
                            // 전체 단계일 때 각 단계별로 색상 구분
                            ['awareness', 'consideration', 'decision', 'purchase', 'retention', 'special'].map(stageKey => {
                              const stageData = (stageKeywords[selectedStage] || []).filter(item => item.stageKey === stageKey);
                              const stage = journeyStages.find(s => s.key === stageKey);
                              return stageData.length > 0 ? (
                                <Scatter
                                  key={stageKey}
                                  data={stageData}
                                  fill={stage?.chartColor || '#3b82f6'}
                                />
                              ) : null;
                            })
                          ) : (
                            // 개별 단계일 때 해당 단계 색상
                            <Scatter
                              fill={journeyStages.find(s => s.key === selectedStage)?.chartColor || '#3b82f6'}
                            />
                          )}
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      * 버블 크기는 총 검색량(PC + 모바일)을 나타냅니다.
                      {selectedStage === 'all' && ' 색상은 각 구매여정 단계를 나타냅니다.'}
                    </p>
                  </div>

                  {/* 마케팅 인사이트 섹션 - 전체 단계에서는 표시하지 않음 */}
                  {selectedStage !== 'all' && marketingInsights[selectedStage] && (
                    <div className="space-y-8 mt-6">
                      {/* 플로우 차트 스타일 레이아웃 */}
                      <div className="space-y-8">
                        {/* 상단: 고객 심리 & 리스크&장벽 */}
                        <div className="relative">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* 고객 심리 */}
                            <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200 shadow-lg">
                              <div className="text-center mb-4">
                                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-full mb-3">
                                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                  </svg>
                                </div>
                                <h5 className="text-lg font-bold text-blue-800">고객 심리</h5>
                              </div>
                              <div className="space-y-4">
                                <div className="bg-white/70 p-4 rounded-lg">
                                  <div className="space-y-3">
                                    <div>
                                      <span className="text-xs font-semibold text-blue-700 bg-blue-200 px-2 py-1 rounded">감정 상태</span>
                                      <p className="text-sm text-gray-700 mt-1">
                                        {marketingInsights[selectedStage].customerPsychology.dataDriven.emotions}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-xs font-semibold text-blue-700 bg-blue-200 px-2 py-1 rounded">핵심 욕구</span>
                                      <p className="text-sm text-gray-700 mt-1">
                                        {marketingInsights[selectedStage].customerPsychology.generalInsight.needs}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* 리스크&장벽 */}
                            <div className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border-2 border-orange-200 shadow-lg">
                              <div className="text-center mb-4">
                                <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-600 text-white rounded-full mb-3">
                                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                  </svg>
                                </div>
                                <h5 className="text-lg font-bold text-orange-800">리스크 & 장벽</h5>
                              </div>
                              <div className="space-y-4">
                                <div className="bg-white/70 p-4 rounded-lg">
                                  <div className="space-y-3">
                                    <div>
                                      <span className="text-xs font-semibold text-orange-700 bg-orange-200 px-2 py-1 rounded">내적 저항</span>
                                      <p className="text-sm text-gray-700 mt-1">
                                        {marketingInsights[selectedStage].risksAndBarriers.dataDriven.internal}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-xs font-semibold text-orange-700 bg-orange-200 px-2 py-1 rounded">일반적 장벽</span>
                                      <p className="text-sm text-gray-700 mt-1">
                                        {marketingInsights[selectedStage].risksAndBarriers.generalInsight.commonBarriers}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 중앙 '+' 아이콘 (데스크톱에서만 표시) */}
                          <div className="hidden md:block absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                            <div className="bg-white rounded-full p-1.5 border border-gray-300 shadow-md">
                              <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        {/* 하단: 콘텐츠/메시지 전략 */}
                        <div className="p-8 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200 shadow-lg">
                          <div className="text-center mb-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 text-white rounded-full mb-4">
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                              </svg>
                            </div>
                            <h5 className="text-xl font-bold text-green-800 mb-2">콘텐츠/메시지 전략</h5>
                            <p className="text-sm text-green-700">고객 심리와 장벽을 극복하는 최적화된 전략</p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white/80 p-6 rounded-lg">
                              <h6 className="text-base font-bold text-green-800 mb-4 flex items-center">
                                <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
                                전략적 접근법
                              </h6>
                              <div className="space-y-3">
                                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                  <span className="text-sm font-semibold text-green-700">메시지 톤</span>
                                  <p className="text-sm text-gray-700 mt-1">
                                    {marketingInsights[selectedStage].contentMessagingStrategy.dataDriven.messageTone}
                                  </p>
                                </div>
                                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                  <span className="text-sm font-semibold text-green-700">콘텐츠 유형</span>
                                  <p className="text-sm text-gray-700 mt-1">
                                    {marketingInsights[selectedStage].contentMessagingStrategy.dataDriven.contentTypes}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="bg-white/80 p-6 rounded-lg">
                              <h6 className="text-base font-bold text-green-800 mb-4 flex items-center">
                                <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
                                핵심 가치
                              </h6>
                              <div className="space-y-3">
                                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                  <span className="text-sm font-semibold text-green-700">심리적 해소</span>
                                  <p className="text-sm text-gray-700 mt-1">
                                    {marketingInsights[selectedStage].contentMessagingStrategy.generalInsight.psychologyRelief}
                                  </p>
                                </div>
                                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                  <span className="text-sm font-semibold text-green-700">가치 제안</span>
                                  <p className="text-sm text-gray-700 mt-1">
                                    {marketingInsights[selectedStage].contentMessagingStrategy.generalInsight.valueProposition}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
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