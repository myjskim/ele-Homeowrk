import React, { useState, useEffect } from 'react';
import { BookOpen, Settings as SettingsIcon, ChevronDown, CheckCircle2, AlertCircle, Loader2, RefreshCw, Image as ImageIcon, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GRADES, SEMESTERS, SUBJECTS, DIFFICULTIES, UNITS } from './constants';
import { Grade, Semester, Subject, Difficulty, Unit, AppSettings, Question } from './types';
import SettingsModal from './components/SettingsModal';
import { generateQuestions, generateQuestionImage } from './services/gemini';

export default function App() {
  // State for selections
  const [grade, setGrade] = useState<Grade>('3학년');
  const [semester, setSemester] = useState<Semester>('1학기');
  const [subject, setSubject] = useState<Subject>('수학');
  const [unit, setUnit] = useState<string>('');
  const [difficulty, setDifficulty] = useState<Difficulty>('보통');
  const [count, setCount] = useState<number>(5);

  // State for settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('app_settings');
    const parsed = saved ? JSON.parse(saved) : { apiKey: '' };
    return parsed;
  });

  // State for generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  // Filter subjects for 1-2 grade (no social, science, english)
  const isSubjectDisabled = (s: Subject) => {
    if (grade === '1학년' || grade === '2학년') {
      return s === '사회' || s === '과학' || s === '영어';
    }
    return false;
  };

  // Update unit when grade/semester/subject changes
  useEffect(() => {
    // If current subject is disabled for the new grade, reset to math
    if (isSubjectDisabled(subject)) {
      setSubject('수학');
      return;
    }

    const availableUnits = UNITS[grade][semester][subject];
    if (availableUnits.length > 0) {
      setUnit(availableUnits[0].name);
    } else {
      setUnit('');
    }
  }, [grade, semester, subject]);

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('app_settings', JSON.stringify(newSettings));
  };

  const handleGenerate = async () => {
    if (!settings.apiKey) {
      setIsSettingsOpen(true);
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedQuestions([]);
    setUserAnswers({});

    try {
      const { questions, model } = await generateQuestions(settings.apiKey, {
        grade,
        semester,
        subject,
        unit,
        difficulty,
        count
      });

      setGeneratedQuestions(questions);
      console.log(`Model used for generation: ${model}`);

      // Sequentially generate images for each question
      // Using sequence instead of parallel to avoid rate limits
      for (let i = 0; i < questions.length; i++) {
        if (!questions[i].imagePrompt) continue;
        
        try {
          const imageUrl = await generateQuestionImage(settings.apiKey, questions[i].imagePrompt!);
          setGeneratedQuestions(prev => {
            const next = [...prev];
            next[i] = { ...next[i], imageUrl };
            return next;
          });
        } catch (imgErr) {
          console.error(`Image generation for question ${i} failed:`, imgErr);
        }
      }
    } catch (err: any) {
      setError(err.message || "문제 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectAnswer = (qIdx: number, answer: string) => {
    if (userAnswers[qIdx]) return; // Single attempt
    setUserAnswers(prev => ({ ...prev, [qIdx]: answer }));
  };

  return (
    <div className="min-h-screen bg-brand-bg font-sans text-brand-ink pb-12 transition-colors duration-500">
      {/* Header */}
      <header className="bg-white border-b-3 border-brand-ink sticky top-0 z-30 h-20 flex items-center">
        <div className="max-w-[1024px] w-full mx-auto px-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tighter uppercase">
              EDU <span className="text-brand-primary">GEMINI</span>
            </h1>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="bg-brand-ink text-white px-6 py-2.5 font-bold flex items-center gap-2 hover:opacity-90 transition-all active:scale-95"
          >
            <SettingsIcon className="w-4 h-4" />
            설정
          </button>
        </div>
      </header>

      <main className="max-w-[1024px] mx-auto px-8 py-8 lg:grid lg:grid-cols-[380px_1fr] gap-10 space-y-8 lg:space-y-0">
        {/* Left Column: Selection Panel */}
        <section className="bg-white border-2 border-brand-ink p-8 flex flex-col gap-8 shadow-[8px_8px_0px_theme(colors.brand-ink)] self-start h-fit">
          <div className="space-y-1">
            <p className="text-[14px] font-black uppercase text-brand-primary tracking-wide">문제 구성 조건</p>
            <h2 className="text-xl font-black">AI 학습 매니저</h2>
          </div>
          
          <div className="space-y-6">
            <div className="flex flex-col gap-3">
              <label className="text-[13px] font-black uppercase tracking-wider text-gray-500">학년 / 학기</label>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value as Grade)}
                  className="w-full border-2 border-brand-border px-3 py-4 text-sm font-bold focus:border-brand-ink outline-none transition-all bg-brand-bg select-none"
                >
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value as Semester)}
                  className="w-full border-2 border-brand-border px-3 py-4 text-sm font-bold focus:border-brand-ink outline-none transition-all bg-brand-bg select-none"
                >
                  {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-[13px] font-black uppercase tracking-wider text-gray-500">과목 선택</label>
              <div className="grid grid-cols-3 gap-2">
                {SUBJECTS.map(s => {
                  const isDisabled = isSubjectDisabled(s);
                  return (
                    <button
                      key={s}
                      onClick={() => !isDisabled && setSubject(s)}
                      disabled={isDisabled}
                      className={`py-3 border-2 font-black text-sm transition-all ${
                        isDisabled
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                          : subject === s 
                            ? 'bg-brand-ink text-white border-brand-ink shadow-[2px_2px_0px_rgba(0,0,0,0.15)]' 
                            : 'bg-white text-brand-ink border-brand-border hover:border-brand-ink'
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-[13px] font-black uppercase tracking-wider text-gray-500">단원 / 주제</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full border-2 border-brand-border px-4 py-4 text-sm font-bold focus:border-brand-ink outline-none transition-all bg-brand-bg appearance-none"
              >
                {UNITS[grade][semester][subject].length > 0 ? (
                  UNITS[grade][semester][subject].map(u => <option key={u.id} value={u.name}>{u.name}</option>)
                ) : (
                  <option value="">단원 정보가 없습니다</option>
                )}
              </select>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-[13px] font-black uppercase tracking-wider text-gray-500">난이도 설정</label>
              <div className="grid grid-cols-3 gap-2">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`py-3 border-2 font-black text-sm transition-all ${
                      difficulty === d 
                        ? 'bg-brand-secondary text-brand-ink border-brand-ink shadow-[2px_2px_0px_rgba(0,0,0,0.15)]' 
                        : 'bg-white text-brand-ink border-brand-border hover:border-brand-ink'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-[13px] font-black uppercase tracking-wider text-gray-500">생성 문항 수</label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 5, 10, 15].map(n => (
                  <button
                    key={n}
                    onClick={() => setCount(n)}
                    className={`py-2 border-2 font-black text-sm transition-all ${
                      count === n 
                        ? 'bg-brand-primary text-white border-brand-ink' 
                        : 'bg-white text-brand-ink border-brand-border hover:border-brand-ink'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !unit}
            className="w-full py-5 bg-brand-primary text-white border-2 border-brand-ink font-black text-lg hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 shadow-[4px_4px_0px_rgba(0,0,0,0.2)]"
          >
            {isGenerating ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <RefreshCw className="w-6 h-6" />
            )}
            문제 생성하기
          </button>

          <div className="bg-brand-bg border-2 border-brand-border p-5 flex gap-4">
            <AlertCircle className="w-6 h-6 text-brand-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-500 leading-normal font-bold">
              한 번에 여러 문제를 생성(최대 15문항)하는 것이 반복 호출보다 토큰 소모량이 적어 훨씬 경제적입니다.
            </p>
          </div>
        </section>

        {/* Right Column: Preview Area */}
        <section className="flex flex-col gap-8 min-h-[500px]">
          <AnimatePresence mode="wait">
            {generatedQuestions.length === 0 && !isGenerating && !error && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 border-2 border-dashed border-brand-border flex flex-col items-center justify-center text-gray-400 p-16 text-center"
              >
                <div className="w-24 h-24 bg-brand-bg rounded-full flex items-center justify-center mb-6">
                  <ImageIcon className="w-12 h-12 opacity-30" />
                </div>
                <h3 className="text-2xl font-black text-brand-ink mb-2">시작할 준비가 되셨나요?</h3>
                <p className="text-gray-500 font-bold max-w-sm mx-auto">
                  좌측에서 학년과 과목을 선택하면<br />AI가 맞춤형 문항을 즉석에서 제작합니다.
                </p>
              </motion.div>
            )}

            {isGenerating && generatedQuestions.length === 0 && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 bg-white border-2 border-brand-ink p-16 shadow-[8px_8px_0px_rgba(0,0,0,0.05)] flex flex-col items-center justify-center gap-6 text-center"
              >
                <div className="relative">
                  <Loader2 className="w-16 h-16 text-brand-primary animate-spin" />
                  <Layers className="absolute inset-0 m-auto w-6 h-6 text-brand-ink" />
                </div>
                <div>
                  <h3 className="text-2xl font-black mb-2">{count}개의 문제를 구성 중입니다</h3>
                  <p className="text-sm text-gray-500 font-bold">Gemini가 최적의 교육 문제를 분석하고 있어요...</p>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8 bg-red-50 border-2 border-red-200 text-red-700 text-sm font-bold flex items-center gap-4"
              >
                <AlertCircle className="w-8 h-8" />
                {error}
              </motion.div>
            )}

            {generatedQuestions.length > 0 && (
              <motion.div
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-12"
              >
                <div className="flex items-center justify-between border-b-2 border-brand-ink pb-4">
                  <div>
                    <h3 className="text-2xl font-black tracking-tight">생성된 문제 세트</h3>
                    <p className="text-sm text-gray-500 font-bold mt-1">총 {generatedQuestions.length}문항 | {grade} {subject}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 border-2 border-brand-ink bg-white text-xs font-black uppercase">전체 PDF</button>
                    <button className="px-4 py-2 bg-brand-ink text-white text-xs font-black uppercase">모두 저장</button>
                  </div>
                </div>

                <div className="space-y-8">
                  {generatedQuestions.map((q, qIdx) => (
                    <div key={qIdx} className="bg-white border-2 border-brand-ink p-10 relative flex flex-col shadow-[8px_8px_0px_rgba(0,0,0,0.05)]">
                      <div className="absolute -top-3 left-6 bg-brand-ink text-white px-4 py-1.5 text-[12px] font-black tracking-widest">
                        Q. {qIdx + 1}
                      </div>
                      
                      <div className="text-[13px] font-black text-brand-primary mb-6 flex items-center gap-2">
                        <span className="uppercase tracking-widest">{difficulty}</span>
                        <span className="w-1 h-1 bg-brand-border rounded-full" />
                        <span className="text-gray-400">{unit}</span>
                      </div>

                      <div className="space-y-8">
                        <h3 className="text-2xl font-black text-brand-ink leading-snug whitespace-pre-wrap">
                          {q.text}
                        </h3>

                        {q.imagePrompt && (
                          <div className="w-full aspect-video bg-brand-bg border-2 border-dashed border-brand-border flex items-center justify-center relative overflow-hidden group">
                            {q.imageUrl ? (
                              <img 
                                src={q.imageUrl} 
                                alt="AI Illustration" 
                                className="w-full h-full object-contain"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-3 text-gray-400 italic">
                                <Loader2 className="w-8 h-8 animate-spin" />
                                <span className="text-sm font-bold shrink-0">이미지 제작 중...</span>
                              </div>
                            )}
                          </div>
                        )}

                        {q.options && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {q.options.map((opt, idx) => {
                              const isSelected = userAnswers[qIdx] === opt;
                              const isCorrect = opt === q.answer;
                              const hasAnswered = !!userAnswers[qIdx];
                              
                              let buttonClass = "p-5 border-2 transition-all font-bold text-brand-ink flex items-center gap-4 text-left ";
                              let labelClass = "w-8 h-8 flex items-center justify-center text-sm font-black shrink-0 transition-colors ";

                              if (!hasAnswered) {
                                buttonClass += "border-brand-border hover:border-brand-ink bg-white active:scale-[0.98]";
                                labelClass += "bg-brand-ink text-white";
                              } else {
                                if (isCorrect) {
                                  buttonClass += "border-green-500 bg-green-50 ring-2 ring-green-200";
                                  labelClass += "bg-green-500 text-white";
                                } else if (isSelected) {
                                  buttonClass += "border-red-500 bg-red-50 ring-2 ring-red-200";
                                  labelClass += "bg-red-500 text-white";
                                } else {
                                  buttonClass += "border-brand-border bg-gray-50 opacity-50";
                                  labelClass += "bg-gray-300 text-white";
                                }
                              }

                              return (
                                <button
                                  key={idx}
                                  onClick={() => handleSelectAnswer(qIdx, opt)}
                                  disabled={hasAnswered}
                                  className={buttonClass}
                                >
                                  <span className={labelClass}>
                                    {idx + 1}
                                  </span>
                                  <span className="flex-1">{opt}</span>
                                  {hasAnswered && isCorrect && <CheckCircle2 className="w-6 h-6 text-green-500" />}
                                  {hasAnswered && isSelected && !isCorrect && <AlertCircle className="w-6 h-6 text-red-500" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <AnimatePresence>
                        {userAnswers[qIdx] && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-10 pt-10 border-t-2 border-brand-bg space-y-6 overflow-hidden"
                          >
                            <div className="flex items-center gap-4 mb-4">
                              {userAnswers[qIdx] === q.answer ? (
                                <div className="flex items-center gap-2 text-green-600 font-black text-xl italic">
                                  <CheckCircle2 className="w-8 h-8" />
                                  정답입니다!
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-red-600 font-black text-xl italic">
                                  <AlertCircle className="w-8 h-8" />
                                  다시 한 번 생각해 보세요.
                                </div>
                              )}
                            </div>

                            <div className="flex items-start gap-4">
                              <div className="px-3 py-1 bg-brand-secondary text-brand-ink text-[11px] font-black uppercase border-2 border-brand-ink">
                                ANSWER
                              </div>
                              <p className="text-xl font-black text-brand-primary">{q.answer}</p>
                            </div>

                            <div className="flex items-start gap-4">
                              <div className="px-3 py-1 bg-gray-100 text-gray-600 text-[11px] font-black uppercase border-2 border-gray-200">
                                EXPLAIN
                              </div>
                              <p className="text-gray-600 font-medium leading-relaxed text-sm whitespace-pre-wrap">{q.explanation}</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>


      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
