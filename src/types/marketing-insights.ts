export interface CustomerPsychologyDataDriven {
  emotions: string;
  motivations: string;
  cognitiveLevel: string;
}

export interface CustomerPsychologyGeneralInsight {
  needs: string;
  anxieties: string;
}

export interface RisksAndBarriersDataDriven {
  internal: string;
  external: string;
  riskTypes: string;
}

export interface RisksAndBarriersGeneralInsight {
  commonBarriers: string;
}

export interface ContentMessagingStrategyDataDriven {
  messageTone: string;
  contentTypes: string;
  corePoints: string;
}

export interface ContentMessagingStrategyGeneralInsight {
  psychologyRelief: string;
  valueProposition: string;
}

export interface MarketingInsights {
  customerPsychology: {
    dataDriven: CustomerPsychologyDataDriven;
    generalInsight: CustomerPsychologyGeneralInsight;
  };
  risksAndBarriers: {
    dataDriven: RisksAndBarriersDataDriven;
    generalInsight: RisksAndBarriersGeneralInsight;
  };
  contentMessagingStrategy: {
    dataDriven: ContentMessagingStrategyDataDriven;
    generalInsight: ContentMessagingStrategyGeneralInsight;
  };
}

export interface KeywordInsightData {
  keyword: string;
  pcCount: number;
  mobileCount: number;
  pcCtr: number;
  mobileCtr: number;
}