(function () {
    "use strict";

    if (!window.__LUMINOVA) return;
    const { useState, useEffect, useMemo, useCallback } = window.React;
    const html = window.htm.bind(window.React.createElement);
    const Luminova = window.__LUMINOVA;

Luminova.Pages.AdminCMS = ({ data, setData, lang, goBack }) => {
        const validTabs = ['news', 'years', 'semesters', 'subjects', 'students', 'summaries', 'quizzes', 'certificates'];
        const [activeTab, setActiveTab] = useState('news');
        const [editingItem, setEditingItem] = useState(null);
        const [subView, setSubView] = useState(''); // '' or 'questions'
        const [qItem, setQItem] = useState(null); // Extracted dynamically to fix rules of hooks crash
        const [cmsSearchQuery, setCmsSearchQuery] = useState('');
        
        const [cmsVisibleCount, setCmsVisibleCount] = useState(15);
        const [filterYear, setFilterYear] = useState('');
        const [filterSem, setFilterSem] = useState('');
        const [filterSub, setFilterSub] = useState('');

        useEffect(() => {
            setCmsVisibleCount(['subjects', 'summaries', 'quizzes'].includes(activeTab) ? 10 : 15);
            setFilterYear('');
            setFilterSem('');
            setFilterSub('');
            setCmsSearchQuery('');

            // Lazy-load certificates.js when the certificates tab is activated
            if (activeTab === 'certificates' && !data.certificates) {
                if (window.loadCertificatesData) {
                    window.loadCertificatesData().then(certs => {
                        setData(prev => ({ ...prev, certificates: certs }));
                    });
                } else {
                    const script = document.createElement('script');
                    script.src = 'js/pages/certificate-engine.js?v=' + Date.now();
                    script.onload = () => {
                        if(window.loadCertificatesData) {
                            window.loadCertificatesData().then(certs => {
                                setData(prev => ({ ...prev, certificates: certs }));
                            });
                        }
                    };
                    document.body.appendChild(script);
                }
            }

            // Lazy-load exam.js when the quizzes tab is activated
            if (activeTab === 'quizzes' && (!data.quizzes || data.quizzes.length === 0)) {
                if (window.LUMINOVA_EXAMS && window.LUMINOVA_EXAMS.length > 0) {
                    setData(prev => ({ ...prev, quizzes: window.LUMINOVA_EXAMS }));
                } else {
                    const existing = document.querySelector('script[data-lmv-page="exam"]');
                    if (!existing) {
                        const script = document.createElement('script');
                        script.src = 'exam.js?v=2';
                        script.setAttribute('data-lmv-page', 'exam');
                        script.onload = () => {
                            setData(prev => ({ ...prev, quizzes: window.LUMINOVA_EXAMS || [] }));
                        };
                        document.body.appendChild(script);
                    }
                }
            }
        }, [activeTab]);

        const studentsWithFounder = [Luminova.FOUNDER, ...(data.students || []).filter(s => !s.isFounder)];

        // ==========================================
        // 3-PILLAR EXPORT ENGINE
        // ==========================================

        // Export 1 — data.js: core platform data ONLY (no quizzes, no certificates)
        const handleExportData = () => {
            const { certificates, quizzes, ...coreData } = data;
            const str = `window.LUMINOVA_DATA = ${JSON.stringify(coreData, null, 2)};`;
            navigator.clipboard.writeText(str).then(() => {
                alert(lang === 'ar'
                    ? '✅ تم نسخ كود data.js!\nالصق المحتوى في ملف data.js على GitHub.'
                    : '✅ Copied data.js code! Paste into data.js on GitHub.');
            });
        };

        // Export 2 — certificates.js: certificate array ONLY
        const handleExportCertificates = () => {
            const certs = data.certificates || [];
            const str = `window.LUMINOVA_CERTIFICATES = ${JSON.stringify(certs, null, 2)};`;
            navigator.clipboard.writeText(str).then(() => {
                alert(lang === 'ar'
                    ? '✅ تم نسخ كود certificates.js!\nالصق المحتوى في ملف certificates.js على GitHub.'
                    : '✅ Copied certificates.js code! Paste into certificates.js on GitHub.');
            });
        };

        // Export 3 — exam.js: quiz/exam array ONLY
        const handleExportExams = () => {
            const exams = data.quizzes || [];
            const str = `window.LUMINOVA_EXAMS = ${JSON.stringify(exams, null, 2)};`;
            navigator.clipboard.writeText(str).then(() => {
                alert(lang === 'ar'
                    ? '✅ تم نسخ كود exam.js!\nالصق المحتوى في ملف exam.js على GitHub.'
                    : '✅ Copied exam.js code! Paste into exam.js on GitHub.');
            });
        };


        const handleDelete = (collection, id) => {
            if (collection === 'years' && data.semesters.some(s => s.yearId === id)) return alert(Luminova.i18n[lang].deleteProtected);
            if (collection === 'semesters' && data.subjects.some(s => s.semesterId === id)) return alert(Luminova.i18n[lang].deleteProtected);
            if (collection === 'subjects' && (data.summaries.some(s => s.subjectId === id) || data.quizzes.some(q => q.subjectId === id))) return alert(Luminova.i18n[lang].deleteProtected);
            if (collection === 'students' && (data.summaries.some(s => s.studentId === id) || data.quizzes.some(q => (q.questions || []).some(qn => qn.studentId === id)))) return alert(Luminova.i18n[lang].deleteProtected);

            if (confirm(lang === 'ar' ? 'تأكيد الحذف؟' : 'Confirm deletion?')) {
                setData(prev => ({ ...prev, [collection]: prev[collection].filter(item => item.id !== id) }));
            }
        };

        const handleSave = () => {
            if (!editingItem) return;
            editingItem.timestamp = editingItem.timestamp || new Date().toISOString();
            setData(prev => {
                const isExisting = prev[activeTab].find(i => i.id === editingItem.id);
                const newList = isExisting
                    ? prev[activeTab].map(i => i.id === editingItem.id ? editingItem : i)
                    : [editingItem, ...prev[activeTab]];
                return { ...prev, [activeTab]: newList };
            });
            setEditingItem(null);
        };

        const handleSubSave = (newQ) => {
            const updatedQ = newQ.id ? editingItem.questions.map(q => q.id === newQ.id ? newQ : q) : [...(editingItem.questions || []), { ...newQ, id: `q_${Date.now()}` }];
            const updatedQuiz = { ...editingItem, questions: updatedQ };
            setEditingItem(updatedQuiz);
            setSubView('questionsList');

            // Auto-save question changes to DB instantly
            setData(prev => {
                const newList = prev[activeTab].map(i => i.id === updatedQuiz.id ? updatedQuiz : i);
                return { ...prev, [activeTab]: newList };
            });
        };

        const getNewTemplate = () => {
            const base = { id: `${activeTab}_${Date.now()}`, timestamp: new Date().toISOString() };
            if (activeTab === 'news') return { ...base, titleAr: '', titleEn: '', contentAr: '', contentEn: '', mediaUrl: '' };
            if (activeTab === 'students') return { ...base, nameAr: 'عبد المنعم حجاج', nameEn: 'Abdelmonem Hagag', majorAr: '', majorEn: '', bioAr: '', bioEn: '', image: '', isVIP: false, isVerified: false, role: 'student', socialLinks: { facebook: '', instagram: '', linkedin: '' } };
            if (activeTab === 'years' || activeTab === 'semesters' || activeTab === 'subjects') return { ...base, nameAr: '', nameEn: '', yearId: '', semesterId: '' };
            if (activeTab === 'summaries') return { ...base, titleAr: '', titleEn: '', contentAr: '', contentEn: '', mediaUrl: '', subjectId: '', studentId: '' };
            if (activeTab === 'quizzes') return { ...base, titleAr: '', titleEn: '', isShuffled: false, feedbackMode: 'end', subjectId: '', publisherId: '', questions: [] };
            if (activeTab === 'certificates') return { ...base, studentName: '', studentNameEn: '', senderName: '', senderNameEn: '', senderRole: 'doctor', title: '', titleEn: '', description: '', descriptionEn: '', isFeatured: false, badges: [], date: base.timestamp };
            return base;
        };

        // Using global Inputs inside AdminCMS to prevent transient React rendering issues Focus Drop.

        // ---------------- QUESTIONS SUB-VIEW BUILDER ----------------
        if (subView === 'questionsList' || subView === 'editQuestion') {

            if (subView === 'editQuestion') {
                const tempQ = qItem || { type: 'mcq', text: '', score: 1, options: ['', '', '', ''], correctAnswers: [0], modelAnswer: '', explanation: '', studentId: Luminova.FOUNDER.id, showExp: false };
                return html`
                <div className="animate-fade-in pb-20 max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-8 pb-4 border-b">
                        <h2 className="text-3xl font-bold text-brand-DEFAULT">${tempQ.id ? 'تعديل سؤال (Edit)' : 'سؤال جديد (New)'}</h2>
                        <${Luminova.Components.Button} onClick=${() => setSubView('questionsList')}>${Luminova.i18n[lang].cancel}</${Luminova.Components.Button}>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 space-y-4">
                             <div className="grid grid-cols-3 gap-4">
                                 <div className="col-span-1">
                                     <label className="block text-sm font-black mb-2 opacity-80">نوع السؤال (Type)</label>
                                     <select value=${tempQ.type || 'mcq'} onChange=${e => setQItem({ ...tempQ, type: e.target.value })} className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 dark:border-gray-700 font-bold outline-none">
                                         <option value="mcq">اختيار من متعدد (إجابة واحدة)</option>
                                         <option value="multi_select">اختيار من متعدد (عدة إجابات)</option>
                                         <option value="essay">مقال / تعليل</option>
                                     </select>
                                 </div>
                                 <div className="col-span-1">
                                     <label className="block text-sm font-black mb-2 opacity-80">درجة السؤال (Score)</label>
                                     <input type="number" value=${tempQ.score || 1} onChange=${e => setQItem({ ...tempQ, score: Number(e.target.value) })} className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 dark:border-gray-700 font-bold outline-none text-center" />
                                 </div>
                                 <div className="col-span-1">
                                    <label className="block text-sm font-black mb-2 opacity-80">المساهم (Author)</label>
                                    <select value=${tempQ.studentId || ''} onChange=${(e) => setQItem({ ...tempQ, studentId: e.target.value })} className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 dark:border-gray-700 font-bold z-50 outline-none">
                                        <option value="">-- بدون مساهم --</option>
                                        ${studentsWithFounder.map(s => html`<option key=${s.id} value=${s.id}>${s.nameAr || s.name}</option>`)}
                                    </select>
                                 </div>
                             </div>
                        </div>
                        
                        <div className="col-span-2 pt-6">
                            <label className="block text-sm font-bold mb-2">السؤال (Question Text)</label>
                            <textarea value=${tempQ.text || tempQ.textAr || ''} onChange=${e => setQItem({ ...tempQ, text: e.target.value })} className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 dark:border-gray-700 outline-none text-lg resize-y min-h-[120px]" placeholder="اكتب نص السؤال هنا..." />
                        </div>
                        <div className="col-span-2 w-full mt-2">
                            <${Luminova.Components.UniversalMediaInput} label="مرفقات السؤال التوضيحية (اختياري)" attachments=${tempQ.mediaUrls || (tempQ.mediaUrl ? [tempQ.mediaUrl] : [])} onChange=${v => setQItem({ ...tempQ, mediaUrls: v, mediaUrl: '' })} />
                        </div>

                        ${tempQ.type !== 'essay' ? html`
                            <div className="col-span-2 space-y-3 pt-6">
                                <label className="block text-sm font-bold mb-2 flex justify-between items-center">
                                    <span>خيارات الإجابة (Options)</span>
                                    <button onClick=${() => setQItem({ ...tempQ, options: [...(tempQ.options || []), ''] })} className="px-3 py-1 bg-brand-DEFAULT text-white text-xs rounded-full font-bold shadow-md hover:scale-105">+ إضافة خيار</button>
                                </label>
                                ${(tempQ.options || ['']).map((opt, idx) => html`
                                    <div key=${idx} className="flex items-center gap-3 bg-white dark:bg-gray-900 border-2 dark:border-gray-800 p-2 rounded-xl focus-within:border-brand-DEFAULT/50 transition-colors">
                                        <div className="pl-2 flex items-center justify-center cursor-pointer" title="تحديد كإجابة صحيحة">
                                            <input type=${tempQ.type === 'mcq' ? 'radio' : 'checkbox'} name="correct" checked=${tempQ.correctAnswers?.includes(idx)} 
                                                onChange=${(e) => {
                        if (tempQ.type === 'mcq') setQItem({ ...tempQ, correctAnswers: [idx] });
                        else {
                            const cur = tempQ.correctAnswers || [];
                            setQItem({ ...tempQ, correctAnswers: e.target.checked ? [...cur, idx] : cur.filter(x => x !== idx) });
                        }
                    }} 
                                                className="w-6 h-6 accent-brand-DEFAULT cursor-pointer" 
                                            />
                                        </div>
                                        <input type="text" value=${opt || ''} 
                                            onChange=${e => { const newOps = [...tempQ.options]; newOps[idx] = e.target.value; setQItem({ ...tempQ, options: newOps }) }} 
                                            className="flex-1 bg-transparent p-2 outline-none font-semibold text-lg" 
                                            placeholder=${`الخيار ${idx + 1}`} 
                                        />
                                        <button onClick=${() => { const newOps = tempQ.options.filter((_, i) => i !== idx); setQItem({ ...tempQ, options: newOps, correctAnswers: [0] }); }} className="p-2 text-red-500 hover:bg-red-500 hover:text-white rounded-lg opacity-50 hover:opacity-100 transition-all"><${Luminova.Icons.Trash}/></button>
                                    </div>
                                `)}
                            </div>
                        ` : html`
                            <div className="col-span-2 pt-6">
                                <label className="block text-sm font-bold mb-2">الإجابة النموذجية (Model Answer)</label>
                                <textarea value=${tempQ.modelAnswer || tempQ.modelAnswerAr || ''} onChange=${e => setQItem({ ...tempQ, modelAnswer: e.target.value })} className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 dark:border-gray-700 outline-none min-h-[100px]" placeholder="اكتب الإجابة النموذجية للسؤال المقالي..." />
                            </div>
                        `}

                        <div className="col-span-2 pt-6">
                            <button onClick=${() => setQItem({ ...tempQ, showExp: !tempQ.showExp })} className="text-brand-DEFAULT font-bold bg-brand-DEFAULT/10 px-4 py-2 rounded-xl flex items-center gap-2 w-max">
                                💡 ${tempQ.showExp || tempQ.explanation || tempQ.explanationAr ? 'إخفاء التعليل' : 'إضافة تعليل للإجابة (Explanation)'}
                            </button>
                            ${(tempQ.showExp || tempQ.explanation || tempQ.explanationAr) && html`
                                <textarea value=${tempQ.explanation || tempQ.explanationAr || ''} onChange=${e => setQItem({ ...tempQ, explanation: e.target.value })} className="w-full p-4 mt-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/30 outline-none min-h-[100px] text-brand-gold" placeholder="اكتب شرحاً أو تعليلاً لسبب الإجابة الصحيحة..." />
                            `}
                        </div>

                        <div className="col-span-2 mt-8 flex gap-4 border-t pt-4">
                            <${Luminova.Components.Button} onClick=${() => handleSubSave(tempQ)} className="w-full text-xl py-3 shadow-[0_5px_30px_-10px_rgba(6,182,212,0.8)]">${Luminova.i18n[lang].save} Question</${Luminova.Components.Button}>
                        </div>
                    </div>
                </div>
            `;
            } // End Edit Question

            return html`
            <div className="animate-fade-in pb-20">
                <div className="flex items-center justify-between mb-8 pb-4 border-b">
                    <div>
                        <h2 className="text-3xl font-black text-brand-gold">Quiz Questions Matrix</h2>
                        <h3 className="text-xl font-bold opacity-70 mt-2">${editingItem.title || editingItem.titleAr || ''}</h3>
                    </div>
                    <div className="flex gap-3">
                        <${Luminova.Components.Button} onClick=${() => { setSubView(''); setEditingItem(null); }} variant="glass">العودة لقائمة الاختبارات</${Luminova.Components.Button}>
                        <${Luminova.Components.Button} onClick=${() => setSubView('')}>رجوع لصفحة الإعدادات</${Luminova.Components.Button}>
                    </div>
                </div>
                
                <div className="mb-6"><${Luminova.Components.Button} onClick=${() => { setQItem(null); setSubView('editQuestion'); }} className="bg-green-500 hover:bg-green-600 shadow-xl shadow-green-500/20 text-xl py-3 px-8">+ Add Question</${Luminova.Components.Button}></div>
                
                <div className="space-y-4">
                    ${(editingItem.questions || []).map((q, idx) => html`
                        <${Luminova.Components.GlassCard} key=${q.id} className="flex justify-between items-center border-l-4 border-brand-DEFAULT">
                            <div>
                                <span className="font-bold mr-4 text-brand-DEFAULT">Q${idx + 1}.</span>
                                <span className="text-lg font-bold">${q.textAr || q.textEn || 'Draft Question'}</span>
                                <div className="text-xs opacity-50 mt-1">${q.type} - Score: ${q.score}</div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick=${() => { setQItem(q); setSubView('editQuestion'); }} className="p-3 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-colors"><${Luminova.Icons.Edit} /></button>
                                <button onClick=${() => {
                    if (confirm('Delete Question?')) {
                        const updatedQ = editingItem.questions.filter(x => x.id !== q.id);
                        const updatedQuiz = { ...editingItem, questions: updatedQ };
                        setEditingItem(updatedQuiz);
                        setData(prev => ({ ...prev, [activeTab]: prev[activeTab].map(i => i.id === updatedQuiz.id ? updatedQuiz : i) }));
                    }
                }} className="p-3 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"><${Luminova.Icons.Trash} /></button>
                            </div>
                        </${Luminova.Components.GlassCard}>
                    `)}
                    ${(!editingItem.questions || editingItem.questions.length === 0) && html`
                        <div className="p-10 border-2 border-dashed rounded-2xl text-center font-bold opacity-50">لا يوجد أسئلة.. أضف سؤالاً للاختبار.</div>
                    `}
                </div>
            </div>
        `;
        }

        // Filter logic including Real-Time Search
        let activeTableItems = data[activeTab] ? data[activeTab].filter(item => activeTab !== 'students' || !item.isFounder) : [];

        if (['subjects', 'summaries', 'quizzes'].includes(activeTab)) {
            activeTableItems = activeTableItems.filter(item => {
                let sId, semId, yId;
                if (activeTab === 'subjects') {
                    sId = item.id;
                    semId = item.semesterId;
                    const sem = data.semesters.find(s => s.id === semId);
                    yId = sem ? sem.yearId : null;
                } else {
                    sId = item.subjectId;
                    const sub = data.subjects.find(s => s.id === sId);
                    semId = sub ? sub.semesterId : null;
                    const sem = data.semesters.find(s => s.id === semId);
                    yId = sem ? sem.yearId : null;
                }

                if (filterYear && yId !== filterYear) return false;
                if (filterSem && semId !== filterSem) return false;
                if (activeTab !== 'subjects' && filterSub && sId !== filterSub) return false;
                
                return true;
            });
        }

        if (cmsSearchQuery.trim() !== '') {
            const query = cmsSearchQuery.toLowerCase();
            activeTableItems = activeTableItems.filter(item =>
                (item.nameAr || item.titleAr || item.title || item.name || item.studentName || '').toLowerCase().includes(query) ||
                (item.nameEn || item.titleEn || item.title || item.studentNameEn || '').toLowerCase().includes(query) ||
                item.id.toLowerCase().includes(query)
            );
        }
        
        const displayedTableItems = activeTableItems.slice(0, cmsVisibleCount);

        return html`
        <div className="animate-fade-in pb-20 max-w-[1400px] mx-auto">
            <div className="flex justify-between items-center mb-10 border-b-4 border-brand-DEFAULT pb-6 sticky top-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl z-30 pt-4 rounded-b-3xl px-8 shadow-sm">
                <h2 className="text-4xl font-black flex items-center gap-4 text-transparent bg-clip-text bg-gradient-to-r from-brand-hover to-brand-gold">⚙️ CMS Control Center</h2>
                <div className="flex gap-3 flex-wrap justify-end">

                    ${/* Always visible: Export core data.js */ html`
                        <${Luminova.Components.Button}
                            onClick=${handleExportData}
                            className="bg-brand-DEFAULT text-white shadow-lg hover:bg-brand-hover text-sm sm:text-base px-4 sm:px-6"
                            title=${lang === 'ar' ? 'تصدير الإعدادات والأخبار والطلاب والمواد والتلخيصات' : 'Export settings, news, students, subjects & summaries'}
                        >
                            <span className="animate-pulse">💾</span>
                            <span className="hidden sm:inline">${lang === 'ar' ? 'تصدير data.js' : 'Export data.js'}</span>
                            <span className="sm:hidden">data.js</span>
                        </${Luminova.Components.Button}>
                    `}

                    ${/* Context-sensitive: show certificates export only on certificates tab */ activeTab === 'certificates' && html`
                        <${Luminova.Components.Button}
                            onClick=${handleExportCertificates}
                            className="bg-brand-gold text-black shadow-lg hover:bg-yellow-500 text-sm sm:text-base px-4 sm:px-6"
                            title=${lang === 'ar' ? 'تصدير ملف الشهادات فقط' : 'Export certificates.js only'}
                        >
                            <span>📜</span>
                            <span className="hidden sm:inline">${lang === 'ar' ? 'تصدير certificates.js' : 'Export certificates.js'}</span>
                            <span className="sm:hidden">certs.js</span>
                        </${Luminova.Components.Button}>
                    `}

                    ${/* Context-sensitive: show exam export only on quizzes tab */ activeTab === 'quizzes' && html`
                        <${Luminova.Components.Button}
                            onClick=${handleExportExams}
                            className="bg-indigo-500 text-white shadow-lg hover:bg-indigo-600 text-sm sm:text-base px-4 sm:px-6"
                            title=${lang === 'ar' ? 'تصدير ملف الاختبارات فقط' : 'Export exam.js only'}
                        >
                            <span>📝</span>
                            <span className="hidden sm:inline">${lang === 'ar' ? 'تصدير exam.js' : 'Export exam.js'}</span>
                            <span className="sm:hidden">exam.js</span>
                        </${Luminova.Components.Button}>
                    `}

                    <${Luminova.Components.Button} variant="danger" onClick=${goBack} className="text-sm sm:text-base px-4 sm:px-8">${Luminova.i18n[lang].logout}</${Luminova.Components.Button}>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-8">
                <div className="w-full xl:w-1/4">
                    <${Luminova.Components.GlassCard} className="p-4 space-y-3 sticky top-40 shadow-xl border-none">
                        ${validTabs.map(key => html`
                            <button key=${key} onClick=${() => { setActiveTab(key); setEditingItem(null); setSubView(''); }}
                                className=${`w-full text-start px-6 py-4 rounded-xl font-bold text-lg transition-all flex justify-between items-center ${activeTab === key ? 'bg-gradient-to-r from-brand-DEFAULT/90 to-brand-hover text-white shadow-xl scale-105' : 'bg-gray-50 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-[1.02]'}`}>
                                <span>${Luminova.i18n[lang][key] || key.toUpperCase()}</span>
                                <span className=${`text-sm font-black px-2 py-1 rounded-lg ${activeTab === key ? 'bg-white/20' : 'bg-black/5 dark:bg-white/5'}`}>
                                    ${key === 'students' ? (data.students?.filter(s => !s.isFounder).length || 0) : (data[key]?.length || 0)}
                                </span>
                            </button>
                        `)}
                    </${Luminova.Components.GlassCard}>
                </div>

                <div className="w-full xl:w-3/4">
                    <${Luminova.Components.GlassCard} className="border-none shadow-2xl bg-white/40 dark:bg-black/20 backdrop-blur-3xl min-h-[70vh]">
                        <div className="flex justify-between items-center mb-8 border-b dark:border-gray-700 pb-6 pr-4 pl-4 gap-6">
                            <h3 className="text-4xl font-black text-brand-DEFAULT shrink-0">${Luminova.i18n[lang][activeTab] || activeTab}</h3>
                            ${!editingItem && html`
                                <div className="flex-1 max-w-lg">
                                    <input type="text" placeholder=${lang === 'ar' ? 'البحث السريع والفوري في القائمة...' : 'Quick Real-time Search...'} value=${cmsSearchQuery} onChange=${e => setCmsSearchQuery(e.target.value)} className="w-full p-4 rounded-full bg-white dark:bg-gray-800 border-2 dark:border-gray-700 focus:border-brand-DEFAULT outline-none shadow-sm font-bold placeholder:opacity-50" />
                                </div>
                                <${Luminova.Components.Button} onClick=${() => setEditingItem(getNewTemplate())} className="text-xl px-10 py-4 rounded-full shadow-lg shadow-brand-DEFAULT/30 hover:shadow-brand-DEFAULT/50 transition-all font-black shrink-0">
                                    ${lang === 'ar' ? '+ إضافة جديد' : '+ Add New Entity'}
                                </${Luminova.Components.Button}>
                            `}
                        </div>

                        ${!editingItem && ['subjects', 'summaries', 'quizzes'].includes(activeTab) && html`
                            <div className="flex gap-4 px-4 mb-6 relative z-10">
                                <select value=${filterYear} onChange=${e => { setFilterYear(e.target.value); setFilterSem(''); setFilterSub(''); }} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 font-bold outline-none flex-1">
                                    <option value="">${lang === 'ar' ? 'كل الفرق (All Years)' : 'All Years'}</option>
                                    ${data.years.map(y => html`<option key=${y.id} value=${y.id}>${y.nameAr || y.name}</option>`)}
                                </select>
                                <select value=${filterSem} onChange=${e => { setFilterSem(e.target.value); setFilterSub(''); }} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 font-bold outline-none flex-1 text-brand-DEFAULT">
                                    <option value="">${lang === 'ar' ? 'كل الأترام (All Semesters)' : 'All Semesters'}</option>
                                    ${data.semesters.filter(s => !filterYear || s.yearId === filterYear).map(s => html`<option key=${s.id} value=${s.id}>${s.nameAr || s.name}</option>`)}
                                </select>
                                ${['summaries', 'quizzes'].includes(activeTab) && html`
                                    <select value=${filterSub} onChange=${e => setFilterSub(e.target.value)} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 font-bold outline-none flex-1 text-brand-hover">
                                        <option value="">${lang === 'ar' ? 'كل المواد (All Subjects)' : 'All Subjects'}</option>
                                        ${data.subjects.filter(s => {
                                            if (filterSem) return s.semesterId === filterSem;
                                            if (filterYear) {
                                                const validSems = data.semesters.filter(sem => sem.yearId === filterYear).map(sem => sem.id);
                                                return validSems.includes(s.semesterId);
                                            }
                                            return true;
                                        }).map(s => html`<option key=${s.id} value=${s.id}>${s.nameAr || s.name}</option>`)}
                                    </select>
                                `}
                            </div>
                        `}

                        ${editingItem ? html`
                            <div className="bg-white/70 dark:bg-gray-900/70 p-8 rounded-3xl border-2 border-brand-DEFAULT/20 shadow-inner">
                                <div className="flex justify-between items-center mb-8 border-b dark:border-gray-700 pb-4">
                                    <h4 className="text-2xl font-black text-brand-gold">${editingItem.id.includes(activeTab) ? (lang === 'ar' ? 'إنشاء سجل جديد' : 'Create New Record') : (lang === 'ar' ? 'تعديل السجل' : 'Edit Record')}</h4>
                                    ${activeTab === 'quizzes' && html`
                                        <${Luminova.Components.Button} onClick=${() => setSubView('questionsList')} className="bg-blue-600 hover:bg-blue-700 text-lg px-8 relative overflow-hidden group">
                                            <span className="relative z-10 w-full flex items-center gap-2">📝 Manage Questions Matrix <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">${(editingItem.questions || []).length}</span></span>
                                        </${Luminova.Components.Button}>
                                    `}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                                    ${(activeTab === 'semesters' || activeTab === 'subjects' || activeTab === 'summaries' || activeTab === 'quizzes') && html`
                                        <div className="col-span-2 md:col-span-1">
                                            <label className="block text-sm font-black mb-2 opacity-80 text-brand-DEFAULT drop-shadow-sm">الفرقة (Year Hierarchy)</label>
                                            <select value=${editingItem.yearId || ''} onChange=${e => setEditingItem({ ...editingItem, yearId: e.target.value, semesterId: '', subjectId: '' })} className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 border-brand-DEFAULT/30 font-bold outline-none ring-0">
                                                <option value="">-- اختار الفرقة --</option>
                                                ${data.years.map(y => html`<option key=${y.id} value=${y.id}>${y.nameAr || y.name}</option>`)}
                                            </select>
                                        </div>
                                    `}
                                    ${(activeTab === 'subjects' || activeTab === 'summaries' || activeTab === 'quizzes') && html`
                                        <div className="col-span-2 md:col-span-1">
                                            <label className="block text-sm font-black mb-2 opacity-80 text-brand-DEFAULT drop-shadow-sm">الترم (Semester Hierarchy)</label>
                                            <select value=${editingItem.semesterId || ''} onChange=${e => setEditingItem({ ...editingItem, semesterId: e.target.value, subjectId: '' })} className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 border-brand-DEFAULT/30 font-bold outline-none ring-0">
                                                <option value="">-- اختار الترم --</option>
                                                ${data.semesters.filter(s => !editingItem.yearId || s.yearId === editingItem.yearId).map(s => html`<option key=${s.id} value=${s.id}>${s.nameAr || s.name}</option>`)}
                                            </select>
                                        </div>
                                    `}
                                    ${(activeTab === 'summaries' || activeTab === 'quizzes') && html`
                                        <div className="col-span-2">
                                            <label className="block text-sm font-black mb-2 opacity-80 text-brand-hover drop-shadow-sm">المادة (Subject Link)</label>
                                            <select value=${editingItem.subjectId || ''} onChange=${e => setEditingItem({ ...editingItem, subjectId: e.target.value })} className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 border-brand-hover/50 font-bold outline-none ring-0">
                                                <option value="">-- اختار المادة --</option>
                                                ${data.subjects.filter(s => {
                                                    if (editingItem.semesterId) return s.semesterId === editingItem.semesterId;
                                                    if (editingItem.yearId) {
                                                        const validSems = data.semesters.filter(sem => sem.yearId === editingItem.yearId).map(sem => sem.id);
                                                        return validSems.includes(s.semesterId);
                                                    }
                                                    return true;
                                                }).map(s => html`<option key=${s.id} value=${s.id}>${s.nameAr || s.name}</option>`)}
                                            </select>
                                        </div>
                                    `}
                                    ${(activeTab === 'summaries') && html`
                                        <div className="col-span-2">
                                            <label className="block text-sm font-black mb-2 opacity-80 text-brand-gold drop-shadow-sm">الطالب المساهم (Author)</label>
                                            <select value=${editingItem.studentId || ''} onChange=${e => setEditingItem({ ...editingItem, studentId: e.target.value })} className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 border-brand-gold/50 font-bold outline-none ring-0">
                                                <option value="">-- اختار الطالب --</option>
                                                ${studentsWithFounder.map(s => html`<option key=${s.id} value=${s.id}>${s.nameAr || s.name}</option>`)}
                                            </select>
                                        </div>
                                    `}

                                    ${activeTab === 'certificates' ? html`
                                        <div className="col-span-2 w-full"><${Luminova.Components.Input} label="اسم الطالب المُكرم (Recipient Name - Arabic)" val=${editingItem.studentName} onChange=${v => setEditingItem({ ...editingItem, studentName: v })} /></div>
                                        <div className="col-span-2 w-full"><${Luminova.Components.Input} label="اسم الطالب المُكرم (Recipient Name - English)" val=${editingItem.studentNameEn} onChange=${v => setEditingItem({ ...editingItem, studentNameEn: v })} /></div>
                                        <div className="col-span-2 w-full"><${Luminova.Components.Input} label="اسم المرسل/المانح (Sender Name - Arabic)" val=${editingItem.senderName} onChange=${v => setEditingItem({ ...editingItem, senderName: v })} /></div>
                                        <div className="col-span-2 w-full"><${Luminova.Components.Input} label="اسم المرسل/المانح (Sender Name - English)" val=${editingItem.senderNameEn} onChange=${v => setEditingItem({ ...editingItem, senderNameEn: v })} /></div>
                                        <div className="col-span-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                                            <label className="block text-sm font-black mb-3 opacity-80 text-brand-DEFAULT">دور المرسل/الختم (Seal Type)</label>
                                            <div className="flex gap-4">
                                                <label className="flex items-center gap-3 cursor-pointer bg-white dark:bg-gray-800 p-3 rounded-xl border-2 ${editingItem.senderRole === 'student' ? 'border-brand-DEFAULT' : 'border-gray-200 dark:border-gray-700'} shadow-sm flex-1">
                                                    <input type="radio" value="student" checked=${editingItem.senderRole === 'student'} onChange=${() => setEditingItem({ ...editingItem, senderRole: 'student' })} className="w-5 h-5 accent-brand-DEFAULT" />
                                                    <span className="font-bold">فضِّي 🥈 (Student/Peer)</span>
                                                </label>
                                                <label className="flex items-center gap-3 cursor-pointer bg-white dark:bg-gray-800 p-3 rounded-xl border-2 ${editingItem.senderRole === 'doctor' ? 'border-brand-gold' : 'border-gray-200 dark:border-gray-700'} shadow-sm flex-1">
                                                    <input type="radio" value="doctor" checked=${editingItem.senderRole === 'doctor'} onChange=${() => setEditingItem({ ...editingItem, senderRole: 'doctor' })} className="w-5 h-5 accent-brand-gold" />
                                                    <span className="font-bold text-brand-gold">ذهبي 🏅 (Doctor/Official)</span>
                                                </label>
                                            </div>
                                        </div>
                                        <div className="col-span-2 w-full"><${Luminova.Components.Input} label="عنوان الشهادة (Title - Arabic)" val=${editingItem.title} onChange=${v => setEditingItem({ ...editingItem, title: v })} /></div>
                                        <div className="col-span-2 w-full"><${Luminova.Components.Input} label="عنوان الشهادة (Title - English)" val=${editingItem.titleEn} onChange=${v => setEditingItem({ ...editingItem, titleEn: v })} /></div>
                                        <div className="col-span-2 w-full"><${Luminova.Components.Input} type="textarea" label="الوصف وسبب المنح (Reason - Arabic)" val=${editingItem.description} onChange=${v => setEditingItem({ ...editingItem, description: v })} /></div>
                                        <div className="col-span-2 w-full"><${Luminova.Components.Input} type="textarea" label="الوصف وسبب المنح (Reason - English)" val=${editingItem.descriptionEn} onChange=${v => setEditingItem({ ...editingItem, descriptionEn: v })} /></div>
                                        <div className="col-span-2 w-full p-4 border border-brand-DEFAULT rounded-xl"><${Luminova.Components.Input} type="checkbox" label="📌 إظهار كشهادة رئيسية في المنصة (Featured Certificate)" val=${editingItem.isFeatured} onChange=${v => setEditingItem({ ...editingItem, isFeatured: v })} /></div>
                                        
                                        <!-- REALTIME LIVE PREVIEW -->
                                        ${window.Luminova?.Components?.CertificateCard ? html`
                                        <div className="col-span-2 mt-8 py-8 bg-gray-100 dark:bg-slate-900 border border-gray-300 dark:border-gray-800 rounded-3xl overflow-hidden relative group">
                                            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                                            <h4 className="font-black text-center mb-6 tracking-[0.3em] opacity-40">✨ LIVE CSS PREVIEW</h4>
                                            <div className="w-full flex justify-center origin-top pointer-events-none scale-[0.55] sm:scale-75 lg:scale-[0.85] transition-transform" style=${{transformOrigin:'top center'}}>
                                                <div className="w-[1000px] shadow-2xl">
                                                    <${Luminova.Components.CertificateCard} certificate=${editingItem} lang=${lang} />
                                                </div>
                                            </div>
                                        </div>
                                        ` : html`<div className="col-span-2 p-10 text-center font-bold opacity-50">Loading Certificate Engine Viewer...</div>`}
                                    ` : activeTab === 'students' ? html`
                                        <div className="col-span-2 flex flex-col md:flex-row gap-4"><div className="w-full"><${Luminova.Components.Input} label="الاسم العربي" val=${editingItem.nameAr} onChange=${v => setEditingItem({ ...editingItem, nameAr: v })} /></div> <div className="w-full"><${Luminova.Components.Input} label="English Name" val=${editingItem.nameEn} onChange=${v => setEditingItem({ ...editingItem, nameEn: v })} /></div></div>
                                        <div className="col-span-2 flex flex-col md:flex-row gap-4"><div className="w-full"><${Luminova.Components.Input} label="التخصص العربي" val=${editingItem.majorAr} onChange=${v => setEditingItem({ ...editingItem, majorAr: v })} /></div> <div className="w-full"><${Luminova.Components.Input} label="English Major" val=${editingItem.majorEn} onChange=${v => setEditingItem({ ...editingItem, majorEn: v })} /></div></div>
                                        <div className="col-span-2 w-full"><${Luminova.Components.Input} type="textarea" label="نبذة عربية" val=${editingItem.bioAr} onChange=${v => setEditingItem({ ...editingItem, bioAr: v })} /></div>
                                        <div className="col-span-2 w-full"><${Luminova.Components.Input} type="textarea" label="English Bio" val=${editingItem.bioEn} onChange=${v => setEditingItem({ ...editingItem, bioEn: v })} /></div>
                                        <div className="col-span-2 w-full">
                                            <${Luminova.Components.UniversalMediaInput} label="مرفقات الطالب / الصورة الشخصية" attachments=${editingItem.mediaUrls || (editingItem.image ? [editingItem.image] : [])} onChange=${v => setEditingItem({ ...editingItem, mediaUrls: v, image: v[0] || '' })} />
                                        </div>
                                        <div className="col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                            <${Luminova.Components.SocialInput} label="Facebook Link" val=${editingItem.socialLinks?.facebook} onChange=${v => setEditingItem({ ...editingItem, socialLinks: { ...(editingItem.socialLinks || {}), facebook: v } })} /> 
                                            <${Luminova.Components.SocialInput} label="Instagram Link" val=${editingItem.socialLinks?.instagram} onChange=${v => setEditingItem({ ...editingItem, socialLinks: { ...(editingItem.socialLinks || {}), instagram: v } })} /> 
                                            <${Luminova.Components.SocialInput} label="LinkedIn Link" val=${editingItem.socialLinks?.linkedin} onChange=${v => setEditingItem({ ...editingItem, socialLinks: { ...(editingItem.socialLinks || {}), linkedin: v } })} />
                                        </div>
                                        <div className="col-span-2 flex gap-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                                            <${Luminova.Components.Input} type="checkbox" label="⭐ VIP Member (مميز الإطار الخارجي)" val=${editingItem.isVIP} onChange=${v => { setEditingItem({ ...editingItem, isVIP: v }) }} />
                                            <${Luminova.Components.Input} type="checkbox" label="🔵✔️ Verified (شارة توثيق زرقاء)" val=${editingItem.isVerified} onChange=${v => { setEditingItem({ ...editingItem, isVerified: v }) }} />
                                        </div>
                                        <div className="col-span-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                                            <label className="block text-sm font-black mb-3 opacity-80 text-teal-600 dark:text-teal-400">🎓 دور المستخدم (User Role)</label>
                                            <div className="flex gap-4">
                                                <label className="flex items-center gap-3 cursor-pointer bg-white dark:bg-gray-800 p-3 rounded-xl border-2 ${editingItem.role !== 'doctor' ? 'border-brand-DEFAULT' : 'border-gray-200 dark:border-gray-700'} shadow-sm flex-1">
                                                    <input type="radio" name="userRole" value="student" checked=${editingItem.role !== 'doctor'} onChange=${() => setEditingItem({ ...editingItem, role: 'student' })} className="w-5 h-5 accent-brand-DEFAULT" />
                                                    <span className="font-bold">👤 طالب (Student)</span>
                                                </label>
                                                <label className="flex items-center gap-3 cursor-pointer bg-white dark:bg-gray-800 p-3 rounded-xl border-2 ${editingItem.role === 'doctor' ? 'border-teal-500' : 'border-gray-200 dark:border-gray-700'} shadow-sm flex-1">
                                                    <input type="radio" name="userRole" value="doctor" checked=${editingItem.role === 'doctor'} onChange=${() => setEditingItem({ ...editingItem, role: 'doctor' })} className="w-5 h-5 accent-teal-500" />
                                                    <span className="font-bold text-teal-600 dark:text-teal-400">🎓 دكتور (Doctor)</span>
                                                </label>
                                            </div>
                                        </div>
                                    ` : activeTab === 'news' ? html`
                                        <div className="col-span-2">
                                            <label className="block text-sm font-black mb-2 opacity-80 text-brand-DEFAULT drop-shadow-sm">الناشر (Author)</label>
                                            <select value=${editingItem.studentId || ''} onChange=${e => setEditingItem({ ...editingItem, studentId: e.target.value })} className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 border-brand-DEFAULT/50 font-bold outline-none ring-0">
                                                <option value="">-- اختار الناشر --</option>
                                                ${studentsWithFounder.map(s => html`<option key=${s.id} value=${s.id}>${s.nameAr || s.name}</option>`)}
                                            </select>
                                        </div>
                                        <div className="col-span-2 w-full"><${Luminova.Components.Input} label="عنوان الخبر" val=${editingItem.titleAr} onChange=${v => setEditingItem({ ...editingItem, titleAr: v })} /></div>
                                        <div className="col-span-2 w-full"><${Luminova.Components.Input} label="News Title" val=${editingItem.titleEn} onChange=${v => setEditingItem({ ...editingItem, titleEn: v })} /></div>
                                        <div className="col-span-2 w-full"><${Luminova.Components.Input} type="textarea" label="التفاصيل (عربي)" val=${editingItem.contentAr} onChange=${v => setEditingItem({ ...editingItem, contentAr: v })} /></div>
                                        <div className="col-span-2 w-full"><${Luminova.Components.Input} type="textarea" label="Details (English)" val=${editingItem.contentEn} onChange=${v => setEditingItem({ ...editingItem, contentEn: v })} /></div>
                                        <div className="col-span-2 w-full mt-2">
                                            <${Luminova.Components.UniversalMediaInput} label="Media Attachments (مرفقات الخبر)" attachments=${editingItem.mediaUrls || (editingItem.mediaUrl ? [editingItem.mediaUrl] : [])} onChange=${v => setEditingItem({ ...editingItem, mediaUrls: v, mediaUrl: '' })} />
                                        </div>
                                    ` : activeTab === 'summaries' ? html`
                                        <div className="col-span-2 w-full"><${Luminova.Components.Input} label="عنوان التلخيص" val=${editingItem.titleAr} onChange=${v => setEditingItem({ ...editingItem, titleAr: v })} /></div>
                                        <div className="col-span-2 w-full"><${Luminova.Components.Input} label="Summary Title" val=${editingItem.titleEn} onChange=${v => setEditingItem({ ...editingItem, titleEn: v })} /></div>
                                        <div className="col-span-2 w-full"><${Luminova.Components.Input} type="textarea" label="نبذة محتوى (عربي)" val=${editingItem.contentAr} onChange=${v => setEditingItem({ ...editingItem, contentAr: v })} /></div>
                                        <div className="col-span-2 w-full"><${Luminova.Components.Input} type="textarea" label="Summary Content (English)" val=${editingItem.contentEn} onChange=${v => setEditingItem({ ...editingItem, contentEn: v })} /></div>
                                        <div className="col-span-2 w-full mt-2">
                                            <${Luminova.Components.UniversalMediaInput} label="Media Attachments (مرفقات التلخيص)" attachments=${editingItem.mediaUrls || (editingItem.mediaUrl ? [editingItem.mediaUrl] : [])} onChange=${v => setEditingItem({ ...editingItem, mediaUrls: v, mediaUrl: '' })} />
                                        </div>
                                    ` : activeTab === 'quizzes' ? html`
                                        <div className="col-span-2">
                                            <label className="block text-sm font-black mb-2 opacity-80 text-brand-DEFAULT drop-shadow-sm">ناشر الاختبار (Quiz Publisher - للعرض فقط بلا مساهمات)</label>
                                            <select value=${editingItem.publisherId || ''} onChange=${e => setEditingItem({ ...editingItem, publisherId: e.target.value })} className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 border-brand-DEFAULT/50 font-bold outline-none ring-0">
                                                <option value="">-- اختار الناشر ليعرض على غلاف الاختبار --</option>
                                                ${studentsWithFounder.map(s => html`<option key=${s.id} value=${s.id}>${s.nameAr || s.name}</option>`)}
                                            </select>
                                        </div>
                                        <div className="col-span-2 w-full flex flex-col md:flex-row gap-4">
                                            <div className="w-full"><${Luminova.Components.Input} label="عنوان الاختبار التفاعلي (عربي)" val=${editingItem.titleAr || editingItem.title || ''} onChange=${v => setEditingItem({ ...editingItem, titleAr: v })} /></div>
                                            <div className="w-full"><${Luminova.Components.Input} label="Interactive Quiz Title (English)" val=${editingItem.titleEn || editingItem.title || ''} onChange=${v => setEditingItem({ ...editingItem, titleEn: v })} /></div>
                                        </div>
                                        <div className="col-span-1 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white/50 dark:bg-gray-800/50">
                                            <${Luminova.Components.Input} type="checkbox" label="ترتيب عشوائي للأسئلة (Shuffle)" val=${editingItem.isShuffled || false} onChange=${v => setEditingItem({ ...editingItem, isShuffled: v })} />
                                            <p className="text-xs opacity-60 mt-1">يظهر الترتيب بشكل مختلف لكل طالب لزيادة المصداقية.</p>
                                        </div>
                                        <div className="col-span-1 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white/50 dark:bg-gray-800/50">
                                            <label className="block text-sm font-black mb-2 opacity-80">توقيت ظهور التعليل (Feedback Mode)</label>
                                            <select value=${editingItem.feedbackMode || 'end'} onChange=${e => setEditingItem({ ...editingItem, feedbackMode: e.target.value })} className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 dark:bg-gray-900 dark:border-gray-600 font-bold outline-none shadow-sm">
                                                <option value="end">النتيجة مع التعليل في نهاية الاختبار (At the End)</option>
                                                <option value="immediate">تجميد فور إجابة كل سؤال وإظهار التعليل (Immediate)</option>
                                            </select>
                                        </div>
                                    ` : html`
                                        <div className="w-full"><${Luminova.Components.Input} label="الاسم العربي" val=${editingItem.nameAr} onChange=${v => setEditingItem({ ...editingItem, nameAr: v })} /></div> <div className="w-full"><${Luminova.Components.Input} label="English Name" val=${editingItem.nameEn} onChange=${v => setEditingItem({ ...editingItem, nameEn: v })} /></div>
                                    `}
                                </div>

                                <div className="mt-10 border-t-4 border-gray-200 dark:border-gray-800 pt-6 flex gap-6">
                                    <${Luminova.Components.Button} onClick=${handleSave} className="flex-1 text-xl py-4 rounded-2xl shadow-[0_10px_40px_-10px_rgba(6,182,212,0.8)]">${Luminova.i18n[lang].save} Entity To Database</${Luminova.Components.Button}>
                                    <${Luminova.Components.Button} variant="glass" onClick=${() => setEditingItem(null)} className="w-[30%] text-xl py-4 rounded-2xl">${Luminova.i18n[lang].cancel}</${Luminova.Components.Button}>
                                </div>
                            </div>
                        ` : html`
                            <div className="overflow-x-auto p-4">
                                <table className="w-full text-start border-collapse">
                                    <thead>
                                        <tr className="border-b-2 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 uppercase text-xs tracking-wider opacity-70">
                                            <th className="p-4 text-start font-black rounded-tl-xl w-[150px]">ID KEY</th>
                                            <th className="p-4 text-start font-black">ENTITY TITLE / NAME</th>
                                            <th className="p-4 text-start font-black">CREATED ON</th>
                                            <th className="p-4 text-end font-black rounded-tr-xl">ACTIONS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${displayedTableItems.map(item => html`
                                            <tr key=${item.id} className="border-b dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                                <td className="p-4 text-xs font-mono opacity-40 group-hover:opacity-100 transition-opacity">${item.id}</td>
                                                <td className="p-4 font-bold text-lg">
                                                    ${activeTab === 'semesters' && item.yearId ? (() => {
                                                        const parentYear = data.years.find(y => y.id === item.yearId);
                                                        return html`
                                                            <span className="text-xs font-bold text-brand-DEFAULT/60 block mb-1 tracking-wide">${parentYear ? (parentYear.nameAr || parentYear.nameEn) : item.yearId}</span>
                                                            <span className="flex items-center gap-1.5">
                                                                <span className="text-brand-DEFAULT/40 text-base">»</span>
                                                                <span>${item.nameAr || item.name || item.nameEn || 'N/A'}</span>
                                                                ${(item.nameEn || item.name) ? html`<span className="text-gray-400 font-normal text-sm mx-1">-</span><span className="opacity-60 text-sm font-normal">${item.nameEn || ''}</span>` : null}
                                                            </span>
                                                        `;
                                                    })() : activeTab === 'subjects' && item.semesterId ? (() => {
                                                        const parentSem = data.semesters.find(s => s.id === item.semesterId);
                                                        const parentYear = parentSem ? data.years.find(y => y.id === parentSem.yearId) : null;
                                                        return html`
                                                            <span className="text-xs font-bold text-brand-DEFAULT/60 block mb-1 tracking-wide">
                                                                ${parentYear ? (parentYear.nameAr || parentYear.nameEn) : ''}
                                                                ${parentYear && parentSem ? html`<span className="opacity-50 mx-1">»</span>` : null}
                                                                ${parentSem ? (parentSem.nameAr || parentSem.nameEn) : ''}
                                                            </span>
                                                            <span className="flex items-center gap-1.5">
                                                                <span className="text-brand-DEFAULT/40 text-base">»</span>
                                                                <span>${item.nameAr || item.name || item.nameEn || 'N/A'}</span>
                                                                ${(item.nameEn || item.name) ? html`<span className="text-gray-400 font-normal text-sm mx-1">-</span><span className="opacity-60 text-sm font-normal">${item.nameEn || ''}</span>` : null}
                                                            </span>
                                                        `;
                                                    })() : html`
                                                        <span>${item.titleAr || item.nameAr || item.name || item.titleEn || item.nameEn || item.title || 'N/A'}</span>
                                                        <span className="text-gray-400 font-normal mx-2">-</span>
                                                        <span className="opacity-70 text-sm font-normal">${item.titleEn || item.nameEn || item.title || ''}</span>
                                                      ${item.isVIP && html`<span className="ml-2 text-brand-DEFAULT" title="VIP">✨</span>`}
                                                        ${item.isFeatured && html`<span className="ml-2 text-brand-gold" title="Featured">📌 مميزة</span>`}
                                                        ${item.isVerified && html`<span className="ml-2" title="Verified">🔵✔️</span>`}
                                                        ${item.role === 'doctor' && html`<span className="ml-2 text-xs bg-teal-500 text-white px-2 py-0.5 rounded-full font-black">🎓 دكتور</span>`}
                                                    `}
                                                </td>
                                                <td className="p-4 text-sm opacity-60 font-semibold tracking-wider">${Luminova.formatDate(item.timestamp, lang)}</td>
                                                <td className="p-4 flex justify-end gap-3">
                                                    ${activeTab === 'quizzes' && html`
                                                        <button onClick=${() => { setEditingItem({ ...item }); setSubView('questionsList'); }} className="px-4 py-2 bg-brand-DEFAULT/10 text-brand-DEFAULT rounded-lg hover:bg-brand-DEFAULT hover:text-white transition-colors shadow-sm whitespace-nowrap font-bold flex gap-2 items-center md:mr-4 border border-brand-DEFAULT/30 group">
                                                            📝 ${lang === 'ar' ? 'إدارة الأسئلة' : 'Manage Questions'}
                                                            <span className="bg-white/50 dark:bg-black/20 text-xs px-2 py-0.5 rounded-full group-hover:bg-white/20">${(item.questions || []).length}</span>
                                                        </button>
                                                    `}
                                                    <button onClick=${() => setEditingItem({ ...item })} className="p-3 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-colors shadow-sm"><${Luminova.Icons.Edit} /></button>
                                                    <button onClick=${() => handleDelete(activeTab, item.id)} className="p-3 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors shadow-sm"><${Luminova.Icons.Trash} /></button>
                                                </td>
                                            </tr>
                                        `)}
                                    </tbody>
                                </table>
                                ${activeTableItems.length === 0 && html`
                                    <div className="p-20 text-center font-bold text-2xl opacity-30 border-2 border-dashed rounded-3xl mt-4">${Luminova.i18n[lang].emptyState}</div>
                                `}
                            </div>
                            
                            ${(!editingItem && cmsVisibleCount < activeTableItems.length) && html`
                                <div className="flex justify-center pt-6 pb-2">
                                    <button onClick=${() => setCmsVisibleCount(prev => prev + 5)} className="bg-brand-DEFAULT hover:bg-brand-hover text-white font-bold py-2.5 px-8 rounded-xl shadow-md transition-all">
                                        ${lang === 'ar' ? 'عرض المزيد ➕' : 'Load More ➕'}
                                    </button>
                                </div>
                            `}
                        `}
                    </${Luminova.Components.GlassCard}>
                </div>
            </div>
        </div>
    `;
    };

    // ==========================================

})();
