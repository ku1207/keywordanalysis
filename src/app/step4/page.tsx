"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAnalysisStore } from '@/store/keyword-analysis';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';
import axios from 'axios';

const stepLabels = ['키워드 검색량 조회', '분석 개요', '세부 분석', '종합 인사이트', '마케팅 전략 제안'];

const journeyStages = [
  { stage: '1. 인지/탐색', key: 'awareness', color: 'bg-red-500', borderColor: 'border-red-500', textColor: 'text-red-700', chartColor: '#ef4444' },
  { stage: '2. 정보수집/비교', key: 'consideration', color: 'bg-orange-500', borderColor: 'border-orange-500', textColor: 'text-orange-700', chartColor: '#f97316' },
  { stage: '3. 구매의사결정', key: 'decision', color: 'bg-yellow-500', borderColor: 'border-yellow-500', textColor: 'text-yellow-700', chartColor: '#eab308' },
  { stage: '4. 구매/가입', key: 'purchase', color: 'bg-green-500', borderColor: 'border-green-500', textColor: 'text-green-700', chartColor: '#22c55e' },
  { stage: '5. 사후관리', key: 'retention', color: 'bg-blue-500', borderColor: 'border-blue-500', textColor: 'text-blue-700', chartColor: '#3b82f6' },
  { stage: '6. 특수키워드', key: 'special', color: 'bg-purple-500', borderColor: 'border-purple-500', textColor: 'text-purple-700', chartColor: '#8b5cf6' },
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
          '인지/탐색 단계': 'awareness',
          '정보수집/비교 단계': 'consideration',
          '구매의사결정 단계': 'decision',
          '구매/가입 단계': 'purchase',
          '사후관리 단계': 'retention',
          '특수 키워드': 'special'
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
      } catch (error) {
        console.error('키워드 분류 실패:', error);
      } finally {
        setLoading(false);
      }
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
                  <span className="ml-3 text-gray-600">데이터를 분석하는 중...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 버블 차트 */}
                  <div className="p-4 bg-white rounded-lg border">
                    <h4 className="font-medium text-gray-900 mb-4">키워드 클릭률 분석 (버블 차트)</h4>
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
                  
                  {/* 키워드 목록 */}
                  <div className="p-4 bg-white rounded-lg border">
                    <h4 className="font-medium text-gray-900 mb-2">해당 단계 키워드 목록</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {(stageKeywords[selectedStage] || []).slice(0, 12).map((item, index) => (
                        <div key={index} className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded">
                          {item.keyword}
                        </div>
                      ))}
                      {(stageKeywords[selectedStage] || []).length > 12 && (
                        <div className="text-sm text-gray-500 px-2 py-1">
                          +{(stageKeywords[selectedStage] || []).length - 12}개 더
                        </div>
                      )}
                    </div>
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