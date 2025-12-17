"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { 
  Volume2, RotateCw, Sparkles, Zap, Check, X, Feather, Trophy, BrainCircuit, CircleDashed, 
  BookOpen, LayoutGrid, Filter, PlayCircle, Mars, Venus, ToggleLeft, ToggleRight,
  ChevronLeft, ChevronRight 
} from "lucide-react";

// ================= 配置区 =================
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const TEMP_USER_ID = "00000000-0000-0000-0000-000000000001";

// ================= 类型定义 =================
interface WordContent {
  word_fr: string;
  gender?: 'm' | 'f' | 'adj' | 'v' | 'adv' | 'prep' | 'conj' | 'pron' | null;
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

interface VocabBookItem {
  id: string;
  word_fr: string;
  word_cn: string;
  gender: 'm' | 'f' | 'adj' | 'v' | 'adv' | null;
  box: number;
}

interface DashboardStats {
  total: number;
  learning: number; 
  mastered: number; 
  new: number;
}

export default function Home() {
  // ================= State =================
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  
  const [words, setWords] = useState<WordRow[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isEnglishMode, setIsEnglishMode] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  
  const [vocabList, setVocabList] = useState<VocabBookItem[]>([]);
  const [listFilter, setListFilter] = useState<'all' | 'learning' | 'mastered'>('all');
  
  const [stats, setStats] = useState<DashboardStats>({ total: 0, learning: 0, mastered: 0, new: 0 });

  const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null);

  // ================= 1. 数据加载 =================
  
  const fetchSmartSession = async () => {
    setIsLoading(true);
    const { data } = await supabase.rpc('get_study_session', { target_user_id: TEMP_USER_ID });
    if (data && data.length > 0) {
      setWords(data);
      setCurrentIndex(0);
      setIsFinished(false);
      setViewMode('card');
    } else {
      setIsFinished(true);
      fetchStats();
    }
    setIsLoading(false);
  };

  const fetchVocabBook = async () => {
    const { data } = await supabase.rpc('get_vocabulary_book', { target_user_id: TEMP_USER_ID });
    if (data) setVocabList(data);
  };

  const startCustomReview = async (items: VocabBookItem[]) => {
    setIsLoading(true);
    const ids = items.map(i => i.id);
    const { data } = await supabase.from('vocabulary').select('*').in('id', ids);
    if (data) {
        const customQueue: WordRow[] = data.map(item => ({
            id: item.id,
            word_fr: item.word_fr,
            content: item.content,
            status: 'review'
        }));
        setWords(customQueue);
        setCurrentIndex(0);
        setIsFinished(false);
        setViewMode('card');
    }
    setIsLoading(false);
  };

  const fetchStats = async () => {
    const { data } = await supabase.rpc('get_dashboard_stats', { target_user_id: TEMP_USER_ID });
    if (data && data[0]) {
      const s = data[0];
      setStats({
        total: s.total_count,
        learning: s.learning_count,
        mastered: s.mastered_count,
        new: s.total_count - (s.learning_count + s.mastered_count)
      });
    }
  };

  useEffect(() => {
    fetchSmartSession();
    fetchStats();
    fetchVocabBook(); 
  }, []);

  // ================= 2. 交互逻辑 =================

  const handleNav = (direction: 'prev' | 'next') => {
    if (autoAdvanceTimer.current) {
        clearTimeout(autoAdvanceTimer.current);
        autoAdvanceTimer.current = null;
    }
    setIsFlipped(false); 
    if (direction === 'prev') {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
    } else {
        setCurrentIndex((prev) => Math.min(words.length - 1, prev + 1));
    }
  };

  const handleReview = async (isKnown: boolean) => {
    if (words.length === 0) return;
    const currentWord = words[currentIndex];
    
    setIsFlipped(false);
    const nextDate = new Date();
    let newBox = 0;
    
    if (isKnown) {
      nextDate.setDate(nextDate.getDate() + 1);
      newBox = 1; 
    } else {
      nextDate.setMinutes(nextDate.getMinutes() + 10);
      newBox = 0;
    }

    await supabase.from("user_progress").upsert({
        user_id: TEMP_USER_ID,
        word_id: currentWord.id,
        box: newBox,
        next_review: nextDate.toISOString(),
        updated_at: new Date().toISOString(),
    }, { onConflict: "user_id, word_id" });

    autoAdvanceTimer.current = setTimeout(() => {
        if (currentIndex >= words.length - 1) {
            setIsFinished(true); 
        } else {
            setCurrentIndex((prev) => prev + 1);
        }
        fetchStats(); 
        fetchVocabBook(); 
    }, 200);
  };

  const playAudio = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-CA";
    window.speechSynthesis.speak(utterance);
  };

  // 样式辅助
  const filteredList = vocabList.filter(item => {
      if (listFilter === 'all') return true;
      if (listFilter === 'learning') return item.box < 3;
      if (listFilter === 'mastered') return item.box >= 3;
      return true;
  });

  const getGenderStyle = (gender: string | null | undefined) => {
    if (gender === 'm') return {
        bg: 'bg-[#E3F2FD]', border: 'border-[#90CAF9]', text: 'text-[#1976D2]', icon: <Mars size={20} className="text-[#1976D2] opacity-80"/>
    };
    if (gender === 'f') return {
        bg: 'bg-[#FCE4EC]', border: 'border-[#F48FB1]', text: 'text-[#C2185B]', icon: <Venus size={20} className="text-[#C2185B] opacity-80"/>
    };
    return { bg: 'bg-white', border: 'border-[#F5F5F5]', text: 'text-gray-300', icon: null };
  };

  // ✅ 新增：词性/性别显示文案转换
  const getPosLabel = (g: string | null | undefined) => {
    if (!g) return 'FRANÇAIS';
    const map: Record<string, string> = {
        'm': 'MASCULINE',
        'f': 'FEMININE',
        'v': 'VERB',
        'adj': 'ADJECTIVE',
        'adv': 'ADVERB',
        'prep': 'PREPOSITION',
        'conj': 'CONJUNCTION',
        'pron': 'PRONOUN'
    };
    return map[g] || g.toUpperCase();
  };

  const progressPercent = words.length > 0 ? ((currentIndex + 1) / words.length) * 100 : 0;
  const currentWord = words[currentIndex];
  const details = currentWord?.content;
  const genderStyle = currentWord ? getGenderStyle(details?.gender) : getGenderStyle(null);

  // 安全检查
  if (!isLoading && !isFinished && !currentWord && viewMode === 'card') {
      return (
        <div className="min-h-screen bg-[#F7F7F5] flex flex-col items-center justify-center text-gray-400">
            <p>No cards available.</p>
            <button onClick={fetchSmartSession} className="mt-4 text-blue-500 underline">Refresh</button>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] flex flex-col items-center p-4 font-sans relative overflow-hidden text-[#5C5C5C]">
      
      {/* 顶部标题栏 */}
      <div className="w-full max-w-md z-20 mt-2 mb-4 flex justify-between items-center px-2">
            <div className="flex items-center gap-2">
                 <span className="text-xl text-[#D0867D]">🍁</span>
                 <span className="font-bold text-[#6D6D6D] text-lg tracking-wide">MapleFrench</span>
            </div>
            <button
                onClick={() => setIsEnglishMode(!isEnglishMode)}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${isEnglishMode ? "bg-white text-[#7A8B99] border-[#DCE3E5]" : "bg-white text-[#A0A0A0] border-transparent"}`}
            >
                {isEnglishMode ? "EN Bridge" : "CN Mode"}
                {isEnglishMode ? <ToggleRight size={14}/> : <ToggleLeft size={14} />}
            </button>
      </div>

      {/* 1. 仪表盘 */}
      <div className="w-full max-w-md z-10 mb-6 bg-white/60 backdrop-blur-md p-3 rounded-3xl border border-white/50 shadow-sm">
        <div className="flex justify-between gap-2">
            <div className="flex-1 bg-white rounded-2xl p-2.5 flex flex-col items-center border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-gray-200"></div>
                <CircleDashed size={16} className="text-gray-400 mb-1" />
                <span className="text-lg font-bold text-gray-600 leading-none">{stats.new}</span>
                <span className="text-[10px] text-gray-400 font-medium mt-1">TO LEARN</span>
            </div>

            <div className="flex-1 bg-white rounded-2xl p-2.5 flex flex-col items-center border border-orange-50 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#DAB693]"></div>
                <BrainCircuit size={16} className="text-[#DAB693] mb-1" />
                <span className="text-lg font-bold text-[#C5A07B] leading-none">{stats.learning}</span>
                <span className="text-[10px] text-[#DAB693]/80 font-medium mt-1">LEARNING</span>
            </div>

            <div className="flex-1 bg-white rounded-2xl p-2.5 flex flex-col items-center border border-green-50 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#8FA998]"></div>
                <Trophy size={16} className="text-[#8FA998] mb-1" />
                <span className="text-lg font-bold text-[#7D9686] leading-none">{stats.mastered}</span>
                <span className="text-[10px] text-[#8FA998]/80 font-medium mt-1">MASTERED</span>
            </div>
        </div>
      </div>

      {/* 2. 视图切换 & 进度条 */}
      <div className="w-full max-w-md z-10 mb-4 flex flex-col gap-4">
          <div className="flex bg-gray-200/50 p-1 rounded-2xl self-center">
             <button onClick={() => setViewMode('card')} className={`px-6 py-2 rounded-xl transition-all flex items-center gap-2 text-xs font-bold ${viewMode === 'card' ? 'bg-white text-[#5C5C5C] shadow-sm' : 'text-gray-400 hover:text-gray-500'}`}>
                <LayoutGrid size={14} /> Cards
             </button>
             <button onClick={() => setViewMode('list')} className={`px-6 py-2 rounded-xl transition-all flex items-center gap-2 text-xs font-bold ${viewMode === 'list' ? 'bg-white text-[#5C5C5C] shadow-sm' : 'text-gray-400 hover:text-gray-500'}`}>
                <BookOpen size={14} /> Book
             </button>
          </div>

          {viewMode === 'card' && !isFinished && (
            <div className="px-2 flex items-center gap-3">
                <span className="text-[10px] font-bold text-[#DAB693] w-8 text-right">{Math.round(progressPercent)}%</span>
                <div className="h-2 flex-1 bg-[#E5E5E5] rounded-full overflow-hidden">
                    <div className="h-full bg-[#DAB693] rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }}></div>
                </div>
                <span className="text-[10px] font-bold text-[#C0C0C0] w-12 text-right">{currentIndex + 1} / {words.length}</span>
            </div>
          )}
      </div>

      {/* 3. 列表模式 */}
      {viewMode === 'list' && (
        <div className="w-full max-w-md z-10 flex-1 flex flex-col min-h-0">
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                {(['all', 'learning', 'mastered'] as const).map(f => (
                    <button key={f} onClick={() => setListFilter(f)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${listFilter === f ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-gray-400 border-gray-200'}`}>
                        {f.toUpperCase()} ({f === 'all' ? vocabList.length : f === 'learning' ? vocabList.filter(i=>i.box<3).length : vocabList.filter(i=>i.box>=3).length})
                    </button>
                ))}
            </div>
            <div className="flex-1 overflow-y-auto bg-white rounded-3xl shadow-sm border border-gray-100 custom-scrollbar relative">
                {filteredList.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300">
                        <Filter size={48} className="mb-2 opacity-50"/>
                        <p>Empty List...</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {filteredList.map((item) => (
                            <div key={item.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors group cursor-pointer" onClick={() => {}}>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-700 text-lg">{item.word_fr}</span>
                                        {item.gender === 'm' && <Mars size={14} className="text-blue-400"/>}
                                        {item.gender === 'f' && <Venus size={14} className="text-pink-400"/>}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-0.5">{item.word_cn}</div>
                                </div>
                                <div className="flex gap-1">
                                    {[1,2,3].map(dot => (
                                        <div key={dot} className={`w-2 h-2 rounded-full ${item.box >= dot ? 'bg-[#8FA998]' : 'bg-gray-200'}`}></div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="mt-4 pb-6">
                <button onClick={() => startCustomReview(filteredList)} className="w-full py-4 bg-[#6B7F8E] text-white font-bold rounded-2xl shadow-lg hover:bg-[#5A6B7A] transition-all flex items-center justify-center gap-2">
                    <PlayCircle size={20} /> Review List ({filteredList.length})
                </button>
            </div>
        </div>
      )}

      {/* 4. 卡片模式 */}
      {viewMode === 'card' && (
        <>
        {isFinished ? (
            <div className="w-full max-w-md bg-white p-10 rounded-[2.5rem] shadow-xl text-center border border-[#E5E5E5] mt-4">
                <div className="w-24 h-24 bg-[#EFF4F1] text-[#8FA998] rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trophy size={40} />
                </div>
                <h2 className="text-2xl font-bold text-[#5C5C5C] mb-2">Session Complete!</h2>
                <div className="flex flex-col gap-3 mt-8">
                    <button onClick={fetchSmartSession} className="w-full py-3 bg-[#6B7F8E] text-white font-bold rounded-xl shadow-lg">Start New Session</button>
                    <button onClick={() => setViewMode('list')} className="w-full py-3 bg-white border-2 border-gray-100 text-gray-500 font-bold rounded-xl">Open Vocabulary Book</button>
                </div>
            </div>
        ) : (
            <>
            <div className="relative w-full max-w-md h-[460px] mb-8 z-10 mt-2">
                
                {/* ✅ 新增：悬浮导航按钮 (在翻转层之外，但在 relative 容器之内) */}
                <div className="absolute inset-0 z-30 flex items-center justify-between px-0 pointer-events-none">
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleNav('prev'); }}
                        disabled={currentIndex === 0}
                        className="pointer-events-auto p-2 bg-white/40 hover:bg-white rounded-full shadow-sm text-gray-400 hover:text-[#D0867D] disabled:opacity-0 transition-all transform -translate-x-2"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleNav('next'); }}
                        disabled={currentIndex === words.length - 1}
                        className="pointer-events-auto p-2 bg-white/40 hover:bg-white rounded-full shadow-sm text-gray-400 hover:text-[#D0867D] disabled:opacity-0 transition-all transform translate-x-2"
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>

                <div className="relative w-full h-full cursor-pointer perspective-1000 z-20 group" onClick={() => setIsFlipped(!isFlipped)}>
                <div className={`relative w-full h-full duration-700 transform transition-all preserve-3d ${isFlipped ? "rotate-y-180" : ""}`} style={{ transformStyle: "preserve-3d" }}>
                    
                    {/* 正面 */}
                    <div className={`absolute w-full h-full bg-white rounded-[2.5rem] shadow-[0_15px_40px_-10px_rgba(0,0,0,0.06)] border-2 flex flex-col items-center justify-center backface-hidden p-8 transition-colors ${genderStyle.border} ${genderStyle.bg}`}>
                        <div className="absolute top-8 right-8 opacity-50">{genderStyle.icon}</div>
                        <div className="absolute top-8 left-8">
                            {currentWord?.status === 'review' ? (
                            <span className="flex items-center gap-1.5 bg-[#F4EBE4] text-[#B88A75] px-3 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase">
                                <Zap size={10} fill="currentColor" /> Review
                            </span>
                            ) : (
                            <span className="flex items-center gap-1.5 bg-[#E8F0EA] text-[#7C9A86] px-3 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase">
                                <Sparkles size={10} /> New
                            </span>
                            )}
                        </div>
                        <div className="text-center mt-[-10px]">
                            {/* ✅ 修改：显示具体的词性 (VERB, ADVERB) 而不是笼统的 FRANÇAIS */}
                            <span className={`block text-[10px] font-black tracking-[0.3em] mb-8 uppercase ${genderStyle.text}`}>
                                {getPosLabel(details?.gender)}
                            </span>
                            <h2 className="text-6xl font-black text-[#4A4A4A] mb-5 tracking-tight">{details?.word_fr}</h2>
                            {details?.phonetics && (
                                <div className="inline-block bg-white/60 px-4 py-1.5 rounded-full mb-10 border border-black/5 mt-4">
                                    <p className="text-[#9CA3AF] font-mono text-lg">{details.phonetics}</p>
                                </div>
                            )}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); playAudio(details?.word_fr || ''); }} className="absolute bottom-12 w-14 h-14 bg-white text-[#C0887D] rounded-full flex items-center justify-center hover:scale-110 shadow-sm border border-[#F9ECE8]">
                            <Volume2 size={24} />
                        </button>
                    </div>

                    {/* 背面 */}
                    <div className="absolute w-full h-full bg-[#4A5D6B] text-[#F0F0F0] rounded-[2.5rem] shadow-xl flex flex-col backface-hidden overflow-hidden" style={{ transform: "rotateY(180deg)" }}>
                        <div className="bg-[#41525E] p-8 text-center relative">
                            <h3 className="text-xl font-bold mb-2 text-[#8B9DA8]">{details?.word_fr}</h3>
                            <p className={`text-3xl font-bold ${isEnglishMode ? "text-[#D0E1E8]" : "text-[#E6D5B8]"}`}>
                                {isEnglishMode ? details?.word_en : details?.word_cn}
                            </p>
                        </div>
                        <div className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar">
                            <div className="bg-[#536675] p-4 rounded-2xl border border-[#FFFFFF10]">
                                <div className="flex items-center gap-2 mb-2 text-[#E6D5B8] text-[10px] font-black uppercase tracking-wider">
                                    <Feather size={10} /> Memory Hook
                                </div>
                                <p className="text-sm text-[#D0D9DF] leading-relaxed font-medium opacity-90">
                                    {isEnglishMode ? details?.hook_en : details?.hook_cn}
                                </p>
                            </div>
                            <div className="pt-2">
                                <div className="text-[#8B9DA8] text-[10px] font-bold uppercase tracking-wider mb-2 pl-1">Context</div>
                                <p className="text-lg italic font-medium text-white mb-1.5 opacity-90">"{details?.sentence_fr}"</p>
                                <p className="text-sm text-[#A0B0BC]">{isEnglishMode ? details?.sentence_en : details?.sentence_cn}</p>
                            </div>
                        </div>
                    </div>
                </div>
                </div>
            </div>
            <div className="flex gap-4 w-full max-w-md z-10 pb-6">
                <button onClick={() => handleReview(false)} className="flex-1 h-14 bg-[#FFFFFF] text-[#C0887D] border-2 border-[#F0DCD7] font-bold rounded-2xl active:bg-[#F9ECE8] transition-all flex items-center justify-center gap-2 text-base tracking-wide hover:border-[#E0B8B0]">
                <X size={20} strokeWidth={3} /> Forgot
                </button>
                <button onClick={() => handleReview(true)} className="flex-1 h-14 bg-[#8FA998] text-white font-bold rounded-2xl shadow-[0_8px_20px_-5px_rgba(143,169,152,0.4)] active:scale-[0.98] hover:bg-[#7D9686] transition-all flex items-center justify-center gap-2 text-base tracking-wide">
                <Check size={20} strokeWidth={3} /> Got it
                </button>
            </div>
            </>
        )}
        </>
      )}
    </div>
  );
}