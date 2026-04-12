Luminova.Pages.AcademicHierarchyPage = ({ data, lang, setView, setActiveQuiz, setActiveSummary }) => {
        const [selectedYear, setSelectedYear] = useState(null);
        const [selectedSem, setSelectedSem] = useState(null);
        const [selectedSub, setSelectedSub] = useState(null);
        const [activeTab, setActiveTab] = useState('summaries');
        const [activeAttachmentItem, setActiveAttachmentItem] = useState(null);

        const semesters = data.semesters.filter(s => s.yearId === selectedYear?.id);
        const subjects  = data.subjects.filter(s => s.semesterId === selectedSem?.id);
        const summaries = data.summaries.filter(s => s.subjectId === selectedSub?.id);
        const quizzes   = data.quizzes.filter(q => q.subjectId === selectedSub?.id);

        // ── LEVEL 3: Attachments Sub-View ──────────────────────────────────────
        // Back button returns to Level 2 (Subject Dashboard), NOT Level 1
        if (activeAttachmentItem) {
            return html`<${Luminova.Components.SummaryCard}
                item=${activeAttachmentItem}
                data=${data}
                lang=${lang}
                onClose=${() => setActiveAttachmentItem(null)}
            />`;
        }

        // ── LEVEL 2: Subject Dashboard (Premium Tabs) ──────────────────────────
        if (selectedSub) {
            const subjectName = selectedSub[`name${lang === 'ar' ? 'Ar' : 'En'}`] || selectedSub.nameAr || selectedSub.nameEn;
            const semName = selectedSem ? (selectedSem[`name${lang === 'ar' ? 'Ar' : 'En'}`] || selectedSem.nameAr) : '';
            return html`
            <div className="animate-fade-in space-y-6">

                <!-- Breadcrumb / Back bar -->
                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        onClick=${() => setSelectedSub(null)}
                        className="flex items-center gap-2 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 font-bold bg-white dark:bg-gray-800 px-4 py-2.5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-200"
                    >
                        <span>${lang === 'ar' ? '\u2192 \u0631\u062c\u0648\u0639 \u0644\u0644\u0645\u0648\u0627\u062f' : '\u2190 Back to Subjects'}</span>
                    </button>
                    <div className="flex items-center gap-2 text-sm text-slate-400 font-semibold flex-wrap">
                        ${semName && html`<span className="opacity-60">${semName}</span>`}
                        ${semName && html`<span className="opacity-40 text-lg leading-none">\u203a</span>`}
                        <span className="text-blue-600 dark:text-blue-400 font-black">${subjectName}</span>
                    </div>
                </div>

                <!-- Subject title -->
                <h2 className="text-3xl sm:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-brand-DEFAULT to-brand-gold pb-1" style="word-break:normal;overflow-wrap:anywhere">${subjectName}</h2>

                <!-- Premium pill tabs -->
                <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-gray-800/60 rounded-2xl w-fit shadow-inner">
                    <button onClick=${() => setActiveTab('summaries')}
                        className=${`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${activeTab === 'summaries' ? 'bg-blue-600 text-white shadow-md scale-[1.02]' : 'bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-gray-700'}`}>
                        ${Luminova.i18n[lang].summaries} <span className="ms-1 opacity-70 font-normal">(${summaries.length})</span>
                    </button>
                    <button onClick=${() => setActiveTab('quizzes')}
                        className=${`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${activeTab === 'quizzes' ? 'bg-blue-600 text-white shadow-md scale-[1.02]' : 'bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-gray-700'}`}>
                        ${Luminova.i18n[lang].quizzes} <span className="ms-1 opacity-70 font-normal">(${quizzes.length})</span>
                    </button>
                </div>

                <!-- Animated content area -->
                <div className="animate-fade-in">
                    ${activeTab === 'summaries' ? html`
                        <${Luminova.Components.TimelineFeed}
                            items=${summaries}
                            students=${data.students}
                            subjects=${data.subjects}
                            lang=${lang}
                            onQuizClick=${() => {}}
                            onSummaryClick=${(item) => setActiveAttachmentItem(item)}
                        />
                        ${summaries.length === 0 ? html`<div className="text-center py-20 opacity-50 border-2 border-dashed rounded-2xl dark:border-gray-700">${Luminova.i18n[lang].emptyState}</div>` : null}
                    ` : html`
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            ${quizzes.map(q => {
                                const pub = Luminova.getStudent(q.publisherId, data.students);
                                return html`
                                <${Luminova.Components.GlassCard} key=${q.id} className="border-t-4 border-t-brand-gold hover:scale-[1.01] hover:shadow-xl transition-all duration-300 rounded-2xl">
                                    ${q.publisherId && html`
                                        <div className="flex items-center gap-3 mb-4 bg-gray-50 dark:bg-gray-800/80 p-3 rounded-xl border border-gray-100 dark:border-gray-700 w-fit">
                                            <${Luminova.Components.Avatar} name=${pub.nameAr || pub.name} image=${pub.image} isVIP=${pub.isVIP} isFounder=${pub.isFounder || q.publisherId === 's_founder_hardcoded'} isVerified=${pub.isVerified} size="w-8 h-8" />
                                            <div>
                                                <span className="text-xs opacity-50 block leading-tight font-bold">${lang === 'ar' ? '\u0646\u064f\u0634\u0631 \u0628\u0648\u0627\u0633\u0637\u0629:' : 'Published by:'}</span>
                                                <span className="text-sm font-black">${lang === 'ar' ? (pub.nameAr || pub.name) : (pub.nameEn || pub.name)}</span>
                                            </div>
                                        </div>
                                    `}
                                    <h3 className="text-xl font-bold mb-3" style="word-break:normal;overflow-wrap:anywhere">${q[`title${lang === 'ar' ? 'Ar' : 'En'}`] || q.titleAr || q.titleEn || q.title || '\u0628\u062f\u0648\u0646 \u0639\u0646\u0648\u0627\u0646'}</h3>
                                    <p className="text-sm opacity-70 mb-5 bg-black/5 dark:bg-white/5 inline-block px-3 py-1 rounded-full">${(q.questions || []).length} ${Luminova.i18n[lang].questions}</p>
                                    <${Luminova.Components.Button} onClick=${() => { setActiveQuiz(q); setView('quiz'); }} className="w-full text-base py-3">
                                        ${Luminova.i18n[lang].startQuiz}
                                    </${Luminova.Components.Button}>
                                </${Luminova.Components.GlassCard}>`;
                            })}
                            ${quizzes.length === 0 ? html`<div className="col-span-2 text-center py-20 opacity-50 border-2 border-dashed rounded-2xl dark:border-gray-700">${Luminova.i18n[lang].emptyState}</div>` : null}
                        </div>
                    `}
                </div>
            </div>`;
        }

        // ── LEVEL 1: Catalog View ──────────────────────────────────────────────
        return html`
        <div className="animate-fade-in space-y-8">

            <!-- Filter bar: Years + Semesters -->
            <div className="glass-card p-5 rounded-2xl shadow-md space-y-5">
                <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">${Luminova.i18n[lang].years}</p>
                    <div className="flex flex-wrap gap-2">
                        ${data.years.map(y => html`
                            <button key=${y.id}
                                onClick=${() => { setSelectedYear(y); setSelectedSem(null); setSelectedSub(null); }}
                                className=${`px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 ${selectedYear?.id === y.id ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-gray-700'}`}
                            >${y[`name${lang === 'ar' ? 'Ar' : 'En'}`] || y.nameAr}</button>
                        `)}
                    </div>
                </div>
                ${selectedYear && semesters.length > 0 && html`
                    <div className="animate-fade-in border-t border-gray-100 dark:border-gray-700 pt-4">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">${Luminova.i18n[lang].semesters}</p>
                        <div className="flex flex-wrap gap-2">
                            ${semesters.map(s => html`
                                <button key=${s.id}
                                    onClick=${() => { setSelectedSem(s); setSelectedSub(null); }}
                                    className=${`px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 ${selectedSem?.id === s.id ? 'bg-brand-DEFAULT text-white shadow-md' : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-gray-700'}`}
                                >${s[`name${lang === 'ar' ? 'Ar' : 'En'}`] || s.nameAr}</button>
                            `)}
                        </div>
                    </div>
                `}
            </div>

            <!-- Subject cards grid -->
            ${selectedSem ? html`
                <div className="animate-fade-in">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">
                        ${Luminova.i18n[lang].subjects} <span className="opacity-50">(${subjects.length})</span>
                    </p>
                    ${subjects.length > 0 ? html`
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            ${subjects.map(sub => {
                                const subSummaries = data.summaries.filter(s => s.subjectId === sub.id);
                                const subQuizzes   = data.quizzes.filter(q => q.subjectId === sub.id);
                                const subName = sub[`name${lang === 'ar' ? 'Ar' : 'En'}`] || sub.nameAr;
                                return html`
                                <button key=${sub.id}
                                    onClick=${() => { setSelectedSub(sub); setActiveTab('summaries'); }}
                                    className="glass-card rounded-2xl p-6 text-start flex flex-col gap-4 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border border-transparent hover:border-blue-200 dark:hover:border-blue-800 group w-full"
                                >
                                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-brand-DEFAULT flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200 text-white shrink-0">
                                        ${Luminova.Icons.Book()}
                                    </div>
                                    <h3 className="font-black text-base text-gray-900 dark:text-white leading-snug flex-1" style="word-break:normal;overflow-wrap:anywhere">
                                        ${subName}
                                    </h3>
                                    <div className="flex gap-2 flex-wrap">
                                        <span className="text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full">
                                            ${subSummaries.length} ${lang === 'ar' ? '\u062a\u0644\u062e\u064a\u0635' : 'Summaries'}
                                        </span>
                                        <span className="text-xs font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full">
                                            ${subQuizzes.length} ${lang === 'ar' ? '\u0627\u062e\u062a\u0628\u0627\u0631' : 'Quizzes'}
                                        </span>
                                    </div>
                                </button>`;
                            })}
                        </div>
                    ` : html`
                        <div className="flex flex-col items-center justify-center py-24 opacity-50 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-3xl">
                            <${Luminova.Icons.Book} />
                            <p className="mt-4 text-lg font-bold">${lang === 'ar' ? '\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0648\u0627\u062f \u0641\u064a \u0647\u0630\u0627 \u0627\u0644\u062a\u0631\u0645' : 'No subjects in this semester'}</p>
                        </div>
                    `}
                </div>
            ` : html`
                <div className="flex flex-col items-center justify-center min-h-[45vh] opacity-40 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-3xl bg-gray-50/50 dark:bg-gray-900/20">
                    <${Luminova.Icons.Book} />
                    <p className="mt-4 text-xl font-bold text-center px-6">${lang === 'ar' ? '\u0627\u062e\u062a\u0631 \u0641\u0631\u0642\u0629 \u0648\u062a\u0631\u0645 \u0644\u0639\u0631\u0636 \u0627\u0644\u0645\u0648\u0627\u062f \u0627\u0644\u062f\u0631\u0627\u0633\u064a\u0629' : 'Select a Year & Semester to browse subjects'}</p>
                </div>
            `}
        </div>
        `;
    };

