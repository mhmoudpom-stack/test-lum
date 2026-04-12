(function () {
    "use strict";

    if (!window.__LUMINOVA) return;
    const { useState, useEffect, useMemo, useCallback } = window.React;
    const html = window.htm.bind(window.React.createElement);
    const Luminova = window.__LUMINOVA;

Luminova.Pages.QuizEngine = ({ quiz, data, lang, goBack }) => {
        const questions = useMemo(() => {
            if (!quiz || !quiz.questions) return [];
            let arr = [...quiz.questions];
            if (quiz.isShuffled) {
                for (let i = arr.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [arr[i], arr[j]] = [arr[j], arr[i]];
                }
            }
            return arr;
        }, [quiz]);

        const [currentIndex, setCurrentIndex] = useState(0);
        const [answers, setAnswers] = useState({});
        const [isFinished, setIsFinished] = useState(false);
        const [isFeedbackRevealed, setIsFeedbackRevealed] = useState(false);

        if (questions.length === 0) {
            return html`
            <div className="text-center py-20 min-h-[50vh] flex flex-col justify-center items-center">
                <span className="text-4xl opacity-50 mb-4">📭</span>
                <p className="text-xl font-bold opacity-50 mb-6">${lang === 'ar' ? 'الاختبار قيد التجهيز..' : 'Quiz is under construction..'}</p>
                <${Luminova.Components.Button} onClick=${goBack}>${lang === 'ar' ? 'العودة للمادة' : 'Back to Subject'}</${Luminova.Components.Button}>
            </div>
        `;
        }

        const q = questions[currentIndex];
        const maxScore = questions.reduce((sum, curr) => sum + (Number(curr.score) || 0), 0);

        const handleFinish = () => {
            if (confirm(Luminova.i18n[lang].quitWarning.replace('?', '؟'))) setIsFinished(true);
        };

        if (isFinished) {
            let score = 0;
            questions.forEach(que => {
                if (que.type === 'mcq') {
                    if (answers[que.id] === que.correctAnswers?.[0]) score += Number(que.score);
                } else if (que.type === 'multi_select') {
                    const correctStr = [...(que.correctAnswers || [])].sort().join(',');
                    const ansStr = [...(answers[que.id] || [])].sort().join(',');
                    if (correctStr === ansStr) score += Number(que.score);
                }
            });

            return html`
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-10">
                <${Luminova.Components.GlassCard} className="text-center py-16 bg-gradient-to-b from-brand-DEFAULT/10 to-transparent border-t-8 border-t-brand-DEFAULT">
                    <h2 className="text-5xl font-black mb-6 uppercase tracking-wider">${Luminova.i18n[lang].results}</h2>
                    <div className="text-8xl font-black text-brand-DEFAULT drop-shadow-2xl mb-8">${score} <span className="text-4xl opacity-50">/ ${maxScore}</span></div>
                    <${Luminova.Components.Button} onClick=${goBack} className="px-10 py-4 text-xl rounded-full shadow-2xl hover:scale-105">${lang === 'ar' ? 'العودة للمادة' : 'Back to Subject'}</${Luminova.Components.Button}>
                </${Luminova.Components.GlassCard}>
                
                ${questions.map((que, idx) => {
                const qLang = lang === 'ar' ? 'Ar' : 'En';
                let isCorrect = false;
                if (que.type === 'mcq') isCorrect = answers[que.id] === que.correctAnswers?.[0];
                if (que.type === 'multi_select') isCorrect = [...(que.correctAnswers || [])].sort().join(',') === [...(answers[que.id] || [])].sort().join(',');
                const studentProv = data.students.find(s => s.id === que.studentId) || (que.studentId === 's_founder' || que.studentId === Luminova.FOUNDER.id ? Luminova.FOUNDER : null);

                return html`
                        <${Luminova.Components.GlassCard} key=${idx} className=${`border-r-4 ${que.type !== 'essay' ? (isCorrect ? 'border-r-green-500' : 'border-r-red-500') : 'border-r-brand-gold'} relative`}>
                            <div className="absolute top-0 right-0 px-4 py-1 rounded-bl-xl bg-black/10 dark:bg-white/10 font-bold text-sm">
                                ${que.score} ${Luminova.i18n[lang].score}
                            </div>
                            
                            ${studentProv && html`
                                <div className="flex flex-row justify-between items-center bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 mb-4 w-full">
                                    <div className="flex flex-col items-start gap-1">
                                        <span className="text-xs text-slate-400">المساهم بالمعلومة:</span>
                                        <span className="text-sm font-bold text-yellow-500">${lang === 'ar' ? studentProv.nameAr || studentProv.name : studentProv.nameEn || studentProv.name}</span>
                                        <div className="flex flex-row items-center gap-2 mt-1">
                                            ${studentProv.isFounder && html`<span className="text-xs bg-brand-gold text-black font-black px-2 py-0.5 rounded-full shadow-md shrink-0">${Luminova.i18n[lang].founder}</span>`}
                                            ${studentProv.role === 'doctor' && html`<span className="text-xs bg-teal-500 text-white font-black px-2 py-0.5 rounded-full shadow-md shrink-0">🎓 ${lang === 'ar' ? 'دكتور' : 'Doctor'}</span>`}
                                            ${studentProv.isVIP && html`<span title="VIP">✨</span>`}
                                            ${studentProv.isVerified && html`<span title="Verified">🔵</span>`}
                                        </div>
                                    </div>
                                    <${Luminova.Components.Avatar} name=${studentProv.nameAr || studentProv.name} nameEn=${studentProv.nameEn} image=${studentProv.image} size="w-12 h-12 rounded-full border-2 border-slate-600 shadow-sm shrink-0" />
                                </div>
                            `}

                            <h4 className="font-bold text-xl mt-4 mb-4 leading-relaxed">س ${idx + 1}: ${que.text || que.textAr}</h4>
                            
                            ${que.type !== 'essay' && html`
                                <div className="mt-6 p-5 rounded-xl bg-gray-50/80 dark:bg-gray-800/80 shadow-inner">
                                    <p className="flex items-start gap-2 mb-2" dangerouslySetInnerHTML=${{ __html: `<span class='font-bold opacity-70 min-w-[120px]'>${Luminova.i18n[lang].correct}:</span> <strong class="text-green-600 dark:text-green-400 font-bold text-lg">${(que.type === 'mcq' ? (que.options || que.optionsAr)[que.correctAnswers[0]] : que.correctAnswers.map(c => (que.options || que.optionsAr)[c]).join(' <span class="text-gray-400">|</span> '))}</strong>` }} />
                                    ${!isCorrect && html`<p className="flex items-start gap-2 pt-2 border-t border-gray-200 dark:border-gray-700 mt-2" dangerouslySetInnerHTML=${{ __html: `<span class='font-bold opacity-70 min-w-[120px]'>${Luminova.i18n[lang].wrong}:</span> <strong class="text-red-500 dark:text-red-400 font-bold line-through opacity-80">${(answers[que.id] !== undefined ? (que.type === 'mcq' ? (que.options || que.optionsAr)[answers[que.id]] : (answers[que.id].length ? answers[que.id].map(c => (que.options || que.optionsAr)[c]).join(' | ') : 'بدون إجابة')) : 'بدون إجابة')}</strong>` }} />`}
                                </div>
                            `}

                            ${que.type === 'essay' && html`
                                <div className="mt-6 p-5 rounded-xl bg-gray-50/80 dark:bg-gray-800/80 shadow-inner space-y-4">
                                    <div>
                                        <p className="font-black text-brand-gold mb-2">${Luminova.i18n[lang].modelAnswer}</p>
                                        <p className="text-md leading-relaxed p-4 bg-white dark:bg-gray-900 rounded border-l-4 border-l-brand-gold font-medium">${que.modelAnswer || que.modelAnswerAr}</p>
                                    </div>
                                    <div>
                                        <p className="font-bold border-t pt-4 dark:border-gray-700 mb-2">${lang === 'ar' ? 'إجابتك' : 'Your Answer'}:</p>
                                        <p className="text-md text-gray-600 dark:text-gray-400 p-4 bg-white/50 dark:bg-gray-900/50 rounded italic">${answers[que.id] || 'ـ بدون إجابة ـ'}</p>
                                    </div>
                                </div>
                            `}

                            ${(que.explanation || que.explanationAr) && html`
                                <div className="mt-6 p-5 rounded-xl bg-brand-DEFAULT/15 border border-brand-DEFAULT/30 relative overflow-hidden">
                                    <div className="absolute -right-4 -top-4 opacity-10 text-8xl text-brand-DEFAULT rotate-12">💡</div>
                                    <p className="font-black text-brand-DEFAULT mb-2 flex items-center gap-2">💡 ${Luminova.i18n[lang].explanation}</p>
                                    <p className="text-md leading-relaxed font-bold z-10 relative">${que.explanation || que.explanationAr}</p>
                                </div>
                            `}
                        </${Luminova.Components.GlassCard}>
                    `;
            })}
            </div>
        `;
        }

        const currentQStudent = data.students.find(s => s.id === q.studentId) || ((q.studentId === 's_founder' || q.studentId === Luminova.FOUNDER.id) ? Luminova.FOUNDER : {});

        return html`
        <div className="max-w-4xl mx-auto min-h-[70vh] flex flex-col pt-10 pb-20">
            <div className="flex justify-between items-center mb-10 bg-white/50 dark:bg-gray-800/50 p-4 rounded-2xl shadow-sm backdrop-blur">
                <${Luminova.Components.Button} variant="danger" onClick=${() => { if (confirm(Luminova.i18n[lang].quitWarning)) goBack(); }} className="rounded-full shadow-lg hover:-translate-x-1">
                    <${Luminova.Icons.XCircle} /> <span className="hidden sm:inline">${Luminova.i18n[lang].quitWarning.split('?')[0]}?</span>
                </${Luminova.Components.Button}>
                <div className="flex-1 mx-8 relative">
                    <div className="bg-gray-300 dark:bg-gray-700 h-3 rounded-full overflow-hidden shadow-inner">
                        <div className="bg-gradient-to-r from-brand-hover to-brand-DEFAULT h-full transition-all duration-500 ease-out" style=${{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}></div>
                    </div>
                </div>
                <span className="font-black text-2xl text-brand-DEFAULT drop-shadow-sm">${currentIndex + 1} <span className="opacity-40 text-lg">/ ${questions.length}</span></span>
            </div>

            <${Luminova.Components.GlassCard} className="relative overflow-visible mb-10 flex-1 flex flex-col border-t-8 border-t-brand-DEFAULT shadow-2xl">
                ${currentQStudent.id && html`
                    <div className="absolute -top-12 sm:-top-6 start-1/2 -translate-x-1/2 sm:translate-x-0 sm:start-8 flex flex-col sm:flex-row items-center gap-1 sm:gap-3 bg-white dark:bg-gray-800 shadow-xl p-2 sm:p-2 sm:pl-4 rounded-xl sm:rounded-full border border-gray-100 dark:border-gray-700 z-10 animate-fade-in group hover:scale-105 transition-transform max-w-[90vw] sm:max-w-none text-center sm:text-start mx-auto w-max mb-8 sm:mb-0">
                        <${Luminova.Components.Avatar} name=${currentQStudent.nameAr || currentQStudent.name} image=${currentQStudent.image} isVerified=${currentQStudent.isVerified} size="w-8 h-8 shrink-0" />
                        <span className="text-xs sm:text-sm font-black mx-1 text-brand-DEFAULT group-hover:text-brand-gold break-words whitespace-normal">${lang === 'ar' ? currentQStudent.nameAr || currentQStudent.name : currentQStudent.nameEn || currentQStudent.name}</span>
                        ${currentQStudent.isFounder && html`<span className="text-xs bg-brand-gold text-black font-black px-2 py-0.5 rounded-full shadow-md shrink-0">${Luminova.i18n[lang].founder}</span>`}
                        <span className="text-xs font-bold opacity-50 hidden sm:inline border-r pr-2 dark:border-gray-700 shrink-0">:المساهم بالسؤال</span>
                    </div>
                `}

                <div className="flex-1 mt-6">
                    <div className="flex justify-between items-start mb-8 ${q.mediaUrl ? '' : 'border-b border-gray-200 dark:border-gray-700 pb-6'}">
                        <h3 className="text-3xl font-bold leading-relaxed w-[85%]">${q.text || q.textAr}</h3>
                        <span className="text-xl font-black bg-brand-gold/20 text-brand-gold px-4 py-2 rounded-xl border border-brand-gold/50 shadow-sm shrink-0">${q.score} ${Luminova.i18n[lang].score}</span>
                    </div>
                    ${q.mediaUrl && html`
                        <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-6 w-full flex justify-center">
                            <div className="w-full max-h-[400px] rounded-2xl shadow-md bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-gray-800 overflow-hidden relative *:max-h-[400px] *:object-contain">
                                <${Luminova.Components.SmartMedia} url=${q.mediaUrl} lang=${lang} />
                            </div>
                        </div>
                    `}
                    
                    ${q.type === 'mcq' && html`
                        <div className="space-y-4 max-w-2xl mx-auto">
                            ${(q.options || q.optionsAr || []).map((opt, i) => html`
                                <button key=${i} onClick=${() => !isFeedbackRevealed && setAnswers({ ...answers, [q.id]: i })}
                                    disabled=${isFeedbackRevealed}
                                    className=${`w-full text-start p-5 rounded-2xl border-4 transition-all duration-200 text-lg font-bold shadow-sm ${answers[q.id] === i ? 'border-brand-DEFAULT bg-brand-DEFAULT/10 scale-105 shadow-xl' : 'border-transparent bg-gray-100 dark:bg-gray-800/80 hover:border-gray-300 dark:hover:border-gray-600 hover:scale-[1.02]'} ${isFeedbackRevealed ? 'opacity-70 cursor-not-allowed object-none' : ''}`}>
                                    <span className="inline-block w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 text-center leading-8 mr-4 ml-4">${String.fromCharCode(65 + i)}</span>
                                    ${opt}
                                </button>
                            `)}
                        </div>
                    `}

                    ${q.type === 'multi_select' && html`
                        <div className="space-y-4 max-w-2xl mx-auto">
                            ${(q.options || q.optionsAr || []).map((opt, i) => {
            const selected = answers[q.id] || [];
            const isSelected = selected.includes(i);
            return html`
                                    <button key=${i} disabled=${isFeedbackRevealed} onClick=${() => {
                    if (isFeedbackRevealed) return;
                    const next = isSelected ? selected.filter(x => x !== i) : [...selected, i];
                    setAnswers({ ...answers, [q.id]: next });
                }}
                                    className=${`w-full text-start p-5 rounded-2xl border-4 transition-all duration-200 text-lg font-bold shadow-sm flex items-center gap-4 ${isSelected ? 'border-brand-DEFAULT bg-brand-DEFAULT/10 scale-[1.02] shadow-xl' : 'border-transparent bg-gray-100 dark:bg-gray-800/80 hover:border-gray-300 dark:hover:border-gray-600'} ${isFeedbackRevealed ? 'opacity-70 cursor-not-allowed' : ''}`}>
                                        <div className=${`w-8 h-8 rounded-xl flex items-center justify-center border-2 text-xl transition-colors ${isSelected ? 'bg-brand-DEFAULT border-brand-DEFAULT text-white' : 'border-gray-400'}`}>
                                            ${isSelected && '✓'}
                                        </div>
                                        ${opt}
                                    </button>
                                `;
        })}
                        </div>
                    `}

                    ${q.type === 'essay' && html`
                        <div className="max-w-3xl mx-auto">
                            <textarea 
                                disabled=${isFeedbackRevealed}
                                className=${`w-full p-6 rounded-2xl bg-gray-50 dark:bg-gray-900/80 border-4 border-gray-200 dark:border-gray-700 focus:border-brand-DEFAULT focus:bg-white dark:focus:bg-black outline-none min-h-[250px] text-lg transition-all shadow-inner resize-y ${isFeedbackRevealed ? 'opacity-70 font-bold' : ''}`}
                                placeholder=${lang === 'ar' ? 'اكتب إجابتك بتفصيل هنا...' : 'Type your detailed answer here...'}
                                value=${answers[q.id] || ''}
                                onChange=${(e) => !isFeedbackRevealed && setAnswers({ ...answers, [q.id]: e.target.value })}
                            />
                        </div>
                    `}

                    ${(isFeedbackRevealed && quiz.feedbackMode === 'immediate') && html`
                        <div className="mt-10 p-6 rounded-2xl bg-white dark:bg-gray-900 border-2 border-brand-DEFAULT/40 shadow-xl animate-fade-in relative overflow-hidden">
                            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-transparent via-brand-DEFAULT to-transparent"></div>
                            <h4 className="font-black text-2xl mb-4">نتيجتك في هذا السؤال:</h4>
                            
                            ${q.type !== 'essay' && html`
                                <p className="flex items-start gap-2 mb-4" dangerouslySetInnerHTML=${{ __html: `<span class='font-bold opacity-70 min-w-[120px]'>النموذجية:</span> <strong class="text-green-600 dark:text-green-400 font-bold text-xl">${(q.type === 'mcq' ? (q.options || q.optionsAr)[q.correctAnswers[0]] : (q.correctAnswers || []).map(c => (q.options || q.optionsAr)[c]).join(' <span class="text-gray-400">|</span> '))}</strong>` }} />
                            `}
                            ${q.type === 'essay' && html`
                                <p className="font-bold opacity-70 border-b pb-2 mb-2">الإجابة النموذجية المرجعية:</p>
                                <p className="font-bold text-green-600 dark:text-green-400 text-lg mb-4 leading-relaxed">${q.modelAnswer || q.modelAnswerAr}</p>
                            `}

                            ${(q.explanation || q.explanationAr) && html`
                                <div className="mt-4 p-5 bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/30 dark:to-gray-900 border border-amber-200 dark:border-amber-700/30 rounded-xl shadow-inner relative">
                                    <div className="absolute -top-3 -right-2 opacity-20 text-6xl">💡</div>
                                    <h5 className="font-black text-amber-600 dark:text-amber-500 mb-2 flex items-center gap-2">💡 تعليل الإجابة:</h5>
                                    <p className="text-lg leading-relaxed font-bold text-gray-800 dark:text-gray-200">${(q.explanation || q.explanationAr)}</p>
                                </div>
                            `}
                        </div>
                    `}

                </div>
            </${Luminova.Components.GlassCard}>

            <div className="flex justify-between items-center bg-white/50 dark:bg-gray-800/50 p-4 rounded-2xl shadow-sm backdrop-blur">
                <${Luminova.Components.Button} variant="glass" disabled=${currentIndex === 0} onClick=${() => { setCurrentIndex(i => i - 1); setIsFeedbackRevealed(false); }} className="px-8 py-3 text-lg rounded-full">
                    ${lang === 'ar' ? 'السابق' : 'Previous'}
                </${Luminova.Components.Button}>
                
                ${quiz.feedbackMode === 'immediate' && !isFeedbackRevealed ? html`
                    <${Luminova.Components.Button} disabled=${answers[q.id] === undefined || (Array.isArray(answers[q.id]) && !answers[q.id].length)} onClick=${() => setIsFeedbackRevealed(true)} 
                        className="px-10 py-3 text-lg bg-blue-500 hover:bg-blue-600 rounded-full shadow-lg shadow-blue-500/30 font-black animate-pulse transition-transform hover:scale-105">
                        ✅ تحقق من الإجابة
                    </${Luminova.Components.Button}>
                ` : currentIndex === questions.length - 1 ? html`
                    <${Luminova.Components.Button} onClick=${handleFinish} className="px-10 py-3 text-lg bg-green-500 hover:bg-green-600 rounded-full shadow-lg shadow-green-500/30 font-black animate-pulse">
                        <${Luminova.Icons.CheckCircle} /> ${lang === 'ar' ? 'إنهاء الاختبار ورؤية النتيجة' : 'Finish & View Results'}
                    </${Luminova.Components.Button}>
                ` : html`
                    <${Luminova.Components.Button} onClick=${() => { setCurrentIndex(i => i + 1); setIsFeedbackRevealed(false); }} className="px-10 py-3 text-lg rounded-full shadow-lg shadow-brand-DEFAULT/30 group">
                        ${lang === 'ar' ? 'التالي' : 'Next'} <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">→</span>
                    </${Luminova.Components.Button}>
                `}
            </div>
        </div>
    `;
    };

    // ==========================================

})();
