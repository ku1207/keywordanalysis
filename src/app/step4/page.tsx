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
        }>} = {
          'awareness': [],
          'consideration': [],
          'decision': [],
          'purchase': [],
          'retention': [],
          'special': []
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
            
            stages[stageKey].push({
              keyword: item.keyword,
              x: pcCtr,
              y: mobileCtr,
              z: totalVolume,
              pcCtr,
              mobileCtr,
              pcCount,
              mobileCount,
              totalVolume
            });
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
                    <h4 className="font-medium text-gray-900 mb-4">키워드 포지션(버블 차트)</h4>
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
                                return (
                                  <div className="bg-white p-3 border rounded-lg shadow-lg">
                                    <p className="font-semibold text-gray-900">{data.keyword}</p>
                                    <p className="text-sm text-gray-600">PC 클릭률: {data.pcCtr}%</p>
                                    <p className="text-sm text-gray-600">MO 클릭률: {data.mobileCtr}%</p>
                                    <p className="text-sm text-gray-600">총 검색량: {data.totalVolume.toLocaleString()}</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Scatter
                            fill={journeyStages.find(s => s.key === selectedStage)?.chartColor || '#3b82f6'}
                          />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      * 버블 크기는 총 검색량(PC + 모바일)을 나타냅니다.
                    </p>
                  </div>

                  {/* 마케팅 인사이트 섹션 */}
                  {marketingInsights[selectedStage] && (
                    <div className="space-y-6 mt-6">
                      {/* 상단: 고객 심리 & 리스크&장벽 좌우 분할 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 고객 심리 */}
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <h5 className="font-semibold text-blue-800 mb-3 flex items-center">
                            <div className="w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
                            고객 심리
                          </h5>
                          <div className="space-y-4">
                            <div>
                              <h6 className="text-sm font-medium text-blue-700 mb-2">데이터 분석</h6>
                              <div className="space-y-2">
                                <div className="pl-2 border-l-2 border-blue-200">
                                  <span className="text-xs font-medium text-blue-600">감정 상태:</span>
                                  <p className="text-sm text-gray-700 leading-relaxed">
                                    {marketingInsights[selectedStage].customerPsychology.dataDriven.emotions}
                                  </p>
                                </div>
                                <div className="pl-2 border-l-2 border-blue-200">
                                  <span className="text-xs font-medium text-blue-600">행동 동기:</span>
                                  <p className="text-sm text-gray-700 leading-relaxed">
                                    {marketingInsights[selectedStage].customerPsychology.dataDriven.motivations}
                                  </p>
                                </div>
                                <div className="pl-2 border-l-2 border-blue-200">
                                  <span className="text-xs font-medium text-blue-600">인지 수준:</span>
                                  <p className="text-sm text-gray-700 leading-relaxed">
                                    {marketingInsights[selectedStage].customerPsychology.dataDriven.cognitiveLevel}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div>
                              <h6 className="text-sm font-medium text-blue-700 mb-2">인사이트</h6>
                              <div className="space-y-2">
                                <div className="pl-2 border-l-2 border-blue-200">
                                  <span className="text-xs font-medium text-blue-600">핵심 욕구:</span>
                                  <p className="text-sm text-gray-700 leading-relaxed">
                                    {marketingInsights[selectedStage].customerPsychology.generalInsight.needs}
                                  </p>
                                </div>
                                <div className="pl-2 border-l-2 border-blue-200">
                                  <span className="text-xs font-medium text-blue-600">불안 요소:</span>
                                  <p className="text-sm text-gray-700 leading-relaxed">
                                    {marketingInsights[selectedStage].customerPsychology.generalInsight.anxieties}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 리스크&장벽 */}
                        <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                          <h5 className="font-semibold text-orange-800 mb-3 flex items-center">
                            <div className="w-2 h-2 bg-orange-600 rounded-full mr-2"></div>
                            리스크&장벽
                          </h5>
                          <div className="space-y-4">
                            <div>
                              <h6 className="text-sm font-medium text-orange-700 mb-2">데이터 분석</h6>
                              <div className="space-y-2">
                                <div className="pl-2 border-l-2 border-orange-200">
                                  <span className="text-xs font-medium text-orange-600">내적 저항:</span>
                                  <p className="text-sm text-gray-700 leading-relaxed">
                                    {marketingInsights[selectedStage].risksAndBarriers.dataDriven.internal}
                                  </p>
                                </div>
                                <div className="pl-2 border-l-2 border-orange-200">
                                  <span className="text-xs font-medium text-orange-600">외적 장벽:</span>
                                  <p className="text-sm text-gray-700 leading-relaxed">
                                    {marketingInsights[selectedStage].risksAndBarriers.dataDriven.external}
                                  </p>
                                </div>
                                <div className="pl-2 border-l-2 border-orange-200">
                                  <span className="text-xs font-medium text-orange-600">리스크 유형:</span>
                                  <p className="text-sm text-gray-700 leading-relaxed">
                                    {marketingInsights[selectedStage].risksAndBarriers.dataDriven.riskTypes}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div>
                              <h6 className="text-sm font-medium text-orange-700 mb-2">인사이트</h6>
                              <div className="space-y-2">
                                <div className="pl-2 border-l-2 border-orange-200">
                                  <span className="text-xs font-medium text-orange-600">일반적 장벽:</span>
                                  <p className="text-sm text-gray-700 leading-relaxed">
                                    {marketingInsights[selectedStage].risksAndBarriers.generalInsight.commonBarriers}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 하단: 콘텐츠/메시지 전략 전체 폭 */}
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <h5 className="font-semibold text-green-800 mb-3 flex items-center">
                          <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
                          콘텐츠/메시지 전략
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h6 className="text-sm font-medium text-green-700 mb-2">데이터 분석</h6>
                            <div className="space-y-2">
                              <div className="pl-2 border-l-2 border-green-200">
                                <span className="text-xs font-medium text-green-600">메시지 톤:</span>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                  {marketingInsights[selectedStage].contentMessagingStrategy.dataDriven.messageTone}
                                </p>
                              </div>
                              <div className="pl-2 border-l-2 border-green-200">
                                <span className="text-xs font-medium text-green-600">콘텐츠 유형:</span>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                  {marketingInsights[selectedStage].contentMessagingStrategy.dataDriven.contentTypes}
                                </p>
                              </div>
                              <div className="pl-2 border-l-2 border-green-200">
                                <span className="text-xs font-medium text-green-600">핵심 포인트:</span>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                  {marketingInsights[selectedStage].contentMessagingStrategy.dataDriven.corePoints}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div>
                            <h6 className="text-sm font-medium text-green-700 mb-2">인사이트</h6>
                            <div className="space-y-2">
                              <div className="pl-2 border-l-2 border-green-200">
                                <span className="text-xs font-medium text-green-600">심리적 해소:</span>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                  {marketingInsights[selectedStage].contentMessagingStrategy.generalInsight.psychologyRelief}
                                </p>
                              </div>
                              <div className="pl-2 border-l-2 border-green-200">
                                <span className="text-xs font-medium text-green-600">가치 제안:</span>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                  {marketingInsights[selectedStage].contentMessagingStrategy.generalInsight.valueProposition}
                                </p>
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