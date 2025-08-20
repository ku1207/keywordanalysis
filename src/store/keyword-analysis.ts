import { create } from 'zustand';

export interface KeywordData {
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

export interface AnalysisState {
  currentStep: number;
  keyword: string;
  keywordData: KeywordData[];
  totalSearchVolume: number;
  categoryData: {[keyword: string]: string};
  setCurrentStep: (step: number) => void;
  setKeyword: (keyword: string) => void;
  setKeywordData: (data: KeywordData[]) => void;
  setCategoryData: (data: {[keyword: string]: string}) => void;
  calculateTotalSearchVolume: () => void;
  nextStep: () => void;
  prevStep: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  currentStep: 1,
  keyword: '',
  keywordData: [],
  totalSearchVolume: 0,
  categoryData: {},
  
  setCurrentStep: (step) => set({ currentStep: step }),
  
  setKeyword: (keyword) => set({ keyword }),
  
  setKeywordData: (data) => {
    set({ keywordData: data });
    get().calculateTotalSearchVolume();
  },
  
  setCategoryData: (data) => set({ categoryData: data }),
  
  calculateTotalSearchVolume: () => {
    const { keywordData } = get();
    const total = keywordData.reduce((sum, item) => {
      // '<10' 값을 10으로 치환하여 계산
      const pcCount = item.monthlyPcQcCnt === '<10' ? 10 : (parseInt(item.monthlyPcQcCnt) || 0);
      const mobileCount = item.monthlyMobileQcCnt === '<10' ? 10 : (parseInt(item.monthlyMobileQcCnt) || 0);
      return sum + pcCount + mobileCount;
    }, 0);
    set({ totalSearchVolume: total });
  },
  
  nextStep: () => {
    const { currentStep } = get();
    if (currentStep < 3) {
      set({ currentStep: currentStep + 1 });
    }
  },
  
  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 1) {
      set({ currentStep: currentStep - 1 });
    }
  },
}));