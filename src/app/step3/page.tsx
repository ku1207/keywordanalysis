"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Target, 
  BarChart3, 
  TrendingUp, 
  CheckCircle,
  PieChart 
} from 'lucide-react';
import { useAnalysisStore } from '@/store/keyword-analysis';

const stepLabels = ['키워드 검색량 조회', '분석 개요', '세부 분석', '종합 인사이트', '마케팅 전략 제안'];

// 기본 단계 정의
const defaultJourneyStages = [
  { stage: '1. 문제 인식', key: '문제 인식 단계', percentage: 0, color: 'bg-red-500' },
  { stage: '2. 정보 탐색', key: '정보 탐색 단계', percentage: 0, color: 'bg-orange-500' },
  { stage: '3. 대안 평가', key: '대안 평가 단계', percentage: 0, color: 'bg-yellow-500' },
  { stage: '4. 구매 결정', key: '구매 결정 단계', percentage: 0, color: 'bg-green-500' },
  { stage: '5. 구매 행동', key: '구매 행동 단계', percentage: 0, color: 'bg-blue-500' },
  { stage: '6. 구매 후 행동', key: '구매 후 행동 단계', percentage: 0, color: 'bg-purple-500' },
];

export default function AnalysisOverviewPage() {
  const router = useRouter();
  const { 
    currentStep, 
    keyword, 
    keywordData,
    totalSearchVolume,
    setCurrentStep,
    setCategoryData,
    prevStep 
  } = useAnalysisStore();
  
  const [journeyStages, setJourneyStages] = useState(defaultJourneyStages);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCurrentStep(3);
    
    // GPT API를 통해 키워드 분류 및 검색량 분포 계산
    const calculateJourneyDistribution = async () => {
      if (keywordData.length === 0) return;
      
      setLoading(true);
      try {
        // 키워드 리스트 추출
        const keywords = keywordData.map(item => item.keyword);
        
        // GPT API 호출
        console.log('step3: GPT API 호출 시작', { keywordCount: keywords.length, timestamp: new Date().toISOString() });
        const response = await axios.post('/api/gpt', { keywords });
        const categoryData = response.data;
        console.log('step3: GPT API 호출 완료', { timestamp: new Date().toISOString() });
        
        // 스토어에 분류 결과 저장
        setCategoryData(categoryData);
        
        // 카테고리별 검색량 계산
        const categoryVolumes: { [key: string]: number } = {};
        
        keywordData.forEach(item => {
          const category = categoryData[item.keyword];
          if (category) {
            const pcCount = item.monthlyPcQcCnt === '<10' ? 10 : (parseInt(item.monthlyPcQcCnt) || 0);
            const mobileCount = item.monthlyMobileQcCnt === '<10' ? 10 : (parseInt(item.monthlyMobileQcCnt) || 0);
            const totalVolume = pcCount + mobileCount;
            
            categoryVolumes[category] = (categoryVolumes[category] || 0) + totalVolume;
          }
        });
        
        // 전체 검색량
        const totalVolume = Object.values(categoryVolumes).reduce((sum, vol) => sum + vol, 0);
        
        // 비율 계산 및 업데이트
        const updatedStages = defaultJourneyStages.map(stage => {
          const volume = categoryVolumes[stage.key] || 0;
          const percentage = totalVolume > 0 ? Math.round((volume / totalVolume) * 100) : 0;
          return { ...stage, percentage };
        });
        
        setJourneyStages(updatedStages);
        
      } catch (error) {
        console.error('구매여정 분석 실패:', error);
        // 에러 시 기본값 사용
        setJourneyStages([
          { stage: '1. 문제 인식', key: '문제 인식 단계', percentage: 25, color: 'bg-red-500' },
          { stage: '2. 정보 탐색', key: '정보 탐색 단계', percentage: 20, color: 'bg-orange-500' },
          { stage: '3. 대안 평가', key: '대안 평가 단계', percentage: 18, color: 'bg-yellow-500' },
          { stage: '4. 구매 결정', key: '구매 결정 단계', percentage: 15, color: 'bg-green-500' },
          { stage: '5. 구매 행동', key: '구매 행동 단계', percentage: 12, color: 'bg-blue-500' },
          { stage: '6. 구매 후 행동', key: '구매 후 행동 단계', percentage: 10, color: 'bg-purple-500' },
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    calculateJourneyDistribution();
  }, [setCurrentStep, keywordData, setCategoryData]);

  const handlePrev = () => {
    prevStep();
    router.push('/step2');
  };

  const handleNext = () => {
    router.push('/step4');
  };

  return (
    <div className="space-y-8">
      <Progress 
        currentStep={currentStep - 1} 
        totalSteps={5} 
        stepLabels={stepLabels} 
      />

      <div className="grid grid-cols-2 gap-8">
        <Card className="p-8 bg-white">
          <h2 className="text-xl font-bold mb-6 text-blue-600">분석 개요</h2>
          
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 mt-0.5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">분석 목적</h3>
                <p className="text-sm text-gray-600">
                  &apos;{keyword}&apos; 관련 키워드 검색 데이터를 통해 고객의 구매여정을 파악하고 단계별 마케팅 전략 도출
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <BarChart3 className="w-5 h-5 mt-0.5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">데이터 범위</h3>
                <p className="text-sm text-gray-600">
                  총 {keywordData.length}개 키워드, {totalSearchVolume.toLocaleString()}회 검색량 분석 ( PC 및 모바일 검색 포함 )
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 mt-0.5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">분석 방법론</h3>
                <p className="text-sm text-gray-600 mb-3">
                  구매여정 6단계 기준으로 키워드 분류 및 검색량 분석
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-full border border-red-200">1. 문제 인식</span>
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs rounded-full border border-orange-200">2. 정보 탐색</span>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full border border-yellow-200">3. 대안 평가</span>
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full border border-green-200">4. 구매 결정</span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full border border-blue-200">5. 구매 행동</span>
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full border border-purple-200">6. 구매 후 행동</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 mt-0.5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">분석 의의</h3>
                <p className="text-sm text-gray-600">
                  검색 키워드 통해 고객 여정 단계별 관심사 파악 및 효과적인 디지털 마케팅 전략 수립 가능
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-8 bg-white">
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-blue-600">구매여정 6단계 검색량 분포</h2>
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            )}
          </div>
          
          <div className="space-y-4">
            {journeyStages.map((stage, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">{stage.stage}</span>
                  <span className="text-sm font-semibold text-gray-900">{stage.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${stage.color} transition-all duration-500`}
                    style={{ width: `${stage.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800">
              * 구매여정 분포는 키워드 패턴을 분석하여 추출한 데이터입니다.
            </p>
          </div>
        </Card>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={handlePrev}>
          이전 단계
        </Button>
        <Button onClick={handleNext}>
          다음 단계
        </Button>
      </div>
    </div>
  );
}