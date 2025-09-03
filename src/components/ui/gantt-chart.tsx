import React from 'react';

interface GanttChartProps {
  ranges: Array<{
    rangeId: string;
    rangeLabel: string;
    journeyRange: {
      startStage: string;
      endStage: string;
      startStageIndex: number;
      endStageIndex: number;
      stages: string[];
    };
    rangeSummary: string;
    insights: Array<{
      id: string;
      category: string;
      insightSummary: string;
      drivers: string[];
      barriers: string[];
      strategy: {
        messageTone: string;
        contentTactics: string[];
        channels: string[];
        offerDesign: string;
        cxActions: string[];
      };
      experiments: string[];
    }>;
    ganttStrategy?: {
      resourceAllocation: {
        method: string;
        notes: string;
        budgetSplitPct: {
          검색광고: string;
          디스플레이: string;
          콘텐츠: string;
          "CRM/리텐션": string;
          기타: string;
        };
      };
      keywordTargeting: {
        coreKeywords: string[];
        longTailKeywords: string[];
        brandVsNonBrand: {
          brandSharePct: string;
          nonBrandSharePct: string;
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
    };
  }>;
}

const journeyStages = [
  { stage: '문제 인식', index: 1, color: '#ef4444', bgColor: '#fef2f2', borderColor: '#fecaca' },
  { stage: '정보 탐색', index: 2, color: '#f97316', bgColor: '#fff7ed', borderColor: '#fed7aa' },
  { stage: '대안 평가', index: 3, color: '#eab308', bgColor: '#fefce8', borderColor: '#fde047' },
  { stage: '구매 결정', index: 4, color: '#22c55e', bgColor: '#f0fdf4', borderColor: '#bbf7d0' },
  { stage: '구매 행동', index: 5, color: '#3b82f6', bgColor: '#eff6ff', borderColor: '#bfdbfe' },
  { stage: '구매 후 행동', index: 6, color: '#8b5cf6', bgColor: '#f5f3ff', borderColor: '#c4b5fd' },
];

const categoryColors = {
  customerDrivers: { bg: '#dbeafe', border: '#3b82f6', text: '#1d4ed8' },
  barriersAndCX: { bg: '#fed7d7', border: '#ef4444', text: '#dc2626' },
  strategyPlay: { bg: '#dcfce7', border: '#22c55e', text: '#166534' },
  differentiationAndMetrics: { bg: '#fef3c7', border: '#f59e0b', text: '#d97706' }
};

const categoryLabels = {
  customerDrivers: '고객 동인',
  barriersAndCX: '장벽/CX',
  strategyPlay: '전략 실행',
  differentiationAndMetrics: '차별화/지표'
};

interface CombinedChartProps extends GanttChartProps {
  stagePercentages: {[key: string]: number};
}


export const GanttChart: React.FC<GanttChartProps> = ({ ranges }) => {
  const stageWidth = 140; // 각 단계의 너비
  const rowHeight = 80; // 각 행의 높이
  const headerHeight = 60;
  
  return (
    <div className="w-full bg-white rounded-lg border overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <h4 className="text-lg font-semibold text-gray-900 mb-1">실행 전략 간트차트</h4>
        <p className="text-sm text-gray-600">구매여정 단계별 마케팅 인사이트와 실행 전략</p>
      </div>
      
      <div className="relative overflow-x-auto">
        <div className="min-w-full" style={{ minWidth: `${stageWidth * 6 + 200}px` }}>
          {/* 헤더 - 구매여정 단계 */}
          <div 
            className="flex bg-gray-100 border-b font-medium text-sm text-gray-700"
            style={{ height: `${headerHeight}px` }}
          >
            <div className="w-48 px-4 py-4 border-r flex items-center">
              <span>전략 범위</span>
            </div>
            {journeyStages.map((stage, index) => (
              <div 
                key={index}
                className="flex-1 px-2 py-2 border-r text-center flex flex-col justify-center items-center"
                style={{ 
                  width: `${stageWidth}px`,
                  backgroundColor: stage.bgColor,
                  borderColor: stage.borderColor
                }}
              >
                <div className="font-semibold text-xs" style={{ color: stage.color }}>
                  {stage.stage}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  단계 {stage.index}
                </div>
              </div>
            ))}
          </div>

          {/* 간트차트 본문 */}
          <div className="relative">
            {ranges && ranges.map((range, rangeIndex) => (
              <div key={range.rangeId} className="relative">
                {/* 행 배경 */}
                <div 
                  className={`flex border-b ${rangeIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  style={{ height: `${rowHeight}px` }}
                >
                  {/* 간트바 영역 */}
                  <div className="flex-1 relative">
                    {journeyStages.map((stage, stageIndex) => (
                      <div 
                        key={stageIndex}
                        className="border-r h-full"
                        style={{ width: `${stageWidth}px` }}
                      />
                    ))}
                    
                    {/* 실제 간트바 */}
                    <div 
                      className="absolute top-2 bottom-2 rounded-md shadow-sm border-2 flex items-center justify-center"
                      style={{
                        left: `${(range.journeyRange.startStageIndex - 1) * stageWidth + 8}px`,
                        width: `${(range.journeyRange.endStageIndex - range.journeyRange.startStageIndex + 1) * stageWidth - 16}px`,
                        backgroundColor: '#3b82f6',
                        borderColor: '#1d4ed8',
                        background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)'
                      }}
                    >
                      <span className="text-white text-xs font-medium text-center px-2">
                        {range.rangeSummary.slice(0, 30)}...
                      </span>
                    </div>
                  </div>
                </div>

                {/* 인사이트 상세 정보 (간트바 아래) */}
                <div className="bg-gray-50 border-b">
                  <div className="px-4 py-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {range.insights.slice(0, 4).map((insight) => {
                        const categoryStyle = categoryColors[insight.category as keyof typeof categoryColors] || categoryColors.customerDrivers;
                        
                        return (
                          <div 
                            key={insight.id}
                            className="p-3 rounded-lg border-l-4 text-xs"
                            style={{
                              backgroundColor: categoryStyle.bg,
                              borderLeftColor: categoryStyle.border
                            }}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span 
                                className="px-2 py-1 rounded text-xs font-medium"
                                style={{
                                  backgroundColor: categoryStyle.border,
                                  color: 'white'
                                }}
                              >
                                {categoryLabels[insight.category as keyof typeof categoryLabels]}
                              </span>
                            </div>
                            
                            <div className="space-y-2">
                              <p className="font-semibold text-gray-900 text-xs leading-tight">
                                {insight.insightSummary}
                              </p>
                              
                              {insight.drivers.length > 0 && (
                                <div>
                                  <span className="text-green-700 font-medium text-xs">동인:</span>
                                  <p className="text-gray-600 text-xs mt-1">
                                    {insight.drivers.slice(0, 2).join(', ')}
                                  </p>
                                </div>
                              )}
                              
                              {insight.barriers.length > 0 && (
                                <div>
                                  <span className="text-red-700 font-medium text-xs">장벽:</span>
                                  <p className="text-gray-600 text-xs mt-1">
                                    {insight.barriers.slice(0, 2).join(', ')}
                                  </p>
                                </div>
                              )}
                              
                              {insight.experiments.length > 0 && (
                                <div>
                                  <span className="text-purple-700 font-medium text-xs">실험:</span>
                                  <div className="text-xs text-gray-600 mt-1">
                                    {insight.experiments.slice(0, 2).join(', ')}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {range.insights.length > 4 && (
                      <div className="mt-3 text-center">
                        <span className="text-xs text-gray-500">
                          +{range.insights.length - 4}개 인사이트 더보기
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 범례 */}
          <div className="p-4 bg-gray-50 border-t">
            <div className="flex flex-wrap gap-4">
              <div className="text-sm font-medium text-gray-700 mb-2">범례:</div>
              {Object.entries(categoryLabels).map(([key, label]) => {
                const style = categoryColors[key as keyof typeof categoryColors];
                return (
                  <div key={key} className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded border"
                      style={{
                        backgroundColor: style.bg,
                        borderColor: style.border
                      }}
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CombinedChart: React.FC<CombinedChartProps> = ({ ranges }) => {
  const rowHeight = 80; // 각 행의 높이
  
  return (
    <div className="w-full bg-white rounded-lg border overflow-hidden">
      {/* 통합된 구매여정 단계 헤더 */}
      <div className="p-4 border-b bg-gray-50">
      </div>
      
      
      <div className="relative">
        <div className="w-full">
          {/* 간트차트 본문 */}
          <div className="relative">
            {ranges && ranges.map((range, rangeIndex) => (
              <div key={range.rangeId} className="relative">
                {/* 행 배경 */}
                <div 
                  className={`flex border-b ${rangeIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  style={{ height: `${rowHeight}px` }}
                >
                  {/* 간트바 영역 */}
                  <div className="flex relative w-full">
                    {journeyStages.map((stage, stageIndex) => (
                      <div 
                        key={stageIndex}
                        className="border-r h-full flex-1"
                      />
                    ))}
                    
                    {/* 실제 간트바 */}
                    <div 
                      className="absolute top-2 bottom-2 rounded-md shadow-sm border-2 flex items-center justify-center"
                      style={{
                        left: `${(range.journeyRange.startStageIndex - 1) * (100 / 6)}%`,
                        width: `${(range.journeyRange.endStageIndex - range.journeyRange.startStageIndex + 1) * (100 / 6)}%`,
                        backgroundColor: '#3b82f6',
                        borderColor: '#1d4ed8',
                        background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)'
                      }}
                    >
                      <span className="text-white text-xs font-medium text-center px-2">
                        {range.rangeSummary.slice(0, 30)}...
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};