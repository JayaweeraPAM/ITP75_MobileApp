/**
 * Admin Quiz Management Component
 * Allows creating, editing, and deleting examinations with diagnostic questions.
 * Integrated with academic subject hierarchy and professional UI styling.
 */
import { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Pencil, Check, X, ChevronRight, BookOpen, Clock, 
  HelpCircle, ChevronDown, Save, ArrowLeft, Search, Filter, Layers, Layout, Target, Zap, AlertCircle, Activity, GraduationCap
} from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../contexts/ThemeContext';
import { getMasterSubjects } from '../data/subjectsStore';
import { getQuizzes, saveQuizzes, Quiz, Question } from '../data/quizzesStore';
import { adminBackendApi } from '../utils/adminApi';

export function AdminQuizManagement() {
  const { isDark } = useTheme();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('');
  const [timeLimit, setTimeLimit] = useState(20);

  // Question State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState(0);
  const [qExp, setQExp] = useState('');

  const subjectsData = getMasterSubjects();

  useEffect(() => {
    // Load quizzes from backend; fall back to localStorage cache if offline
    adminBackendApi.getQuizzes()
      .then((res: any) => {
        const dbQuizzes: Quiz[] = res?.quizzes || [];
        setQuizzes(dbQuizzes);
        saveQuizzes(dbQuizzes); // keep localStorage in sync
      })
      .catch(() => {
        // Backend unreachable — use local cache
        setQuizzes(getQuizzes());
      });
  }, []);

  const cellStyle = isDark
    ? { background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)' }
    : { background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(108,99,255,0.15)' };

  const inputStyle = isDark
    ? { border: '1px solid rgba(255,255,255,0.1)', color: '#E8E8F0', borderRadius: '1rem', padding: '12px 16px', fontSize: '14px', outline: 'none', background: 'rgba(0,0,0,0.2)', width: '100%' }
    : { border: '1px solid rgba(108,99,255,0.2)', color: '#0f0e1a', borderRadius: '1rem', padding: '12px 16px', fontSize: '14px', outline: 'none', background: 'white', width: '100%' };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSubject('');
    setCategory('');
    setTimeLimit(20);
    setQuestions([]);
    setQText('');
    setQOptions(['', '', '', '']);
    setQCorrect(0);
    setQExp('');
    setIsCreating(false);
    setEditingQuiz(null);
  };

  const handleAddQuestion = () => {
    if (!qText || qOptions.some(o => !o)) {
      toast.error('Question text and all options are required.');
      return;
    }
    const newQ: Question = {
      id: crypto.randomUUID(),
      text: qText,
      type: 'MCQ',
      options: [...qOptions],
      correctAnswer: qCorrect,
      explanation: qExp
    };
    setQuestions([...questions, newQ]);
    setQText('');
    setQOptions(['', '', '', '']);
    setQCorrect(0);
    setQExp('');
    toast.success('Question added to examination.');
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleCreate = () => {
    if (!title || !subject) {
      toast.error('Assessment Protocol Error: Missing required structural data (Title or Subject).');
      return;
    }
    const newQuiz: Quiz = {
      id: crypto.randomUUID(), title, description, subject, category, timeLimit, questions,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    const next = [...quizzes, newQuiz];
    saveQuizzes(next);
    setQuizzes(next);
    adminBackendApi.saveQuizzes(next).catch(() => toast.error('Failed to sync quiz to database'));
    resetForm();
    toast.success('Examination module deployed successfully!');
  };

  const handleUpdate = () => {
    if (!editingQuiz) return;
    const updated: Quiz = {
      ...editingQuiz, title, description, subject, category, timeLimit, questions,
      updatedAt: new Date().toISOString()
    };
    const next = quizzes.map(q => q.id === updated.id ? updated : q);
    saveQuizzes(next);
    setQuizzes(next);
    adminBackendApi.saveQuizzes(next).catch(() => toast.error('Failed to sync quiz to database'));
    resetForm();
    toast.success('Examination module updated successfully!');
  };

  const handleDelete = (id: string) => {
    if (!confirm('Permanently purge this examination from the assessment deck?')) return;
    const next = quizzes.filter(q => q.id !== id);
    saveQuizzes(next);
    setQuizzes(next);
    adminBackendApi.saveQuizzes(next).catch(() => toast.error('Failed to sync deletion to database'));
    toast.success('Examination purged.');
  };

  const handleGenerateAll = () => {
    if (!confirm('This will auto-generate base quizzes (with 5 questions each) for EVERY subject across ALL academic tiers. Proceed?')) return;
    
    let currentQuizzes = [...quizzes];
    const newQuizzes: Quiz[] = [];
    let count = 0;
    
    for (const cat of subjectsData.categories) {
      const subjects = subjectsData.subjectsByCategory[cat.value] || [];
      for (const s of subjects) {
        // Remove old baseline assessment if it exists so it can be upgraded to the new syllabus-aware version
        currentQuizzes = currentQuizzes.filter(q => !(q.category === cat.value && q.subject === s && q.title.includes('Standard Assessment')));
        
        // If a CUSTOM quiz exists for this subject, skip standard generation to preserve their work
        if (currentQuizzes.some(q => q.category === cat.value && q.subject === s)) continue;

        // Dynamic grading logic
        const isAL = cat.value.includes('al');
        const isOL = cat.value.includes('ol');
        const isMid = cat.value.includes('grade-6') || cat.value.includes('grade-7') || cat.value.includes('grade-8') || cat.value.includes('grade-9');
        let diff = "Primary Level";
        if (isAL) diff = "Advanced Level";
        else if (isOL) diff = "Ordinary Level";
        else if (isMid) diff = "Middle School";

        const lowerSub = s.toLowerCase();
        
        const syllabusData: Record<string, {q:string, a:string[], c:number}[]> = {
          "Advanced Level_math": [
            { q: "Evaluate the definite integral of x² dx from 0 to 3.", a: ["9", "27", "3", "6"], c: 0 },
            { q: "Solve the differential equation dy/dx = ky.", a: ["y = y₀e^(kx)", "y = kx²", "y = sin(kx)", "y = ln(kx)"], c: 0 },
            { q: "Find the dot product of vectors (2i + 3j) and (i - j).", a: ["-1", "1", "5", "0"], c: 0 },
            { q: "Determine the limit as x→0 of sin(3x)/x.", a: ["3", "1", "0", "Undefined"], c: 0 },
            { q: "What is the derivative of x² * e^x?", a: ["xe^x(x + 2)", "2xe^x", "e^x", "x²e^x + 2x"], c: 0 }
          ],
          "Advanced Level_bio": [
            { q: "Which process creates a proton gradient in the mitochondrion?", a: ["Electron Transport Chain", "Krebs Cycle", "Glycolysis", "Fermentation"], c: 0 },
            { q: "What is the primary function of the Loop of Henle?", a: ["Water reabsorption", "Filtration", "Secretion", "Protein synthesis"], c: 0 },
            { q: "Which hormone is primarily responsible for phototropism?", a: ["Auxin", "Gibberellin", "Cytokinin", "Abscisic Acid"], c: 0 },
            { q: "Identify the complementary RNA strand to DNA sequence ATCG.", a: ["UAGC", "TAGC", "AUCG", "UACG"], c: 0 },
            { q: "What enzyme links Okazaki fragments?", a: ["DNA Ligase", "Helicase", "Polymerase III", "Primase"], c: 0 }
          ],
          "Ordinary Level_sci": [
            { q: "What is the chemical formula for sulfuric acid?", a: ["H₂SO₄", "HCl", "HNO₃", "H₂O"], c: 0 },
            { q: "According to Newton's Second Law, Force equals:", a: ["Mass × Acceleration", "Mass × Velocity", "Work ÷ Time", "Pressure × Area"], c: 0 },
            { q: "Which organ pumps oxygenated blood to the body?", a: ["Heart", "Lungs", "Brain", "Liver"], c: 0 },
            { q: "What is the SI unit of electrical resistance?", a: ["Ohm", "Ampere", "Volt", "Watt"], c: 0 },
            { q: "Which process do plants use to synthesize food?", a: ["Photosynthesis", "Respiration", "Transpiration", "Osmosis"], c: 0 }
          ],
          "Middle School_eng": [
            { q: "Choose the correct synonym for 'Rapid'.", a: ["Fast", "Slow", "Steady", "Heavy"], c: 0 },
            { q: "Identify the adjective in: 'The red car sped away.'", a: ["red", "car", "sped", "away"], c: 0 },
            { q: "What is the past tense of 'Go'?", a: ["Went", "Going", "Gone", "Goes"], c: 0 },
            { q: "Which sentence is grammatically correct?", a: ["She is running.", "She are running.", "She running.", "She do running."], c: 0 },
            { q: "A 'noun' is a word that names a:", a: ["Person, place, or thing", "Action", "Description", "Joining word"], c: 0 }
          ],
          "Primary Level_math": [
            { q: "What is 5 + 3?", a: ["8", "7", "6", "9"], c: 0 },
            { q: "Which number is smaller: 12 or 8?", a: ["8", "12", "Neither", "Both"], c: 0 },
            { q: "If you have 4 apples and get 2 more, how many total?", a: ["6", "4", "2", "8"], c: 0 },
            { q: "What shape has exactly 3 sides?", a: ["Triangle", "Square", "Circle", "Rectangle"], c: 0 },
            { q: "What is 10 - 4?", a: ["6", "5", "14", "7"], c: 0 }
          ]
        };

        // Attempt to find a match in syllabusData
        let key = "";
        if (diff === "Advanced Level") {
           if (lowerSub.includes('math')) key = "Advanced Level_math";
           else if (lowerSub.includes('bio')) key = "Advanced Level_bio";
        } else if (diff === "Ordinary Level") {
           if (lowerSub.includes('sci') || lowerSub.includes('che') || lowerSub.includes('phy')) key = "Ordinary Level_sci";
        } else if (diff === "Middle School") {
           if (lowerSub.includes('eng')) key = "Middle School_eng";
        } else {
           if (lowerSub.includes('math')) key = "Primary Level_math";
        }

        const exactSyllabus = syllabusData[key];

        const mockQuestions: Question[] = [];
        for (let i = 0; i < 5; i++) {
           if (exactSyllabus && exactSyllabus[i]) {
             mockQuestions.push({
               id: crypto.randomUUID(),
               text: exactSyllabus[i].q,
               type: 'MCQ',
               options: exactSyllabus[i].a,
               correctAnswer: exactSyllabus[i].c,
               explanation: `This aligns with the ${diff} syllabus requirements for ${s}.`
             });
           } else {
             // Fallback for subjects without hardcoded mock mapping
             mockQuestions.push({
               id: crypto.randomUUID(),
               text: `[${diff}] Question ${i+1}: Identify the correct concept for ${s} at the ${cat.label} level.`,
               type: 'MCQ',
               options: ['Correct Concept', 'Common Misconception', 'Distractor Option', 'Incorrect Application'],
               correctAnswer: 0,
               explanation: `Standard syllabus evaluation for ${s} (${cat.label}).`
             });
           }
        }

        newQuizzes.push({
           id: crypto.randomUUID(),
           title: `${s} Standard Assessment`,
           description: `System-generated baseline evaluation encompassing level-appropriate topics in ${s} for ${cat.label}.`,
           subject: s,
           category: cat.value,
           timeLimit: 30,
           questions: mockQuestions,
           createdAt: new Date().toISOString(),
           updatedAt: new Date().toISOString()
        });
        count++;
      }
    }

    if (count === 0) {
      toast.info('All subjects already have baseline quizzes mapped. No new deployments needed.');
      return;
    }

    const nextState = [...currentQuizzes, ...newQuizzes];
    saveQuizzes(nextState);
    setQuizzes(nextState);
    toast.success(`Successfully autogenerated ${count} new examinations!`);
  };

  const handleEdit = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setTitle(quiz.title);
    setDescription(quiz.description);
    setSubject(quiz.subject);
    setCategory(quiz.category);
    setTimeLimit(quiz.timeLimit);
    setQuestions(quiz.questions || []);
    setIsCreating(true);
  };

  const filteredQuizzes = quizzes.filter(q => 
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Advanced Tier Metadata Logic (Using simpler Tailwind classes to avoid PostCSS transform crashes)
  const getTierMetadata = (label: string) => {
    const l = (label || '').toUpperCase();
    if (l.includes('A/L')) return { color: 'rose', tailwind: 'rose', shadow: 'shadow-rose-500/20' };
    if (l.includes('O/L')) return { color: 'blue', tailwind: 'blue', shadow: 'shadow-blue-500/20' };
    if (l.includes('GRADE 11') || l.includes('GRADE 10')) return { color: 'amber', tailwind: 'amber', shadow: 'shadow-amber-500/20' };
    if (l.includes('GRADE 6') || l.includes('GRADE 7') || l.includes('GRADE 8') || l.includes('GRADE 9')) return { color: 'indigo', tailwind: 'indigo', shadow: 'shadow-indigo-500/20' };
    if (l.includes('GRADE') || l.includes('PRIMARY')) return { color: 'emerald', tailwind: 'emerald', shadow: 'shadow-emerald-500/20' };
    return { color: 'blue', tailwind: 'blue', shadow: 'shadow-blue-500/20' };
  };

  const activeTierMeta = category ? getTierMetadata(subjectsData.categories.find(c => c.value === category)?.label || '') : null;

  if (isCreating) {
    return (
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Editor Command Bar */}
        <div className="flex items-center justify-between">
          <button onClick={resetForm} className="group flex items-center gap-3 text-gray-400 font-black uppercase text-[10px] tracking-[0.3em] hover:text-white transition-all">
            <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center transition-all group-hover:scale-110 group-hover:-translate-x-1"><ArrowLeft className="w-4 h-4" /></div> Assessment Hub
          </button>
          <div className="flex gap-4">
            <button onClick={editingQuiz ? handleUpdate : handleCreate} className="px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black uppercase text-xs rounded-2xl shadow-[0_20px_50px_rgba(59,130,246,0.3)] hover:scale-105 active:scale-95 transition-all border border-blue-400/50">
              {editingQuiz ? 'Finalize Updates' : 'Deploy Examination'}
            </button>
          </div>
        </div>

        {/* Structural Blueprint */}
        <div className="rounded-[4rem] p-12 shadow-3xl border border-white/5 relative overflow-hidden group/essence" style={cellStyle}>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] -mr-64 -mt-64 transition-colors group-hover/essence:bg-blue-500/10 opacity-40" />
          
          <div className="flex items-center justify-between mb-12 relative z-10">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-3xl bg-blue-600 flex items-center justify-center text-white shadow-2xl rotate-12 group-hover/essence:rotate-0 transition-transform duration-700"><Layout className="w-7 h-7" /></div>
              <div>
                <h3 className="font-black text-lg text-white uppercase tracking-[0.2em]">Examination Architecture</h3>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] mt-1">Academic Blueprinting Phase</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 px-5 py-2 rounded-2xl bg-white/5 border border-white/10">
               <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
               <span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest">Protocol Verified</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
            <div className="space-y-4">
              <label className="text-[11px] font-black uppercase text-blue-500 tracking-[0.4em] ml-2 flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" /> Assessment Title</label>
              <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Master Classical Mechanics v2.0" className="focus:border-blue-500/50 transition-all text-lg font-black h-16 shadow-inner" />
            </div>
            
            <div className="space-y-4">
              <label className="text-[11px] font-black uppercase text-emerald-500 tracking-[0.4em] ml-2 flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Duration Window (MIN)</label>
              <div className="relative">
                <Clock className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-emerald-500" />
                <input type="number" style={{ ...inputStyle, paddingLeft: '70px' }} value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))} className="focus:border-emerald-500/50 transition-all font-mono text-2xl h-16 shadow-inner" />
              </div>
            </div>

            <div className="space-y-4 lg:col-span-2">
              <label className="text-[11px] font-black uppercase text-gray-500 tracking-[0.4em] ml-2 flex items-center gap-3"><BookOpen className="w-4 h-4" /> Academic Overview</label>
              <textarea style={{ ...inputStyle, height: '140px' }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the tactical academic vector of this examination..." className="focus:border-blue-500/30 transition-all italic text-gray-400 leading-relaxed p-6" />
            </div>

            {/* Premium Category Selector (Tiers) */}
            <div className="space-y-8 lg:col-span-2">
              <label className="text-[11px] font-black uppercase text-blue-400 tracking-[0.5em] ml-2 flex items-center gap-4"><Target className="w-5 h-5" /> Target Academic Tiers</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-6">
                 {subjectsData.categories.map(c => {
                   const isActive = category === c.value;
                   const meta = getTierMetadata(c.label);
                   
                   // Dynamic Tailwind Class mappings to avoid arbitrary value failure
                   const colors: Record<string, string> = {
                     rose: 'text-rose-500 bg-rose-500/10 border-rose-500/40 shadow-rose-500/20',
                     blue: 'text-blue-500 bg-blue-500/10 border-blue-500/40 shadow-blue-500/20',
                     amber: 'text-amber-500 bg-amber-500/10 border-amber-500/40 shadow-amber-500/20',
                     indigo: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/40 shadow-indigo-500/20',
                     emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/40 shadow-emerald-500/20'
                   };
                   const bgColors: Record<string, string> = {
                     rose: 'bg-rose-500', blue: 'bg-blue-500', amber: 'bg-amber-500', indigo: 'bg-indigo-500', emerald: 'bg-emerald-500'
                   };

                   return (
                     <button 
                        key={c.value} 
                        onClick={() => { setCategory(c.value); setSubject(''); }}
                        className={`group p-6 rounded-[2.5rem] border-2 transition-all duration-700 flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden ${isActive ? colors[meta.tailwind] + ' scale-110 shadow-3xl' : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:border-white/20 hover:scale-105 opacity-100'}`}
                     >
                        <div className={`w-14 h-14 rounded-3xl flex items-center justify-center font-black text-lg transition-all duration-700 ${isActive ? `${bgColors[meta.tailwind]} text-slate-950 rotate-6` : 'bg-white/5 text-gray-600 group-hover:rotate-6 group-hover:text-white'}`}>{c.label.charAt(0)}</div>
                        <span className="text-[11px] font-black uppercase tracking-[0.2em]">{c.label}</span>
                        {isActive && <div className={`absolute inset-x-0 bottom-0 h-1.5 ${bgColors[meta.tailwind]} animate-pulse`} />}
                        {!isActive && <div className={`absolute inset-x-0 bottom-0 h-1 ${bgColors[meta.tailwind]} opacity-0 group-hover:opacity-40 transition-opacity`} />}
                     </button>
                   );
                 })}
              </div>
            </div>

            {/* Premium Subject Selector (Domain) */}
            {category && activeTierMeta && (
              <div className="space-y-8 lg:col-span-2 animate-in fade-in slide-in-from-top-6 duration-700">
                <label className={`text-[11px] font-black uppercase tracking-[0.5em] ml-2 flex items-center gap-4 ${activeTierMeta.tailwind === 'rose' ? 'text-rose-400' : activeTierMeta.tailwind === 'blue' ? 'text-blue-400' : activeTierMeta.tailwind === 'amber' ? 'text-amber-400' : activeTierMeta.tailwind === 'indigo' ? 'text-indigo-400' : 'text-emerald-400'}`}><Zap className="w-5 h-5 fill-current" /> Examination Subject Domain</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                   {(subjectsData.subjectsByCategory[category] || []).map(s => {
                     const isActive = subject === s;
                     const t = activeTierMeta.tailwind;
                     
                     // Direct mapping for unselected/selected
                     let activeClass = '';
                     if (t === 'rose') activeClass = 'bg-rose-500/20 border-rose-500 text-white shadow-rose-500/20 shadow-xl';
                     else if (t === 'blue') activeClass = 'bg-blue-500/20 border-blue-500 text-white shadow-blue-500/20 shadow-xl';
                     else if (t === 'amber') activeClass = 'bg-amber-500/20 border-amber-500 text-white shadow-amber-500/20 shadow-xl';
                     else if (t === 'indigo') activeClass = 'bg-indigo-500/20 border-indigo-500 text-white shadow-indigo-500/20 shadow-xl';
                     else activeClass = 'bg-emerald-500/20 border-emerald-500 text-white shadow-emerald-500/20 shadow-xl';

                     const hoverClass = t === 'rose' ? 'hover:border-rose-500/30 hover:bg-rose-500/5' : t === 'blue' ? 'hover:border-blue-500/30 hover:bg-blue-500/5' : t === 'amber' ? 'hover:border-amber-500/30 hover:bg-amber-500/5' : t === 'indigo' ? 'hover:border-indigo-500/30 hover:bg-indigo-500/5' : 'hover:border-emerald-500/30 hover:bg-emerald-500/5';

                     return (
                       <button 
                        key={s} 
                        onClick={() => setSubject(s)}
                        className={`group p-6 rounded-[2.5rem] border-2 transition-all duration-500 flex items-center gap-5 ${isActive ? `${activeClass} scale-105` : `bg-white/5 border-white/5 text-gray-400 hover:text-white ${hoverClass}`}`}
                       >
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-700 ${isActive ? `bg-white text-slate-950 scale-110 shadow-xl` : 'bg-white/5 group-hover:scale-110 group-hover:bg-white/10'}`}><Zap className="w-6 h-6 flex-shrink-0" /></div>
                          <span className="text-[14px] font-black uppercase tracking-tight text-left leading-tight group-hover:translate-x-1 transition-transform">{s}</span>
                       </button>
                     );
                   })}
                   {(subjectsData.subjectsByCategory[category] || []).length === 0 && (
                     <div className="col-span-full p-20 rounded-[3rem] border-4 border-dashed border-white/5 text-center text-gray-800 font-black uppercase text-xs tracking-widest bg-white/[0.01]">no subject logic maps identified. sync master data.</div>
                   )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Question Bank Registry */}
        <div className="rounded-[4rem] p-12 shadow-3xl border border-white/5 relative overflow-hidden group/essence" style={cellStyle}>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] -mr-64 -mt-64 transition-colors group-hover/essence:bg-indigo-500/10 opacity-40" />
          
          <div className="flex items-center justify-between mb-12 relative z-10">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-3xl bg-indigo-600 flex items-center justify-center text-white shadow-2xl -rotate-12 group-hover/essence:rotate-0 transition-transform duration-700"><Layers className="w-7 h-7" /></div>
              <div>
                <h3 className="font-black text-lg text-white uppercase tracking-[0.2em]">Question Bank Registry</h3>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] mt-1">Add Diagnostic Items</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 px-5 py-2 rounded-2xl bg-white/5 border border-white/10">
               <span className="text-[9px] font-black uppercase text-indigo-400 tracking-widest">{questions.length} Items Indexed</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
            <div className="space-y-4 lg:col-span-2">
              <label className="text-[11px] font-black uppercase text-indigo-400 tracking-[0.4em] ml-2">Question Text</label>
              <textarea style={{ ...inputStyle, height: '100px' }} value={qText} onChange={e => setQText(e.target.value)} placeholder="Enter the diagnostic question..." className="focus:border-indigo-500/50 transition-all font-medium text-white p-4" />
            </div>

            <div className="space-y-4 lg:col-span-2">
              <label className="text-[11px] font-black uppercase text-indigo-400 tracking-[0.4em] ml-2">Options</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {qOptions.map((opt, idx) => (
                  <div key={idx} className="relative group">
                    <input style={inputStyle} value={opt} onChange={e => {
                      const next = [...qOptions];
                      next[idx] = e.target.value;
                      setQOptions(next);
                    }} placeholder={`Option ${idx + 1}`} className={`focus:border-indigo-500/50 transition-all text-white h-14 pl-12 pr-12 ${qCorrect === idx ? 'border-emerald-500 bg-emerald-500/5' : ''}`} />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-gray-500 tracking-widest group-hover:text-indigo-400 transition-colors">
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <button onClick={() => setQCorrect(idx)} className={`absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${qCorrect === idx ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-110' : 'bg-white/5 text-gray-600 hover:bg-emerald-500/20 hover:text-emerald-400'}`}>
                      {qCorrect === idx ? <Check className="w-4 h-4" /> : <div className="w-2 h-2 rounded-full bg-current" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 lg:col-span-2">
              <label className="text-[11px] font-black uppercase text-gray-500 tracking-[0.4em] ml-2">Explanation Logic (Optional)</label>
              <textarea style={{ ...inputStyle, height: '80px' }} value={qExp} onChange={e => setQExp(e.target.value)} placeholder="Provide reasoning for the correct answer..." className="focus:border-indigo-500/30 transition-all text-gray-400 text-sm p-4" />
            </div>

            <div className="lg:col-span-2 pt-4">
              <button onClick={handleAddQuestion} className="w-full py-5 bg-white/5 hover:bg-indigo-600 border-2 border-indigo-500/30 hover:border-indigo-500 text-indigo-400 hover:text-white font-black uppercase text-xs tracking-widest rounded-3xl transition-all shadow-xl flex items-center justify-center gap-3 group">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center group-hover:rotate-90 transition-transform"><Plus className="w-5 h-5" /></div>
                Append to Database
              </button>
            </div>
          </div>

          {/* List of existing questions */}
          {questions.length > 0 && (
            <div className="mt-12 space-y-4 relative z-10 border-t border-white/10 pt-8">
              <h4 className="text-[11px] font-black uppercase text-gray-400 tracking-[0.4em] mb-6">Indexed Items</h4>
              {questions.map((q, i) => (
                <div key={q.id} className="p-6 rounded-3xl border border-white/5 bg-white/5 flex items-start gap-4 group/q">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center font-black text-gray-400 group-hover/q:bg-indigo-500 group-hover/q:text-white transition-all flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white mb-3 text-sm leading-relaxed">{q.text}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className={`px-4 py-2 rounded-xl text-xs flex items-center gap-2 ${q.correctAnswer === oIdx ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold' : 'bg-white/5 border border-white/5 text-gray-400'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${q.correctAnswer === oIdx ? 'bg-emerald-500' : 'bg-gray-600'}`} />
                          <span className="truncate">{opt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => handleRemoveQuestion(q.id)} className="w-10 h-10 rounded-2xl bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white flex items-center justify-center flex-shrink-0 transition-all opacity-0 group-hover/q:opacity-100 border border-rose-500/20">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-16 animate-in fade-in duration-1000">
      {/* Examination Command Center Bar */}
      <div className="flex flex-col md:flex-row gap-10 items-center justify-between">
        <div className="relative group/search max-w-2xl w-full">
          <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 rounded-3xl blur opacity-0 group-focus-within/search:opacity-40 transition-opacity animate-shimmer-slow px-1" />
          <div className="relative flex items-center bg-slate-900 border border-white/10 rounded-[2rem] px-8 py-5 shadow-3xl overflow-hidden">
            <Search className="w-8 h-8 text-gray-700 mr-5" />
            <input 
              style={{ ...inputStyle, border: 'none', background: 'transparent', height: '40px', fontSize: '18px' }} 
              placeholder="Search Examination Registry..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="placeholder:text-gray-800 font-black uppercase tracking-tighter"
            />
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-20" />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <button onClick={() => setIsCreating(true)} className="px-10 py-6 bg-white text-slate-950 font-black uppercase text-xs rounded-3xl shadow-[0_40px_80px_-15px_rgba(255,255,255,0.25)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4 group relative overflow-hidden">
            <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-5 transition-opacity" />
            <div className="w-10 h-10 rounded-2xl bg-slate-950 text-white flex items-center justify-center group-hover:rotate-180 transition-all duration-700 shadow-2xl flex-shrink-0"><Plus className="w-6 h-6 stroke-[4]" /></div> 
            Create New Examination
          </button>
        </div>
      </div>

      {/* Examination Registry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {filteredQuizzes.map(quiz => {
          const meta = getTierMetadata(quiz.category || '');
          const glowCol = meta.tailwind === 'rose' ? 'bg-rose-500' : meta.tailwind === 'blue' ? 'bg-blue-500' : meta.tailwind === 'amber' ? 'bg-amber-500' : meta.tailwind === 'indigo' ? 'bg-indigo-500' : 'bg-emerald-500';
          const badgeCol = meta.tailwind === 'rose' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : meta.tailwind === 'blue' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : meta.tailwind === 'amber' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : meta.tailwind === 'indigo' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

          return (
            <div key={quiz.id} className="rounded-[4.5rem] p-12 shadow-3xl border border-white/5 transition-all hover:border-blue-500/50 hover:-translate-y-6 group relative overflow-hidden" style={cellStyle}>
              <div className={`absolute top-0 right-0 w-64 h-64 blur-[100px] -mr-32 -mt-32 transition-all duration-1000 opacity-20 group-hover:opacity-60 ${glowCol}`} />
              
              <div className="flex items-start justify-between mb-10 relative z-10">
                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                     <div className={`w-3 h-3 rounded-full animate-pulse shadow-[0_0_15px_current] ${meta.tailwind === 'rose' ? 'text-rose-500 bg-rose-500' : meta.tailwind === 'blue' ? 'text-blue-500 bg-blue-500' : meta.tailwind === 'amber' ? 'text-amber-500 bg-amber-500' : meta.tailwind === 'indigo' ? 'text-indigo-500 bg-indigo-500' : 'text-emerald-500 bg-emerald-500'}`} />
                     <span className={`text-[11px] font-black uppercase tracking-[0.4em] px-6 py-2 rounded-full border-2 ${badgeCol}`}>
                       {quiz.subject}
                     </span>
                     {quiz.category && <span className="text-[10px] font-black text-gray-700 uppercase tracking-[0.5em] px-2">{quiz.category}</span>}
                </div>
                <h3 className="text-2xl font-bold text-white">{quiz.title}</h3>
              </div>
              <div className="flex flex-col gap-4 opacity-0 group-hover:opacity-100 transition-all translate-x-12 group-hover:translate-x-0">
                <button onClick={() => handleEdit(quiz)} className="w-14 h-14 rounded-[1.75rem] bg-indigo-600/10 hover:bg-indigo-600 hover:text-white text-indigo-400 transition-all border border-indigo-500/20 flex items-center justify-center shadow-2xl hover:scale-110"><Pencil className="w-6 h-6" /></button>
                <button onClick={() => handleDelete(quiz.id)} className="w-14 h-14 rounded-[1.75rem] bg-rose-500/5 hover:bg-rose-500 hover:text-white text-rose-500 transition-all border border-rose-500/10 flex items-center justify-center shadow-2xl hover:scale-110"><Trash2 className="w-6 h-6" /></button>
              </div>
            </div>

            <p className="text-[17px] text-gray-500 line-clamp-2 italic mb-12 min-h-[52px] leading-relaxed relative z-10 opacity-70 group-hover:opacity-100 transition-opacity">{quiz.description || 'Academic summary indicates a specialized inquiry domain requiring localized descriptive strings.'}</p>
            
            <div className="flex items-center gap-12 pt-12 border-t border-white/5 relative z-10">
              <div className="flex items-center gap-5 group/st">
                <div className="w-14 h-14 rounded-3xl bg-white/5 flex items-center justify-center text-gray-700 transition-all duration-700 group-hover/st:bg-blue-600 group-hover/st:text-white group-hover/st:rotate-12"><HelpCircle className="w-7 h-7" /></div>
                <div>
                  <div className="text-[10px] font-black uppercase text-gray-800 leading-none tracking-[0.3em] mb-1">Items</div>
                  <div className="text-xl font-black text-white">{quiz.questions.length} Units</div>
                </div>
              </div>
              <div className="flex items-center gap-5 group/st">
                <div className="w-14 h-14 rounded-3xl bg-white/5 flex items-center justify-center text-gray-700 transition-all duration-700 group-hover/st:bg-indigo-600 group-hover/st:text-white group-hover/st:-rotate-12"><Clock className="w-7 h-7" /></div>
                <div>
                  <div className="text-[10px] font-black uppercase text-gray-800 leading-none tracking-[0.3em] mb-1">Time Logic</div>
                  <div className="text-xl font-black text-white">{quiz.timeLimit} Min</div>
                </div>
              </div>
              <div className="flex-1" />
              <button 
                onClick={() => handleEdit(quiz)}
                className="w-20 h-20 rounded-[2.5rem] bg-gradient-to-br from-blue-700 to-indigo-900 text-white flex items-center justify-center hover:scale-110 active:scale-90 transition-all shadow-[0_25px_50px_rgba(59,130,246,0.4)] border border-blue-400/30 group/btn"
              >
                <ChevronRight className="w-10 h-10 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        );
        })}

        {filteredQuizzes.length === 0 && (
          <div className="lg:col-span-2 py-48 rounded-[6rem] border-8 border-dashed border-white/5 flex flex-col items-center justify-center text-center px-16 relative overflow-hidden bg-white/[0.01] animate-pulse">
            <div className="w-32 h-32 rounded-[3.5rem] bg-white/5 flex items-center justify-center mb-12 shadow-inner"><Activity className="w-16 h-16 text-gray-800" /></div>
            <h4 className="text-4xl font-black text-white uppercase tracking-[0.6em] mb-8 opacity-20">Examination Registry Empty</h4>
            <p className="text-[16px] text-gray-700 max-w-2xl italic leading-relaxed">The examination command terminal identifies no active assessments matching your tactical search parameters. Initiate a 'Create New Examination' sequence to populate the grid.</p>
          </div>
        )}
      </div>
      <style>{`
        @keyframes shimmer-slow { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .animate-shimmer-slow { background-size: 200% auto; animation: shimmer-slow 6s linear infinite; }
      `}</style>
    </div>
  );
}
