(function () {
    "use strict";
    if (!window.__LUMINOVA) return;
    const { useState, useEffect, useMemo, useCallback } = window.React;
    const html = window.htm.bind(window.React.createElement);
    const Luminova = window.__LUMINOVA;

Luminova.Components.TimelineFeed = ({ items, students, subjects, lang, onQuizClick, onSummaryClick }) => {
        const PAGE_SIZE_INIT = 10;
        const PAGE_SIZE_MORE = 5;
        const [visibleCount, setVisibleCount] = useState(PAGE_SIZE_INIT);

        if (!items.length) return html`<div className="text-center py-10 opacity-50">${Luminova.i18n[lang].emptyState}</div>`;

        const visibleItems = items.slice(0, visibleCount);
        const hasMore = visibleCount < items.length;

        return html`
        <div className="space-y-6 relative border-s border-gray-200 dark:border-gray-700 ml-3 mr-3 px-4">
            ${visibleItems.map(item => {
            const student = Luminova.getStudent(item.studentId, students);
            const subject = subjects.find(s => s.id === item.subjectId) || {};
            const isQuizItem = item.isSingleQuestion;
            return html`
                    <div key=${item.id} className="relative">
                        <span className="absolute flex items-center justify-center w-6 h-6 bg-brand-DEFAULT rounded-full -start-3 ring-8 ring-white dark:ring-gray-900 mt-2 text-white">
                            ${isQuizItem ? Luminova.Icons.CheckCircle() : Luminova.Icons.Book()}
                        </span>
                        <${Luminova.Components.GlassCard} className="ms-6">
                            <div className="flex items-start gap-4 mb-4">
                                <${Luminova.Components.Avatar} name=${student.nameAr || student.name} image=${student.image} isVIP=${student.isVIP} isVerified=${student.isVerified} isFounder=${student.isFounder || (student.id === 's_founder')} size="w-10 h-10" />
                                <div className="flex-1">
                                    <h4 className="font-bold whitespace-normal break-words flex items-center gap-1 flex-wrap" style=${{ wordBreak: 'normal', overflowWrap: 'anywhere' }}>
                                        ${lang === 'ar' ? (student.nameAr || student.name) : (student.nameEn || student.name)}
                                        ${student.isVIP && html`<span className="text-xs text-brand-DEFAULT bg-brand-DEFAULT/10 px-2 py-0.5 rounded-full ml-2">VIP ✨</span>`}
                                        ${!student.isFounder && student.role === 'doctor' && html`<span className="text-xs bg-teal-500 text-white px-2 py-0.5 rounded-full font-black ml-1">🎓 ${lang === 'ar' ? 'دكتور' : 'Doctor'}</span>`}
                                    </h4>
                                    <p className="text-xs opacity-70">${subject[`name${lang === 'ar' ? 'Ar' : 'En'}`] || subject.nameAr || subject.nameEn}</p>
                                </div>
                                <div className="text-xs opacity-50">${Luminova.formatDate(item.timestamp, lang)}</div>
                            </div>
                            <h3 className="text-xl font-bold mb-2">${item[`title${lang === 'ar' ? 'Ar' : 'En'}`] || item.titleAr || item.titleEn}</h3>
                            <${Luminova.Components.SmartText} text=${item[`content${lang === 'ar' ? 'Ar' : 'En'}`] || item.contentAr || item.contentEn} lang=${lang} />
                            ${((item.mediaUrls && item.mediaUrls.length > 0) || item.mediaUrl) ? html`
                                <div className="mt-4">
                                    <button onClick=${() => onSummaryClick && onSummaryClick(item.id)} className="w-full py-3 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-600 dark:text-indigo-400 hover:text-white transition-all rounded-xl font-bold flex items-center justify-center gap-2 border border-indigo-500/20 shadow-sm">
                                        <span className="text-xl">📎</span>
                                        <span>${lang === 'ar' ? 'عرض المرفقات والشرح' : 'View Attachments'}</span>
                                    </button>
                                </div>
                            ` : null}
                            ${item.isSingleQuestion && html`
                                <div className="mt-4">
                                    <${Luminova.Components.Button} onClick=${() => onQuizClick(item.parentQuiz)}>${Luminova.i18n[lang].startQuiz}</${Luminova.Components.Button}>
                                </div>
                            `}
                        </${Luminova.Components.GlassCard}>
                    </div>
                `;
            })}

            ${hasMore && html`
                <div className="flex justify-center pt-4 pb-2">
                    <button
                        onClick=${() => setVisibleCount(prev => prev + PAGE_SIZE_MORE)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition-all block mx-auto mt-6 w-full sm:w-auto text-center"
                    >
                        <span>${lang === 'ar' ? 'عرض المزيد' : 'Load More'}</span>
                        <span className="opacity-50 text-sm">(${items.length - visibleCount} ${lang === 'ar' ? 'متبقية' : 'remaining'})</span>
                    </button>
                </div>
            `}
        </div>
    `;
    };

    Luminova.Pages = {};

    Luminova.Pages.HomePage = ({ data, lang, setView, setActiveSummary }) => {
        const [newsVisibleCount, setNewsVisibleCount] = window.React.useState(5);
        const [latestCert, setLatestCert] = window.React.useState(null);
        const [newsSearchQuery, setNewsSearchQuery] = window.React.useState('');
        const [showSearch, setShowSearch] = window.React.useState(false);

        window.React.useEffect(() => {
            const handleCerts = (certs) => {
                if (!certs || !certs.length) return;
                let featured = certs.filter(c => c.isFeatured);
                featured.sort((a,b) => new Date(b.date) - new Date(a.date));
                if (featured.length > 0) {
                    setLatestCert(featured[0]);
                } else {
                    const allSorted = [...certs].sort((a,b) => new Date(b.date) - new Date(a.date));
                    setLatestCert(allSorted[0]);
                }
            };

            // Ensure loadCertificatesData exists (from certificate-engine.js)
            if (window.loadCertificatesData) {
                window.loadCertificatesData().then((certs) => {
                    window.console.log("Certs natively loaded:", certs);
                    handleCerts(certs);
                });
            } else {
                // If it wasn't loaded yet, try to load it dynamically
                const script = document.createElement('script');
                script.src = 'js/pages/certificate-engine.js?v=' + Date.now();
                script.onload = () => {
                    if(window.loadCertificatesData) {
                        window.loadCertificatesData().then((certs) => {
                            window.console.log("Certs dynamically loaded:", certs);
                            handleCerts(certs);
                        });
                    }
                };
                document.body.appendChild(script);
            }
        }, []);

        const topContributors = useMemo(() => {
            // Count contributions from: summaries + news + quiz questions + quiz creation
            const counts = {};

            const normalizeId = (id) => {
                if (!id) return null;
                if (id === 's_founder' || id === 's_founder_hardcoded' || id === 'founder_1') return Luminova.FOUNDER.id;
                return id;
            };

            data.summaries.forEach(s => {
                const sId = normalizeId(s.studentId);
                if (sId) counts[sId] = (counts[sId] || 0) + 1;
            });

            data.quizzes.forEach(quiz => {
                let authorCounts = {};
                (quiz.questions || []).forEach(q => {
                    const sId = normalizeId(q.studentId);
                    if (sId) authorCounts[sId] = (authorCounts[sId] || 0) + 1;
                });

                let maxQuestions = Math.max(0, ...Object.values(authorCounts));

                for (const [studentId, count] of Object.entries(authorCounts)) {
                    let earnedPoints = (count === maxQuestions && maxQuestions > 0) ? 2 : 1;
                    counts[studentId] = (counts[studentId] || 0) + earnedPoints;
                }
            });

            if (!counts[Luminova.FOUNDER.id]) {
                counts[Luminova.FOUNDER.id] = 0;
            }
            counts[Luminova.FOUNDER.id] = (counts[Luminova.FOUNDER.id] || 0) + 1;

            const sorted = Object.entries(counts)
                .map(([id, score]) => ({ id, score }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 5);

            return sorted
                .map(st => ({ student: Luminova.getStudent(st.id, data.students), score: st.score }))
                .filter(x => x.student && x.student.id !== 'unknown');
        }, [data.summaries, data.quizzes, data.students]);

        // Sorting official news newest first
        const sortedNews = [...(data.news || [])].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        const filteredNews = newsSearchQuery.trim() ? sortedNews.filter(n => {
            const tAr = n.titleAr || n.title || '';
            const tEn = n.titleEn || n.title || '';
            const query = newsSearchQuery.toLowerCase();
            return tAr.toLowerCase().includes(query) || tEn.toLowerCase().includes(query);
        }) : sortedNews;
        const visibleNews = newsSearchQuery.trim() ? filteredNews : filteredNews.slice(0, newsVisibleCount);

        return html`
        <div className="space-y-12 animate-fade-in pb-10">
            <!-- Section 1: Honor Roll -->
            ${topContributors.length > 0 && html`
                <div className="mb-10">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-brand-gold">${Luminova.i18n[lang].topContributors}</h2>
                    <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
                        ${topContributors.map((c, i) => html`
                            <${Luminova.Components.GlassCard} key=${c.student.id} className="min-w-[200px] flex-shrink-0 text-center flex flex-col items-center snap-center bg-gradient-to-b from-transparent to-brand-gold/5 border-b-4 border-b-brand-gold">
                                <div className="absolute top-2 right-2 text-xl font-black opacity-30">#${i + 1}</div>
                                <${Luminova.Components.Avatar} name=${c.student.nameAr || c.student.name} image=${c.student.image} isVIP=${c.student.isVIP} isFounder=${c.student.isFounder || c.student.id === 's_founder'} isVerified=${c.student.isVerified} size="w-16 h-16 mb-2" />
                                <h3 className="font-bold text-sm">${lang === 'ar' ? (c.student.nameAr || c.student.name) : (c.student.nameEn || c.student.name)}</h3>
                                <div className="text-xs opacity-70 mt-1">${c.score} ${lang === 'ar' ? 'مساهمة' : 'Contributions'}</div>
                            </${Luminova.Components.GlassCard}>
                        `)}
                    </div>
                </div>
            `}

            <!-- Section 2: Honor Roll Spotlight (Certificates) -->
            ${latestCert && Luminova.Components.CertificateImage && html`
                <div className="mb-10 w-full animate-fade-in">
                    <div className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] rounded-3xl shadow-2xl border border-slate-800 p-8 pt-10">
                        <!-- Decorative bg -->
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 opacity-10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                            
                            <!-- Content Side (RTL native: right on Desktop) -->
                            <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-start space-y-6">
                                <h2 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-gold to-yellow-200">
                                    ${lang === 'ar' ? 'نتوج التميز الأكاديمي' : 'Crowning Academic Excellence'}
                                </h2>
                                <p className="text-slate-300 text-base md:text-lg font-medium leading-relaxed max-w-lg">
                                    ${lang === 'ar' 
                                        ? 'نقدر ونوثق جهود طلابنا الاستثنائية. كل شهادة هي قصة نجاح موثقة ومحفوظة في اللوحة الشرفية للمنصة عبر نظام تشفير متقدم يعتمد على الاستجابة السريعة (QR Code).' 
                                        : 'We appreciate and document our students\' exceptional efforts. Each certificate is a success story, permanently archived via advanced QR cryptographic systems.'}
                                </p>
                                <button
                                    onClick=${() => setView('certificates')}
                                    className="inline-flex flex-row items-center justify-center gap-3 bg-gradient-to-r from-brand-DEFAULT to-blue-600 hover:from-brand-hover hover:to-blue-700 text-white font-black py-4 px-8 rounded-2xl shadow-xl shadow-brand-DEFAULT/30 transition-all hover:scale-105 active:scale-95 border-b-4 border-blue-800 text-lg sm:text-xl w-full sm:w-auto">
                                    <span>🏆</span>
                                    <span>${lang === 'ar' ? 'تصفح لوحة الشرف والشهادات' : 'Browse Honor Roll & Archive'}</span>
                                </button>
                            </div>

                            <!-- Showcase Side (Image) -->
                            <div className="w-full md:max-w-md">
                                <div className="bg-white/10 p-2 rounded-[24px] backdrop-blur-md border border-white/20 shadow-2xl rotate-1 hover:rotate-0 transition-transform duration-300">
                                    <${Luminova.Components.CertificateImage} 
                                        certificate=${latestCert} 
                                        lang=${lang} 
                                        mode="thumb" 
                                    />
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            `}

            <!-- Section 3: Official News -->


            ${sortedNews.length > 0 && html`
                <div className="mb-10">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold flex items-center gap-2">${Luminova.i18n[lang].news}</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        ${visibleNews.map((n, idx) => {
                            const author = Luminova.getStudent(n.studentId, data.students);
                            return html`
                                <${Luminova.Components.GlassCard} key=${idx} className=${`border-l-4 ${idx === 0 ? 'border-l-brand-gold bg-brand-gold/5' : 'border-l-brand-DEFAULT'}`}>
                                    ${n.studentId && html`
                                        <div className="flex items-center gap-3 mb-4 opacity-80 border-b border-gray-200 dark:border-gray-700 pb-3">
                                            <${Luminova.Components.Avatar} name=${author.nameAr || author.name} nameEn=${author.nameEn} image=${author.image} isVerified=${author.isVerified} isFounder=${author.isFounder} size="w-8 h-8" />
                                            <div className="text-sm font-bold flex items-center gap-2 flex-wrap">
                                                <span>${lang === 'ar' ? 'الناشر:' : 'Publisher:'}</span>
                                                <span className="whitespace-normal break-words" style=${{ wordBreak: 'normal', overflowWrap: 'anywhere' }}>${lang === 'ar' ? (author.nameAr || author.name) : (author.nameEn || author.name)}</span>
                                                ${author.isVIP && html`<span className="text-xs text-brand-DEFAULT">✨</span>`}
                                                ${author.isFounder && html`<span className="text-xs bg-brand-gold text-black px-2 py-0.5 rounded-full">${Luminova.i18n[lang].founder}</span>`}
                                                ${!author.isFounder && author.role === 'doctor' && html`<span className="text-xs bg-teal-500 text-white px-2 py-0.5 rounded-full font-black">🎓 ${lang === 'ar' ? 'دكتور' : 'Doctor'}</span>`}
                                            </div>
                                        </div>
                                    `}
                                    <h3 className="text-xl font-bold mb-2">${n[`title${lang === 'ar' ? 'Ar' : 'En'}`] || n.titleAr || n.titleEn}</h3>
                                    <${Luminova.Components.SmartText} text=${n[`content${lang === 'ar' ? 'Ar' : 'En'}`] || n.contentAr || n.contentEn} lang=${lang} />
                                    ${((n.mediaUrls && n.mediaUrls.length > 0) || n.mediaUrl) ? html`
                                        <div className="mt-4">
                                            <button onClick=${() => { setActiveSummary(n.id); setView('summaryDetail'); }} className="w-full py-3 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-600 dark:text-indigo-400 hover:text-white transition-all rounded-xl font-bold flex items-center justify-center gap-2 border border-indigo-500/20 shadow-sm">
                                                <span className="text-xl">📎</span>
                                                <span>${lang === 'ar' ? 'عرض المرفقات المنشورة' : 'View Attachments'}</span>
                                            </button>
                                        </div>
                                    ` : null}
                                    <div className="text-xs opacity-50 mt-4 font-semibold">${Luminova.formatDate(n.timestamp, lang)}</div>
                                </${Luminova.Components.GlassCard}>
                            `;
                        })}
                        
                        ${visibleNews.length === 0 && newsSearchQuery.trim() !== '' && html`
                            <div className="col-span-full text-center py-10 opacity-50 font-bold text-lg dark:text-gray-300">
                                ${lang === 'ar' ? 'لا توجد أخبار مطابقة لبحثك' : 'No news matches your search'}
                            </div>
                        `}

                        <div className="col-span-full flex flex-col sm:flex-row justify-center items-center gap-4 mt-6">
                            ${(!newsSearchQuery.trim()) && (visibleNews.length < sortedNews.length) && html`
                                <button onClick=${() => setNewsVisibleCount(prev => prev + 5)} className="px-8 py-3 bg-brand-DEFAULT hover:bg-brand-hover text-white font-bold rounded-xl shadow-md transition-transform hover:scale-105 active:scale-95">
                                    ${lang === 'ar' ? 'عرض المزيد' : 'Load More'}
                                </button>
                            `}
                            
                            <div className="flex flex-col items-center sm:relative sm:items-end w-full sm:w-auto">
                                <button onClick=${() => { setShowSearch(!showSearch); if(showSearch) setNewsSearchQuery(''); }} className="w-14 h-14 rounded-full bg-white dark:bg-slate-800 shadow-xl border border-gray-100 dark:border-gray-700 flex items-center justify-center text-2xl hover:scale-110 active:scale-95 transition-all focus:outline-none z-10 relative">
                                    ${showSearch ? '✖️' : '🔍'}
                                </button>
                                ${showSearch && html`
                                    <div className="mt-4 sm:mt-0 sm:absolute sm:bottom-[120%] sm:end-0 sm:rtl:end-auto sm:rtl:start-0 w-full max-w-[calc(100vw-2rem)] sm:w-[350px] p-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl shadow-[20px_20px_60px_rgba(0,0,0,0.2)] dark:shadow-[0_10px_50px_rgba(0,0,0,0.6)] rounded-2xl border border-white/50 dark:border-gray-700 animate-fade-in z-50">
                                        <input 
                                            type="text" 
                                            autoFocus
                                            value=${newsSearchQuery} 
                                            onChange=${(e) => setNewsSearchQuery(e.target.value)} 
                                            placeholder=${lang === 'ar' ? 'بحث في الأخبار...' : 'Search news...'} 
                                            className="w-full px-4 py-3 bg-gray-50/50 dark:bg-slate-900/50 rounded-xl outline-none font-bold text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand-DEFAULT transition-shadow" 
                                        />
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>
                </div>
            `}
        </div>
    `;
    };

    Luminova.Pages.AcademicHierarchyPage = ({ data, lang, setView, setActiveQuiz, setActiveSummary }) => {
        const [selectedYear, setSelectedYear] = useState(data.years?.[0] || null);
        const [selectedSem, setSelectedSem] = useState(data.semesters?.find(s => s.yearId === data.years?.[0]?.id) || null);
        const [selectedSub, setSelectedSub] = useState(null);
        const [selectedSummaryId, setSelectedSummaryId] = useState(null);
        const [activeTab, setActiveTab] = useState('summaries');

        useEffect(() => {
            if (data.semesters && selectedYear) {
                const sems = data.semesters.filter(s => s.yearId === selectedYear.id);
                setSelectedSem(sems.length > 0 ? sems[0] : null);
            }
        }, [selectedYear?.id, data.semesters]);

        const semesters = selectedYear ? data.semesters.filter(s => s.yearId === selectedYear.id) : [];
        const subjects = selectedSem ? data.subjects.filter(s => s.semesterId === selectedSem.id) : [];
        const summaries = selectedSub ? data.summaries.filter(s => s.subjectId === selectedSub.id) : [];
        const quizzes = selectedSub ? data.quizzes.filter(q => q.subjectId === selectedSub.id) : [];

        // LEVEL 3: ATTACHMENTS SUB-VIEW
        if (selectedSummaryId) {
            const targetSummary = (data.summaries || []).find(s => s.id === selectedSummaryId) || (data.news || []).find(s => s.id === selectedSummaryId);
            if (!targetSummary) return null;
            const author = Luminova.getStudent(targetSummary.studentId, data.students);
            return html`
                <div className="animate-fade-in w-full max-w-4xl mx-auto space-y-6">
                    <button onClick=${() => setSelectedSummaryId(null)} 
                        className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-xl font-bold transition-all shadow-sm w-fit">
                        ✖ ${lang === 'ar' ? 'رجوع للتلخيص' : 'Back to Summary'}
                    </button>
                    <${Luminova.Components.GlassCard} className="!p-8">
                        <div className="flex items-center gap-4 border-b border-gray-100 dark:border-gray-800 pb-6 mb-6">
                            <${Luminova.Components.Avatar} name=${author.nameAr || author.name} image=${author.image} isVIP=${author.isVIP} isFounder=${author.isFounder || author.id === 's_founder'} isVerified=${author.isVerified} size="w-14 h-14" />
                            <div>
                                <h3 className="font-bold text-lg">${lang === 'ar' ? (author.nameAr || author.name) : (author.nameEn || author.name)}</h3>
                                <span className="text-sm opacity-60">${Luminova.formatDate(targetSummary.timestamp, lang)}</span>
                            </div>
                        </div>
                        <h2 className="text-3xl font-black mb-4">${targetSummary[`title${lang === 'ar' ? 'Ar' : 'En'}`] || targetSummary.titleAr || targetSummary.titleEn}</h2>
                        <div className="text-lg opacity-90 mb-8 whitespace-pre-wrap"><${Luminova.Components.SmartText} text=${targetSummary[`content${lang === 'ar' ? 'Ar' : 'En'}`] || targetSummary.contentAr || targetSummary.contentEn} lang=${lang} /></div>
                        
                        <div className="space-y-4">
                            <h4 className="text-xl font-bold border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">${lang === 'ar' ? 'المرفقات' : 'Attachments'}</h4>
                            <${Luminova.Components.SmartMedia} url=${targetSummary.mediaUrls || targetSummary.mediaUrl} lang=${lang} />
                        </div>
                    </${Luminova.Components.GlassCard}>
                </div>
            `;
        }

        // LEVEL 2: SUBJECT SUB-VIEW (PREMIUM DASHBOARD)
        if (selectedSub) {
            return html`
                <div className="animate-fade-in space-y-8">
                    <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
                        <div className="flex items-center gap-4">
                            <button onClick=${() => setSelectedSub(null)} 
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors border border-slate-700 font-bold backdrop-blur-sm shadow-sm">
                                ${lang === 'ar' ? 'رجوع للمواد ➔' : '➔ Back to Semester'}
                            </button>
                            <h2 className="hidden sm:block text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-brand-DEFAULT to-brand-gold tracking-tight">
                                ${selectedSub[`name${lang === 'ar' ? 'Ar' : 'En'}`] || selectedSub.nameAr}
                            </h2>
                        </div>
                        <div className="relative shrink-0">
                            <select 
                                value=${activeTab}
                                onChange=${(e) => setActiveTab(e.target.value)}
                                className=${`appearance-none bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl outline-none cursor-pointer shadow-sm text-sm transition-colors ` + (lang === 'ar' ? 'pl-8' : 'pr-8')}
                            >
                                <option value="summaries" className="bg-slate-800 text-white">${lang === 'ar' ? 'التلخيصات 📚' : 'Summaries 📚'}</option>
                                <option value="quizzes" className="bg-slate-800 text-white">${lang === 'ar' ? 'الاختبارات 📝' : 'Quizzes 📝'}</option>
                            </select>
                            <div className=${`pointer-events-none absolute inset-y-0 flex items-center px-2 text-white ` + (lang === 'ar' ? 'left-0' : 'right-0')}>
                                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="animate-fade-in mt-6 max-w-5xl mx-auto">
                        ${activeTab === 'summaries' ? html`
                            <${Luminova.Components.TimelineFeed} items=${summaries} students=${data.students} subjects=${data.subjects} lang=${lang} onQuizClick=${() => { }} onSummaryClick=${(itemId) => setSelectedSummaryId(itemId)} />
                        ` : html`
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                ${quizzes.map(q => html`
                                    <${Luminova.Components.GlassCard} key=${q.id} className="border-t-4 border-t-brand-gold hover:scale-[1.02] transition-transform shadow-md hover:shadow-xl">
                                        ${q.publisherId && html`
                                            <div className="flex items-center gap-3 mb-4 bg-gray-50 dark:bg-gray-800/80 p-3 rounded-xl border border-gray-100 dark:border-gray-700 w-fit shrink-0">
                                                <${Luminova.Components.Avatar} name=${Luminova.getStudent(q.publisherId, data.students).nameAr || Luminova.getStudent(q.publisherId, data.students).name} image=${Luminova.getStudent(q.publisherId, data.students).image} isVIP=${Luminova.getStudent(q.publisherId, data.students).isVIP} isFounder=${Luminova.getStudent(q.publisherId, data.students).isFounder || q.publisherId === 's_founder_hardcoded'} isVerified=${Luminova.getStudent(q.publisherId, data.students).isVerified} size="w-8 h-8" />
                                                <div>
                                                    <span className="text-xs opacity-50 block leading-tight font-bold">نُشر بواسطة:</span>
                                                    <span className="text-sm font-black flex items-center gap-1">${lang === 'ar' ? (Luminova.getStudent(q.publisherId, data.students).nameAr || Luminova.getStudent(q.publisherId, data.students).name) : (Luminova.getStudent(q.publisherId, data.students).nameEn || Luminova.getStudent(q.publisherId, data.students).name)}</span>
                                                </div>
                                            </div>
                                        `}
                                        <h3 className="text-2xl font-bold mb-3">${q[`title${lang === 'ar' ? 'Ar' : 'En'}`] || q.titleAr || q.titleEn || q.title || 'بدون عنوان'}</h3>
                                        <p className="text-sm opacity-70 mb-6 bg-black/5 dark:bg-white/5 inline-block px-3 py-1 rounded-full">${(q.questions || []).length} ${Luminova.i18n[lang].questions}</p>
                                        <${Luminova.Components.Button} onClick=${() => { setActiveQuiz(q); setView('quiz'); }} className="w-full text-lg py-3 rounded-xl shadow-md">
                                            ${Luminova.i18n[lang].startQuiz}
                                        </${Luminova.Components.Button}>
                                    </${Luminova.Components.GlassCard}>
                                `)}
                                ${quizzes.length === 0 ? html`
                                    <div className="col-span-full text-center py-20 opacity-50 border-2 border-dashed rounded-2xl dark:border-gray-700 font-bold text-xl">${Luminova.i18n[lang].emptyState}</div>
                                ` : null}
                            </div>
                        `}
                    </div>
                </div>
            `;
        }

        // LEVEL 1: CATALOG VIEW (ROOT)
        return html`
            <div className="animate-fade-in space-y-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 max-w-4xl mx-auto">
                    <div className="relative">
                        <select 
                            value=${selectedYear?.id || ''} 
                            onChange=${(e) => {
                                const year = data.years.find(y => y.id === e.target.value);
                                setSelectedYear(year);
                            }}
                            className="appearance-none w-full bg-slate-800/50 border border-slate-700 text-white rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer shadow-sm font-bold text-center"
                        >
                            ${data.years.map(y => html`
                                <option key=${y.id} value=${y.id} className="bg-slate-800 text-white opacity-100">${y[`name${lang === 'ar' ? 'Ar' : 'En'}`] || y.nameAr || y.nameEn}</option>
                            `)}
                        </select>
                        <div className=${`pointer-events-none absolute inset-y-0 flex items-center text-slate-400 ` + (lang === 'ar' ? 'left-4' : 'right-4')}>
                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>

                    ${selectedYear && semesters.length > 0 && html`
                        <div className="relative animate-fade-in">
                            <select 
                                value=${selectedSem?.id || ''} 
                                onChange=${(e) => {
                                    const sem = semesters.find(s => s.id === e.target.value);
                                    setSelectedSem(sem);
                                }}
                                className="appearance-none w-full bg-slate-800/50 border border-slate-700 text-white rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer shadow-sm font-bold text-center"
                            >
                                ${semesters.map(s => html`
                                    <option key=${s.id} value=${s.id} className="bg-slate-800 text-white opacity-100">${s[`name${lang === 'ar' ? 'Ar' : 'En'}`] || s.nameAr || s.nameEn}</option>
                                `)}
                            </select>
                            <div className=${`pointer-events-none absolute inset-y-0 flex items-center text-slate-400 ` + (lang === 'ar' ? 'left-4' : 'right-4')}>
                                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                    `}
                </div>

                ${subjects.length > 0 ? html`
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-2">
                        ${subjects.map(s => html`
                            <button key=${s.id} onClick=${() => setSelectedSub(s)} 
                                className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-start flex flex-col justify-between min-h-[160px] shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-DEFAULT opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                
                                <div>
                                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-brand-DEFAULT flex items-center justify-center rounded-xl mb-4 group-hover:scale-110 transition-transform">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-black text-slate-800 dark:text-white leading-tight mb-2 group-hover:text-brand-DEFAULT transition-colors">
                                        ${s[`name${lang === 'ar' ? 'Ar' : 'En'}`] || s.nameAr || s.nameEn}
                                    </h3>
                                </div>
                                
                                <div className="mt-4 flex items-center justify-between text-sm font-bold text-slate-500 dark:text-slate-400">
                                    <span>${lang === 'ar' ? 'عرض المحتوى' : 'View Content'}</span>
                                    <span className="transform group-hover:translate-x-2 transition-transform">➔</span>
                                </div>
                            </button>
                        `)}
                    </div>
                ` : html`
                    <div className="flex flex-col items-center justify-center py-20 opacity-50 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl bg-slate-50/50 dark:bg-slate-900/20">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <p className="mt-4 text-xl font-bold">${lang === 'ar' ? 'لا توجد مواد متاحة في هذا الفصل الدراسي' : 'No subjects available in this semester'}</p>
                    </div>
                `}
            </div>
        `;
    };

    // ==========================================



Luminova.Pages.StudentCommunityPage = ({ data, lang, setView, setActiveSummary }) => {
        const [selectedStudent, setSelectedStudent] = useState(null);
        const [visibleCount, setVisibleCount] = useState(5);
        const [studentsVisibleCount, setStudentsVisibleCount] = useState(15);
        const [searchQuery, setSearchQuery] = useState('');
        const normalizeId = (id) => {
            if (!id) return null;
            if (id === 's_founder' || id === 's_founder_hardcoded' || id === 'founder_1') return Luminova.FOUNDER.id;
            return id;
        };

        const getContributionsCount = useMemo(() => {
            const counts = {};
            data.summaries.forEach(s => {
                const sId = normalizeId(s.studentId);
                if (sId) counts[sId] = (counts[sId] || 0) + 1;
            });
            data.quizzes.forEach(q => {
                const questionCounts = {};
                (q.questions || []).forEach(qn => {
                    const sId = normalizeId(qn.studentId);
                    if (sId) questionCounts[sId] = (questionCounts[sId] || 0) + 1;
                });
                
                let maxQuestions = 0;
                for (const sId in questionCounts) {
                    if (questionCounts[sId] > maxQuestions) {
                        maxQuestions = questionCounts[sId];
                    }
                }
                
                for (const sId in questionCounts) {
                    if (questionCounts[sId] === maxQuestions && maxQuestions > 0) {
                        counts[sId] = (counts[sId] || 0) + 2;
                    } else {
                        counts[sId] = (counts[sId] || 0) + 1;
                    }
                }
            });
            return counts;
        }, [data.summaries, data.quizzes]);

        // Founder Hardcoded Data per strictly required specs
        const founder = {
            id: 's_founder_hardcoded',
            nameAr: 'محمود عبد الرحمن عبدالله',
            nameEn: 'Mahmoud Abdelrahman',
            majorAr: 'تكنولوجيا التعليم - جامعة حلوان',
            majorEn: 'Educational Technology - Helwan University',
            bioAr: 'مؤسس منصة Luminova Edu التعليمية. مطور المنصة والمشرف العام.',
            bioEn: 'Founder of Luminova Edu Platform. Lead Developer and Administrator.',
            image: 'img/profile.png', // Fallback avatar for founder if needed
            isFounder: true,
            socialLinks: {
                facebook: 'https://www.facebook.com/mahmoud.abdalrahaman.hagag',
                instagram: 'https://www.instagram.com/mahmoud_abdelrhman_1',
                linkedin: 'https://www.linkedin.com/in/mahmoud-hagag-145127346/'
            }
        };

        // Regular students (filter out any potential accidental founder in DB)
        const sortedStudents = data.students.filter(s => !s.isFounder && s.id !== 's_founder').sort((a, b) => {
            if (a.role === 'doctor' && b.role !== 'doctor') return -1;
            if (b.role === 'doctor' && a.role !== 'doctor') return 1;
            return b.isVIP - a.isVIP;
        });

        // Prepend Founder to always be Index 0
        let allStudentsList = [founder, ...sortedStudents];
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            allStudentsList = allStudentsList.filter(student =>
                (student.nameAr || student.name || '').toLowerCase().includes(query) ||
                (student.nameEn || '').toLowerCase().includes(query)
            );
        }

        
        if (selectedStudent !== null) {
            const studentPosts = (() => {
                    const userQuestionsMap = {};
                    data.quizzes.forEach(q => {
                        (q.questions || []).forEach(qn => {
                            const sId = (qn.studentId === 's_founder' || qn.studentId === 's_founder_hardcoded') ? Luminova.FOUNDER.id : qn.studentId;
                            if (sId === selectedStudent.id) {
                                const groupId = `${q.id}_${sId}`;
                                if (!userQuestionsMap[groupId]) {
                                    userQuestionsMap[groupId] = {
                                        id: `group_${groupId}`,
                                        titleAr: `أضاف أسئلة في اختبار: ${q.titleAr || q.titleEn || q.title || 'اختبار'}`,
                                        titleEn: `Contributed questions to Quiz: ${q.titleEn || q.titleAr || q.title || 'Quiz'}`,
                                        contentAr: `مساهمة لإضافة أسئلة تفاعلية في هذا الاختبار.`,
                                        contentEn: `Contribution adding interactive questions to this quiz.`,
                                        timestamp: qn.timestamp || q.timestamp || new Date().toISOString(),
                                        studentId: qn.studentId,
                                        subjectId: q.subjectId,
                                        isSingleQuestion: true,
                                        parentQuiz: q
                                    };
                                } else {
                                    if (new Date(qn.timestamp) > new Date(userQuestionsMap[groupId].timestamp)) {
                                        userQuestionsMap[groupId].timestamp = qn.timestamp;
                                    }
                                }
                            }
                        });
                    });
                    const userSummaries = data.summaries.filter(i => {
                        const sId = (i.studentId === 's_founder' || i.studentId === 's_founder_hardcoded') ? Luminova.FOUNDER.id : i.studentId;
                        return sId === selectedStudent.id;
                    });
                    return [...userSummaries, ...Object.values(userQuestionsMap)].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            })();

            const displayedPosts = studentPosts.slice(0, visibleCount);

            return html`
                <div className="animate-fade-in space-y-6">
                    <div className="flex justify-between items-center mb-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-4 flex-wrap">
                            <${Luminova.Components.Avatar} name=${selectedStudent.nameAr || selectedStudent.name} image=${selectedStudent.image} isVIP=${selectedStudent.isVIP} isFounder=${selectedStudent.isFounder || selectedStudent.id === 's_founder_hardcoded'} isVerified=${selectedStudent.isVerified} size="w-12 h-12" />
                            <h2 className="text-2xl font-bold flex items-center gap-2 flex-wrap whitespace-normal break-words" style=${{ wordBreak: 'normal', overflowWrap: 'anywhere' }}>
                                ${lang === 'ar' ? (selectedStudent.nameAr || selectedStudent.name) : (selectedStudent.nameEn || selectedStudent.name)}
                                ${selectedStudent.isFounder && html`<span className="text-xs bg-brand-gold text-black px-3 py-1 rounded-full font-black shadow-lg">${lang === 'ar' ? 'المؤسس' : 'Founder'}</span>`}
                                ${!selectedStudent.isFounder && selectedStudent.role === 'doctor' && html`<span className="text-xs bg-teal-500 text-white px-3 py-1 rounded-full font-black shadow-lg">🎓 ${lang === 'ar' ? 'دكتور' : 'Doctor'}</span>`}
                            </h2>
                        </div>
                        <button onClick=${() => setSelectedStudent(null)} className="font-bold text-red-500 hover:text-red-700 transition-colors flex items-center gap-2 bg-red-500/10 px-4 py-2 rounded-lg hover:bg-red-500/20">✖ ${lang === 'ar' ? 'رجوع للطلاب' : 'Back to Students'}</button>
                    </div>

                    <div className="bg-white/50 dark:bg-gray-900/50 rounded-2xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
                        <p className="opacity-90 font-bold text-brand-DEFAULT text-lg">${selectedStudent[`major${lang === 'ar' ? 'Ar' : 'En'}`] || selectedStudent.majorAr}</p>
                        <div className="mt-2 text-gray-600 dark:text-gray-400">
                            <${Luminova.Components.SmartText} text=${selectedStudent[`bio${lang === 'ar' ? 'Ar' : 'En'}`] || selectedStudent.bioAr} lang=${lang} />
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xl font-bold mb-4">${lang === 'ar' ? 'المساهمات' : 'Contributions'}</h3>
                        <${Luminova.Components.TimelineFeed} 
                            items=${displayedPosts} 
                            students=${data.students} subjects=${data.subjects} lang=${lang} onQuizClick=${() => { alert(lang === 'ar' ? 'قم بالدخول للاختبار الكامل من القسم الأكاديمي' : 'Access full quiz from Academic section'); }} onSummaryClick=${(item) => { setActiveSummary(item); setView('summaryDetail'); }}
                        />
                        ${visibleCount < studentPosts.length && html`
                            <div className="pt-2 pb-8">
                                <button onClick=${() => setVisibleCount(prev => prev + 5)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition-all block mx-auto mt-6 w-full sm:w-auto text-center">
                                    ${lang === 'ar' ? 'عرض المزيد ➕' : 'Load More ➕'}
                                </button>
                            </div>
                        `}
                    </div>
                </div>
            `;
        }

        return html`
        <div className="animate-fade-in">
             <h2 className="text-3xl font-bold mb-8 text-center">${Luminova.i18n[lang].community}</h2>
             <div className="max-w-2xl mx-auto mb-10">
                 <input type="text" placeholder=${lang === 'ar' ? 'البحث عن زميل (بالاسم العربي أو الإنجليزي)...' : 'Search for a peer...'} value=${searchQuery} onChange=${e => setSearchQuery(e.target.value)} className="w-full p-5 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur border-2 dark:border-gray-700 focus:border-brand-DEFAULT shadow-xl outline-none font-bold text-lg text-center transition-all" />
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                ${allStudentsList.slice(0, studentsVisibleCount).map((student) => html`
                    <${Luminova.Components.GlassCard} 
                        key=${student.id} 
                        onClick=${() => { setSelectedStudent(student); setVisibleCount(5); }} 
                        className=${`text-center flex flex-col items-center ${student.isFounder || student.id === 's_founder_hardcoded' ? 'scale-105 relative z-10 bg-gradient-to-br from-yellow-50 to-white dark:from-gray-900 dark:to-black border-4 border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.4)] text-gray-900 dark:text-gray-100' : student.isVIP ? 'bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-900/40 border-2 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : ''}`}
                    >
                        <div className="mb-4">
                            <${Luminova.Components.Avatar} name=${student.nameAr || student.name} nameEn=${student.nameEn} image=${student.image} isVIP=${student.isVIP} isFounder=${student.isFounder || student.id === 's_founder_hardcoded'} isVerified=${student.isVerified} size="w-24 h-24" />
                        </div>
                        <h3 className="text-xl font-bold flex flex-wrap items-center justify-center gap-2 whitespace-normal break-words" style=${{ wordBreak: 'normal', overflowWrap: 'anywhere' }}>
                            ${lang === 'ar' ? (student.nameAr || student.name) : (student.nameEn || student.name)}
                        </h3>
                        ${(student.isFounder || student.id === 's_founder_hardcoded') && html`<span className="text-xs bg-brand-gold text-black font-black px-3 py-1 rounded-full shadow-lg mt-2 mb-1 border border-yellow-500 block w-max mx-auto">${Luminova.i18n[lang].founder}</span>`}
                        ${(!student.isFounder && student.id !== 's_founder_hardcoded') && student.role === 'doctor' && html`<span className="text-xs bg-teal-500 text-white font-black px-3 py-1 rounded-full shadow-lg mt-2 mb-1 block w-max mx-auto">🎓 ${lang === 'ar' ? 'دكتور' : 'Doctor'}</span>`}
                        <p className="text-sm opacity-90 mt-2 font-semibold ${(student.isFounder || student.id === 's_founder_hardcoded') ? 'text-brand-gold drop-shadow-sm' : ''}">${student[`major${lang === 'ar' ? 'Ar' : 'En'}`] || student.majorAr}</p>
                        <p className="text-xs bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full mt-2 font-bold opacity-80">${getContributionsCount[normalizeId(student.id)] || 0} ${lang === 'ar' ? 'مساهمة' : 'Contributions'}</p>
                        
                        <div className="mt-4 flex justify-center gap-4 border-t border-gray-200 dark:border-gray-700 w-full pt-4">
                            ${student.socialLinks?.facebook && html`<a href=${student.socialLinks.facebook} target="_blank" onClick=${e => e.stopPropagation()} className="hover:scale-125 transition-transform"><${Luminova.Icons.Facebook} /></a>`}
                            ${student.socialLinks?.instagram && html`<a href=${student.socialLinks.instagram} target="_blank" onClick=${e => e.stopPropagation()} className="hover:scale-125 transition-transform"><${Luminova.Icons.Instagram} /></a>`}
                            ${student.socialLinks?.linkedin && html`<a href=${student.socialLinks.linkedin} target="_blank" onClick=${e => e.stopPropagation()} className="hover:scale-125 transition-transform"><${Luminova.Icons.LinkedIn} /></a>`}
                        </div>
                    </${Luminova.Components.GlassCard}>
                `)}
            </div>

            ${studentsVisibleCount < allStudentsList.length && html`
                <div className="flex justify-center pt-8 pb-4">
                    <button onClick=${() => setStudentsVisibleCount(prev => prev + 5)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition-all">
                        ${lang === 'ar' ? 'عرض المزيد ➕' : 'Load More ➕'}
                    </button>
                </div>
            `}
        </div>
    `;
    };


})();


