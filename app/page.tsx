"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { 
  Volume2, 
  RotateCw, 
  ToggleLeft, 
  ToggleRight, 
  Sparkles, 
  Zap, 
  Check, 
  X,
  Feather
} from "lucide-react";

// ================= 配置与类型定义 =================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const TEMP_USER_ID = "00000000-0000-0000-0000-000000000001";

interface WordContent {
  word_fr: string;
  word_en: string;
  word_cn: string;
  hook_en: string;
  hook_cn: string;
  sentence_fr: string;
  sentence_en: string;
  sentence_cn: string;
  phonetics?: string;
}

interface WordRow {
  id: string;
  word_fr: string;
  content: WordContent;
  status: 'new' | 'review';
}

export default function Home() {
  // ================= State 管理 =================
  const [words, setWords] = useState<WordRow[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isEnglishMode, setIsEnglishMode] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);

  // ================= 1. 加载数据 =================
  const fetchWords = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_study_session', { 
        target_user_id: TEMP_USER_ID 
      });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setWords(data);
        setCurrentIndex(0);
        setIsFinished(false);
      } else {
        setIsFinished(true);
      }
    } catch (err) {
      console.error("加载失败:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWords();
  }, []);

  // ================= 2. 交互逻辑 =================
  const handleReview = async (isKnown: boolean) => {
    if (words.length === 0) return;
    const currentWord = words[currentIndex];
    
    setIsFlipped(false);

    setTimeout(() => {
        if (currentIndex >= words.length - 1) {
            fetchWords();
        } else {
            setCurrentIndex((prev) => prev + 1);
        }
    }, 250);

    const nextDate = new Date();
    let newBox = 0;
    if (isKnown) {
      nextDate.setDate(nextDate.getDate() + 1);
      newBox = 1;
    } else {
      nextDate.setMinutes(nextDate.getMinutes() + 10);
      newBox = 0;
    }

    supabase.from("user_progress").upsert(
      {
        user_id: TEMP_USER_ID,
        word_id: currentWord.id,
        box: newBox,
        next_review: nextDate.toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id, word_id" }
    );
  };

  const playAudio = () => {
    if (!words[currentIndex]) return;
    const text = words[currentIndex].content.word_fr;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-CA";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const progressPercent = words.length > 0 ? ((currentIndex) / words.length) * 100 : 0;

  // ================= 渲染部分 =================
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] flex flex-col items-center justify-center gap-4">
        <div className="animate-pulse">
            <Feather size={48} className="text-[#D0867D]" />
        </div>
        <p className="text-[#8C8C8C] font-medium tracking-wide">Preparing your session...</p>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] flex flex-col items-center justify-center p-6">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] max-w-sm w-full text-center border border-[#E5E5E5]">
          <div className="w-24 h-24 bg-[#EFF4F1] text-[#8FA998] rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles size={40} />
          </div>
          <h2 className="text-3xl font-bold text-[#5C5C5C] mb-3">All Done!</h2>
          <p className="text-[#9C9C9C] mb-10 leading-relaxed">
            你已经完成了当前的学习队列。<br/>休息一下，享受生活吧。
          </p>
          <button 
            onClick={() => fetchWords()}
            className="w-full py-4 bg-[#6B7F8E] text-white font-bold rounded-2xl hover:bg-[#5A6B7A] transition-all shadow-lg shadow-[#6B7F8E]/20"
          >
            Refresh Session
          </button>
        </div>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const details = currentWord.content;

  return (
    <div className="min-h-screen bg-[#F7F7F5] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden text-[#5C5C5C]">
      
      {/* 背景装饰：极其柔和的色块 */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#EFEBE9] rounded-full blur-[100px] opacity-60 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#E3E9EB] rounded-full blur-[100px] opacity-60 pointer-events-none"></div>

      {/* --- Header --- */}
      <div className="w-full max-w-md z-10 mb-8">
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2.5">
                <span className="text-2xl text-[#D0867D] drop-shadow-sm">🍁</span>
                <span className="font-bold text-[#6D6D6D] text-lg tracking-wide">MapleFrench</span>
            </div>
            
            <button
                onClick={() => setIsEnglishMode(!isEnglishMode)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    isEnglishMode 
                    ? "bg-white text-[#7A8B99] border-[#DCE3E5] shadow-sm" 
                    : "bg-white text-[#A0A0A0] border-transparent"
                }`}
            >
                {isEnglishMode ? "EN Bridge" : "CN Mode"}
                {isEnglishMode ? <ToggleRight size={18} className="text-[#7A8B99]"/> : <ToggleLeft size={18} />}
            </button>
        </div>

        {/* 莫兰迪进度条 */}
        <div className="h-2 w-full bg-[#E5E5E5] rounded-full overflow-hidden">
            <div 
                className="h-full bg-[#A4BE7B] rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPercent}%` }}
            ></div>
        </div>
      </div>

      {/* --- 卡片区域 --- */}
      <div className="relative w-full max-w-md h-[540px] mb-10 z-10">
        
        {/* 底部堆叠卡片装饰 (增加厚度感) */}
        <div className="absolute top-3 left-0 w-full h-full bg-[#FFFFFF] rounded-[2.5rem] shadow-sm border border-[#F0F0F0] scale-[0.96] opacity-60 z-0"></div>
        <div className="absolute top-1.5 left-0 w-full h-full bg-[#FFFFFF] rounded-[2.5rem] shadow-md border border-[#F0F0F0] scale-[0.98] opacity-80 z-10"></div>

        {/* --- 交互主卡片 --- */}
        <div 
          className="relative w-full h-full cursor-pointer perspective-1000 z-20 group"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div 
            className={`relative w-full h-full duration-700 transform transition-all preserve-3d ${
              isFlipped ? "rotate-y-180" : ""
            }`}
            style={{ transformStyle: "preserve-3d" }}
          >
            
            {/* === 正面 (Front): 干净、留白、高级灰 === */}
            <div className="absolute w-full h-full bg-white rounded-[2.5rem] shadow-[0_15px_40px_-10px_rgba(0,0,0,0.06)] border border-[#F5F5F5] flex flex-col items-center justify-center backface-hidden p-8">
              
              {/* 标签：莫兰迪色块 */}
              <div className="absolute top-8 left-8">
                {currentWord.status === 'review' ? (
                  <span className="flex items-center gap-1.5 bg-[#F4EBE4] text-[#B88A75] px-4 py-1.5 rounded-xl text-xs font-bold tracking-wider">
                    <Zap size={12} fill="currentColor" /> REVIEW
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 bg-[#E8F0EA] text-[#7C9A86] px-4 py-1.5 rounded-xl text-xs font-bold tracking-wider">
                    <Sparkles size={12} /> NEW
                  </span>
                )}
              </div>

              {/* 翻转提示 */}
              <div className="absolute top-8 right-8 text-[#D1D1D1]">
                <RotateCw size={20} />
              </div>

              <div className="text-center mt-[-20px]">
                <span className="block text-[10px] font-bold text-[#C0C0C0] tracking-[0.3em] mb-8 uppercase">Français</span>
                
                {/* 单词：深炭灰色 */}
                <h2 className="text-6xl font-black text-[#4A4A4A] mb-5 tracking-tight">
                  {details.word_fr}
                </h2>
                
                {/* 音标：浅灰背景 */}
                {details.phonetics && (
                    <div className="inline-block bg-[#F7F7F5] px-5 py-2 rounded-full mb-10">
                        <p className="text-[#9CA3AF] font-mono text-lg">{details.phonetics}</p>
                    </div>
                )}
              </div>
              
              {/* 播放按钮：低饱和度粉色 */}
              <button 
                onClick={(e) => { e.stopPropagation(); playAudio(); }}
                className="absolute bottom-12 w-16 h-16 bg-[#F9ECE8] text-[#C0887D] rounded-full flex items-center justify-center hover:bg-[#F2DFD9] hover:scale-105 transition-all shadow-sm"
              >
                <Volume2 size={26} />
              </button>
            </div>

            {/* === 背面 (Back): 莫兰迪深蓝灰背景 === */}
            <div 
              className="absolute w-full h-full bg-[#4A5D6B] text-[#F0F0F0] rounded-[2.5rem] shadow-xl flex flex-col backface-hidden overflow-hidden"
              style={{ transform: "rotateY(180deg)" }}
            >
              {/* 顶部释义区 */}
              <div className="bg-[#41525E] p-10 text-center">
                <h3 className="text-2xl font-bold mb-2 text-[#8B9DA8]">{details.word_fr}</h3>
                {isEnglishMode ? (
                   <p className="text-3xl font-bold text-[#D0E1E8]">{details.word_en}</p>
                ) : (
                   <p className="text-3xl font-bold text-[#E6D5B8]">{details.word_cn}</p>
                )}
              </div>

              {/* 内容区：更柔和的线条和颜色 */}
              <div className="flex-1 p-8 overflow-y-auto space-y-5 custom-scrollbar">
                
                {/* Memory Hook */}
                <div className="bg-[#536675] p-5 rounded-2xl border border-[#FFFFFF10]">
                  <div className="flex items-center gap-2 mb-2 text-[#E6D5B8] text-[10px] font-black uppercase tracking-wider">
                    <Feather size={12} /> Memory Hook
                  </div>
                  <p className="text-[15px] text-[#D0D9DF] leading-relaxed font-medium opacity-90">
                    {isEnglishMode ? details.hook_en : details.hook_cn}
                  </p>
                </div>

                {/* Example */}
                <div className="pt-2">
                  <div className="text-[#8B9DA8] text-[10px] font-bold uppercase tracking-wider mb-2 pl-1">Context (A1)</div>
                  <div className="p-0">
                    <p className="text-lg italic font-medium text-white mb-1.5 opacity-90">
                      "{details.sentence_fr}"
                    </p>
                    <p className="text-sm text-[#A0B0BC]">
                      {isEnglishMode ? details.sentence_en : details.sentence_cn}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- 底部控制按钮：极简风 --- */}
      <div className="flex gap-5 w-full max-w-md z-10">
        {/* 不认识：干枯玫瑰色边框 */}
        <button 
          onClick={() => handleReview(false)}
          className="flex-1 h-16 bg-[#FFFFFF] text-[#C0887D] border-2 border-[#F0DCD7] font-bold rounded-2xl active:bg-[#F9ECE8] transition-all flex items-center justify-center gap-2 text-base tracking-wide hover:border-[#E0B8B0]"
        >
          <X size={20} strokeWidth={3} />
          Forgot
        </button>
        
        {/* 认识：豆沙绿实心 */}
        <button 
          onClick={() => handleReview(true)}
          className="flex-1 h-16 bg-[#8FA998] text-white font-bold rounded-2xl shadow-[0_8px_20px_-5px_rgba(143,169,152,0.4)] active:scale-[0.98] hover:bg-[#7D9686] transition-all flex items-center justify-center gap-2 text-base tracking-wide"
        >
          <Check size={20} strokeWidth={3} />
          Got it
        </button>
      </div>

      <div className="mt-8 text-xs text-[#C0C0C0] font-mono opacity-50">
        MapleFrench • Morandi Edition
      </div>
    </div>
  );
}