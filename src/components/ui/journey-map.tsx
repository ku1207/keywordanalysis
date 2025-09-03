import React from 'react';

interface JourneyMapProps {
  stageEmotionScores: Array<{
    stageIndex: number;
    emotion: number;
  }>;
  stagePercentages: {[key: string]: number};
  ganttStrategy?: Array<{
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

const journeyStages = [
  { stage: '문제 인식', key: 'awareness', color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-300' },
  { stage: '정보 탐색', key: 'consideration', color: 'bg-orange-500', textColor: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-300' },
  { stage: '대안 평가', key: 'decision', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-300' },
  { stage: '구매 결정', key: 'purchase', color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-300' },
  { stage: '구매 행동', key: 'retention', color: 'bg-blue-500', textColor: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-300' },
  { stage: '구매 후 행동', key: 'special', color: 'bg-purple-500', textColor: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-300' },
];

export const JourneyMap: React.FC<JourneyMapProps> = ({ stageEmotionScores, stagePercentages, ganttStrategy }) => {
  // 점수 데이터를 매핑하여 시각화용 데이터 생성
  const mapData = journeyStages.map((stage, index) => {
    const emotionData = stageEmotionScores?.find(s => s.stageIndex === index + 1);
    const percentage = stagePercentages[stage.key] || 0;
    
    const stageWidth = 1000 / 6; // 전체 차트 영역을 6개로 나눔 (카드 영역과 동일)
    const centerX = index * stageWidth + stageWidth / 2; // 각 단계 중앙에 위치
    
    return {
      ...stage,
      x: centerX, // x 좌표 (각 단계의 중앙)
      y: 180 - (emotionData?.emotion || 5) * 16, // y 좌표 (점수를 반전하여 높은 점수가 위로, 200px 높이에 맞게 조정)
      score: emotionData?.emotion || 5,
      percentage
    };
  });

  // SVG 곡선 패스 생성
  const createCurvePath = () => {
    if (mapData.length < 2) return '';
    
    let path = `M ${mapData[0].x} ${mapData[0].y}`;
    
    for (let i = 1; i < mapData.length; i++) {
      const prev = mapData[i - 1];
      const curr = mapData[i];
      
      // 베지어 곡선을 위한 컨트롤 포인트 계산
      const cp1x = prev.x + (curr.x - prev.x) * 0.5;
      const cp1y = prev.y;
      const cp2x = curr.x - (curr.x - prev.x) * 0.5;
      const cp2y = curr.y;
      
      path += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${curr.x} ${curr.y}`;
    }
    
    return path;
  };

  return (
    <div className="w-full">
      {/* 사용자 여정지도 차트 */}
      <div className="bg-white rounded-lg border p-6">
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-2">사용자 여정지도</h4>
          <p className="text-sm text-gray-600">구매여정 단계별 고객 경험 점수 (1-10점)</p>
        </div>
        
        {/* 구매여정 단계 헤더 */}
        <div className="mb-0">
          <div className="flex w-full">
            {journeyStages.map((stage, index) => (
              <div 
                key={index}
                className={`flex-1 p-3 border-2 border-b-0 ${stage.bgColor} ${
                  index === 0 ? 'rounded-tl-lg' : 
                  index === journeyStages.length - 1 ? 'rounded-tr-lg border-l-0' : 
                  'border-l-0'
                }`}
                style={{ 
                  borderColor: stage.borderColor === 'border-red-300' ? '#fca5a5' : 
                              stage.borderColor === 'border-orange-300' ? '#fdba74' :
                              stage.borderColor === 'border-yellow-300' ? '#fde047' :
                              stage.borderColor === 'border-green-300' ? '#86efac' :
                              stage.borderColor === 'border-blue-300' ? '#93c5fd' :
                              stage.borderColor === 'border-purple-300' ? '#c4b5fd' : '#e5e7eb'
                }}
              >
                <div className="text-center">
                  <h3 className={`font-bold text-sm ${stage.textColor} mb-1`}>
                    {stage.stage}
                  </h3>
                  <div className={`text-xl font-bold ${stage.textColor}`}>
                    {stagePercentages[stage.key] || 0}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* 차트 영역 */}
        <div className="relative w-full">
          <div className="relative w-full border-l-2 border-r-2 border-gray-200 overflow-hidden p-0">
            <svg 
              width="100%" 
              height="200" 
              className="w-full block"
              viewBox="0 0 1000 200"
              preserveAspectRatio="none"
            >
            {/* 구매여정 단계별 배경색 영역 */}
            {journeyStages.map((stage, index) => {
              const stageWidth = 1000 / 6; // 전체 차트 영역을 6개로 나눔 (카드 영역과 동일)
              const x = index * stageWidth;
              
              // 색상 매핑
              const colorMap: {[key: string]: string} = {
                'bg-red-50': '#fef2f2',
                'bg-orange-50': '#fff7ed', 
                'bg-yellow-50': '#fefce8',
                'bg-green-50': '#f0fdf4',
                'bg-blue-50': '#eff6ff',
                'bg-purple-50': '#f5f3ff'
              };
              
              
              return (
                <rect
                  key={`bg-${index}`}
                  x={x}
                  y="0"
                  width={stageWidth}
                  height="200"
                  fill={colorMap[stage.bgColor] || '#f9fafb'}
                  fillOpacity="0.3"
                  stroke="none"
                />
              );
            })}
            
            {/* 배경 격자 */}
            <defs>
              <pattern id="grid" width="50" height="20" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" strokeWidth="1" strokeOpacity="0.5"/>
              </pattern>
            </defs>
            <rect x="0" y="0" width="1000" height="200" fill="url(#grid)" />
            
            {/* Y축 격자선 (숫자 라벨 제거) */}
            {Array.from({ length: 11 }, (_, i) => (
              <line 
                key={i}
                x1="0" 
                y1={200 - i * 20} 
                x2="1000" 
                y2={200 - i * 20} 
                stroke="#e5e7eb" 
                strokeWidth="1"
                strokeOpacity="0.2"
              />
            ))}
            
            
            {/* 곡선 그래프 */}
            <path
              d={createCurvePath()}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* 데이터 포인트 */}
            {mapData.map((point, index) => (
              <g key={index}>
                {/* 포인트 원 */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="8"
                  fill="#3b82f6"
                  stroke="#ffffff"
                  strokeWidth="3"
                />
                
                {/* 점수 라벨 */}
                <text
                  x={point.x}
                  y={point.y - 15}
                  fontSize="14"
                  fontWeight="bold"
                  fill="#1f2937"
                  textAnchor="middle"
                >
                  {point.score}
                </text>
                
              </g>
            ))}
            
          </svg>
          </div>
        </div>
        
        {/* 간트차트 영역 */}
        {ganttStrategy && ganttStrategy.length > 0 && (
          <div className="border-l-2 border-r-2 border-b-2 border-gray-200 rounded-b-lg">
            
            {/* 각 범위별로 별도의 행 생성 */}
            {ganttStrategy.map((range, rangeIndex) => (
              <div key={range.rangeId} className="flex" style={{ height: '72px' }}>
                {journeyStages.map((stage, stageIndex) => {
                  const isInRange = stageIndex >= range.startStageIndex - 1 && stageIndex <= range.endStageIndex - 1;
                  const isFirstInRange = stageIndex === range.startStageIndex - 1;
                  const isLastInRange = stageIndex === range.endStageIndex - 1;
                  
                  return (
                    <div 
                      key={stageIndex}
                      className={`flex-1 border-r border-gray-200 ${stage.bgColor} ${rangeIndex === ganttStrategy.length - 1 ? '' : 'border-b'}`}
                      style={{
                        borderRight: stageIndex === journeyStages.length - 1 ? 'none' : undefined
                      }}
                    >
                      <div className="relative w-full h-full">
                        {isInRange && (
                          <div 
                            className="absolute top-2 bottom-2 flex items-center justify-center shadow-sm border-2"
                            style={{
                              left: isFirstInRange ? '8px' : '0px',
                              right: isLastInRange ? '8px' : '0px',
                              backgroundColor: rangeIndex % 2 === 0 ? '#3b82f6' : '#10b981',
                              borderColor: rangeIndex % 2 === 0 ? '#1d4ed8' : '#059669',
                              background: rangeIndex % 2 === 0 
                                ? 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)' 
                                : 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                              borderRadius: isFirstInRange && isLastInRange ? '6px' : 
                                         isFirstInRange ? '6px 0 0 6px' :
                                         isLastInRange ? '0 6px 6px 0' : '0'
                            }}
                          >
                            {/* 범위 라벨을 중앙에만 표시 */}
                            {stageIndex === Math.floor((range.startStageIndex - 1 + range.endStageIndex - 1) / 2) && (
                              <span className="text-white text-xs font-medium text-center px-2">
                                {range.rangeLabel}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            
          </div>
        )}
      </div>
    </div>
  );
};