"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useAnalysisStore } from '@/store/keyword-analysis';


export default function KeywordInputPage() {
  const router = useRouter();
  const { 
    keyword, 
    setKeyword, 
    nextStep 
  } = useAnalysisStore();
  
  const [localKeyword, setLocalKeyword] = useState(keyword);


  const handleSearch = () => {
    console.log('🔍 검색 버튼 클릭됨');
    
    if (!localKeyword.trim()) {
      alert('키워드를 입력해주세요.');
      return;
    }

    try {
      console.log('📝 검색 데이터:', {
        keyword: localKeyword
      });

      // Store 업데이트
      setKeyword(localKeyword);
      nextStep();
      
      console.log('🚀 2단계로 이동');
      router.push('/step2');
      
    } catch (error) {
      console.error('❌ 검색 처리 중 오류:', error);
      alert('검색 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="h-[calc(100vh-129px)] flex items-center justify-center">
      <div className="w-full max-w-2xl px-8">
        <div className="space-y-8">
          <label className="block text-4xl font-bold text-center bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
            분석할 키워드를 입력해주세요.
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              value={localKeyword}
              onChange={(e) => setLocalKeyword(e.target.value)}
              placeholder=""
              className="pl-10 rounded-xl border-0 shadow-none focus:ring-0 focus:border-0 bg-white"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}