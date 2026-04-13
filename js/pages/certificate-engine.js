(function () {
    "use strict";
    if (!window.__LUMINOVA) return;
    const { useState, useEffect } = window.React;
    const html = window.htm.bind(window.React.createElement);
    const Luminova = window.__LUMINOVA;

    // ----------------------------------------------------------------
    // Dynamic certificate data loader
    // ----------------------------------------------------------------
    window.loadCertificatesData = () => {
        return new Promise(resolve => {
            if (window.LUMINOVA_CERTIFICATES) return resolve(window.LUMINOVA_CERTIFICATES);
            const script = document.createElement('script');
            script.src = 'certificates.js?v=' + Date.now();
            script.onload = () => resolve(window.LUMINOVA_CERTIFICATES || []);
            script.onerror = () => { console.error("Failed to load certificates.js"); resolve([]); };
            document.body.appendChild(script);
        });
    };

    // ----------------------------------------------------------------
    // SVG QR Code Generator (Deprecated in favor of qrcode.min.js)
    // ----------------------------------------------------------------

    // ----------------------------------------------------------------
    // Render-to-Image Certificate Engine (Task 2)
    // ----------------------------------------------------------------
    const loadHtml2Canvas = () => {
        return new Promise((resolve, reject) => {
            if (window.html2canvas) return resolve(window.html2canvas);
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
            script.onload = () => resolve(window.html2canvas);
            script.onerror = reject;
            document.body.appendChild(script);
        });
    };

    Luminova.downloadCertificateImage = (dataUrl, certId) => {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `luminova-certificate-${certId}.png`;
        a.click();
    };

    Luminova.generateCertificateImage = async (certificate, lang = 'ar') => {
        const cacheKey = `${certificate.id}_${lang}`;
        window.__LUMINOVA_IMG_CACHE = window.__LUMINOVA_IMG_CACHE || {};
        if (window.__LUMINOVA_IMG_CACHE[cacheKey]) return window.__LUMINOVA_IMG_CACHE[cacheKey];
        
        try {
            const cacheStr = sessionStorage.getItem(`lmv_cert_${cacheKey}`);
            if (cacheStr) {
                window.__LUMINOVA_IMG_CACHE[cacheKey] = cacheStr;
                return cacheStr;
            }
        } catch(e){}

        const html2c = await loadHtml2Canvas();

        const container = document.createElement('div');
        container.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
        Object.assign(container.style, {
            position: 'absolute',
            left: '-9999px',
            top: '-9999px',
            width: '1000px',
            background: 'white',
            fontFamily: "'Cairo', serif",
            zIndex: '-999'
        });
        document.body.appendChild(container);

        return new Promise((resolve) => {
            const root = window.ReactDOM.createRoot(container);
            let snapShotted = false;

            const executeSnapshot = async () => {
                if (snapShotted) return;
                snapShotted = true;
                await document.fonts.ready;
                // Tiny frame delay to ensure paint
                await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
                
                const targetNode = container.querySelector('[id^="cert-"]') || container;
                try {
                    const canvas = await html2c(targetNode, {
                        scale: 2,
                        useCORS: true,
                        allowTaint: true,
                        backgroundColor: '#ffffff',
                        logging: false
                    });

                    const dataUrl = canvas.toDataURL('image/png');
                    window.__LUMINOVA_IMG_CACHE[cacheKey] = dataUrl;
                    try { sessionStorage.setItem(`lmv_cert_${cacheKey}`, dataUrl); } catch(e){}
                    
                    resolve(dataUrl);
                } catch(e) {
                    console.error("html2canvas generation failed", e);
                    resolve(null);
                } finally {
                    root.unmount();
                    document.body.removeChild(container);
                }
            };

            root.render(
                html`<${Luminova.Components.CertificateCard} certificate=${certificate} lang=${lang} onReady=${executeSnapshot} />`
            );

            // Maximum fallback safety timeout (in case of rare QR script network failures)
            setTimeout(() => {
                if (!snapShotted) executeSnapshot();
            }, 5000);
        });
    };

    Luminova.Components.CertificateImage = ({ certificate, lang, mode = 'thumb', onDownload }) => {
        const [imgSrc, setImgSrc] = useState(null);
        const [isRendering, setIsRendering] = useState(false);

        useEffect(() => {
            let mounted = true;
            if (!certificate) return;
            setIsRendering(true);
            Luminova.generateCertificateImage(certificate, lang).then(src => {
                if(mounted) {
                    setImgSrc(src);
                    setIsRendering(false);
                }
            });
            return () => { mounted = false; };
        }, [certificate?.id, lang]);

        if (isRendering || !imgSrc) {
            return html`
                <div style=${{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', background: '#f8fafc', borderRadius: mode === 'thumb' ? '16px 16px 0 0' : '16px', aspectRatio: mode === 'thumb' ? '1.414' : 'auto', width: '100%' }}>
                    <div className="w-10 h-10 border-4 border-brand-DEFAULT border-t-transparent rounded-full animate-spin"></div>
                    <span style=${{ marginTop: '10px', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>${lang === 'ar' ? 'جاري إنشاء الشهادة...' : 'Generating certificate...'}</span>
                </div>
            `;
        }

        if (mode === 'full') {
            return html`
                <div style=${{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    <img src=${imgSrc} alt="Certificate" className="w-full h-auto object-contain" style=${{ borderRadius:'16px', boxShadow: '0 24px 60px -10px rgba(0,0,0,0.18)', maxWidth: '1000px' }} />
                    ${onDownload && html`
                        <div style=${{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
                            <button onClick=${() => onDownload(imgSrc, certificate.id)} style=${{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 32px', background: 'var(--color-brand, #3b82f6)', color: 'white', fontWeight: 800, borderRadius: '999px', fontSize: '16px', border: 'none', cursor: 'pointer', boxShadow: '0 10px 25px -5px rgba(59,130,246,0.5)', transition: 'transform 0.2s' }} className="hover:scale-105 active:scale-95">
                                ⬇️ ${lang === 'ar' ? 'تنزيل كصورة عالية الدقة PNG' : 'Download High-Res PNG'}
                            </button>
                        </div>
                    `}
                </div>
            `;
        }

        return html`<img src=${imgSrc} alt="Certificate Thumbnail" className="w-full h-auto object-contain" style=${{ borderRadius: '16px 16px 0 0', display: 'block', aspectRatio: '1.414' }} />`;
    };

    // ================================================================
    // MiniCertificateCard — compact card for grids and the HomePage
    // ================================================================
    Luminova.Components.MiniCertificateCard = ({ certificate, lang, onView }) => {
        lang = lang || 'ar';
        const studentName = lang === 'ar' ? certificate.studentName : (certificate.studentNameEn || certificate.studentName);
        const certTitle   = lang === 'ar' ? certificate.title       : (certificate.titleEn || certificate.title);

        return html`
            <div style=${{ display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.07)', overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s', width: '100%', height: '100%' }} className="hover:-translate-y-1 hover:shadow-lg group">
                <!-- Top: The Generated Image Thumbnail -->
                <div style=${{ width: '100%', position: 'relative', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <${Luminova.Components.CertificateImage} certificate=${certificate} lang=${lang} mode="thumb" />
                </div>
                
                <!-- Bottom: Info & Actions -->
                <div style=${{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style=${{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style=${{ fontSize: '13px', fontWeight: 800, color: '#1e293b', lineHeight: 1.3 }}>${certTitle}</div>
                        <div style=${{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style=${{ fontSize: '14px' }}>👤</span>
                            <span style=${{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>${studentName}</span>
                        </div>
                    </div>
                    
                    <div style=${{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
                        <button
                            onClick=${() => onView && onView(certificate)}
                            style=${{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'var(--color-brand, #3b82f6)', color: '#fff', fontWeight: 800, padding: '10px 0', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '13px' }}
                            className="hover:opacity-90 transition-opacity">
                            👁️ ${lang === 'ar' ? 'عرض الشهادة' : 'Details'}
                        </button>
                        <button
                            onClick=${() => {
                                const cacheKey = `${certificate.id}_${lang}`;
                                const cached = window.__LUMINOVA_IMG_CACHE?.[cacheKey] || sessionStorage.getItem('lmv_cert_' + cacheKey);
                                if (cached) Luminova.downloadCertificateImage(cached, certificate.id);
                                else alert(lang === 'ar' ? 'انتظر اكتمال التحميل أولاً' : 'Please wait for generation to finish');
                            }}
                            style=${{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#e2e8f0', color: '#334155', fontWeight: 800, padding: '10px 0', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '13px' }}
                            className="hover:bg-slate-200 transition-colors">
                            ⬇️ ${lang === 'ar' ? 'تنزيل' : 'Download'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    };

    // ================================================================
    // CertificateCard — rigid A4 landscape full document
    // ================================================================
    Luminova.Components.CertificateCard = ({ certificate, lang, onReady }) => {
        lang = lang || 'ar';
        
        const currentBase = window.location.origin + window.location.pathname;
        const cleanBase = currentBase.endsWith('/') ? currentBase.slice(0, -1) : currentBase;
        const verifyUrl = cleanBase + "?verify=" + certificate.id;

        const qrImgSrc = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=1&data=" + encodeURIComponent(verifyUrl);



        const isDoctor  = certificate.senderRole === 'doctor';

        const studentName = lang === 'ar' ? certificate.studentName : (certificate.studentNameEn || certificate.studentName);
        const senderName  = lang === 'ar' ? certificate.senderName  : (certificate.senderNameEn  || certificate.senderName);
        const certTitle   = lang === 'ar' ? certificate.title       : (certificate.titleEn        || certificate.title);
        const certDesc    = lang === 'ar' ? certificate.description  : (certificate.descriptionEn  || certificate.description);

        return html`
            <div style=${{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', animation: 'fadeIn 0.3s ease' }}>
                <style>
                    @media print {
                        body * { visibility: hidden; }
                        #cert-${certificate.id}, #cert-${certificate.id} * { visibility: visible; }
                        #cert-${certificate.id} { position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important; border: none !important; box-shadow: none !important; }
                        .cert-no-print { display: none !important; }
                    }
                </style>

                <!-- Scrollable wrapper -->
                <div style=${{ width: '100%', overflowX: 'auto' }}>
                    <div style=${{ width: '1000px', margin: '0 auto' }}>
                        <div
                            id=${'cert-' + certificate.id}
                            style=${{
                                position: 'relative',
                                width: '1000px',
                                height: '707px',
                                fontFamily: "'Cairo', serif",
                                boxSizing: 'border-box',
                                background: '#FCFAF8',
                                boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
                                overflow: 'hidden'
                            }}>

                            <!-- LAYER 1: Heavy Navy Outer Border -->
                            <div style=${{ position: 'absolute', inset: '0', border: '16px solid #0f172a', boxSizing: 'border-box', pointerEvents: 'none', zIndex: 5 }}></div>

                            <!-- LAYER 2: White Middle Space -->
                            <div style=${{ position: 'absolute', inset: '16px', border: '8px solid #ffffff', boxSizing: 'border-box', pointerEvents: 'none', zIndex: 5 }}></div>

                            <!-- LAYER 3: Gold Inner Ring -->
                            <div style=${{ position: 'absolute', inset: '24px', border: '3px solid #B8860B', boxSizing: 'border-box', pointerEvents: 'none', zIndex: 6 }}></div>

                            <!-- LAYER 3: Centered Watermark (text, no external image load) -->
                            <div style=${{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '120px', fontWeight: 900, color: '#000', opacity: 0.025, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 1, userSelect: 'none' }}>
                                LUMINOVA
                            </div>

                            <!-- LAYER 4: Main Content Zone (Top Anchored Flex Column) -->
                            <div style=${{ position: 'absolute', inset: '38px', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '16px', textAlign: 'center' }}>

                                <!-- Platform Label + Title -->
                                <div style=${{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginBottom: '16px' }}>
                                    <div style=${{ fontSize: '12px', fontWeight: 900, color: '#B8860B', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '8px' }}>LUMINOVA EDU</div>
                                    <div style=${{ fontSize: '48px', fontWeight: 900, color: '#0f172a', letterSpacing: 'normal' }}>
                                        ${certTitle}
                                    </div>
                                    <div style=${{ color: '#ca8a04', fontSize: '24px', margin: '16px 0' }}>✦ ✦ ✦</div>
                                </div>

                                <!-- Certification Body -->
                                <div style=${{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <p style=${{ fontSize: '20px', fontWeight: 500, color: '#475569', marginBottom: '16px', letterSpacing: 'normal' }}>
                                        ${lang === 'ar' ? 'تشهد منصة لومينوفا التعليمية بأن' : 'Luminova Edu Platform certifies that'}
                                    </p>
                                    <div style=${{ fontSize: '64px', fontWeight: 900, color: '#92660a', marginBottom: '24px', letterSpacing: 'normal', textShadow: '0 2px 2px rgba(0,0,0,0.05)' }}>
                                        ${studentName}
                                    </div>
                                    <p style=${{ fontSize: '28px', fontWeight: 500, color: '#1e293b', maxWidth: '720px', lineHeight: 1.8, letterSpacing: 'normal' }}>
                                        ${certDesc}
                                    </p>
                                </div>

                            </div>

                            <!-- LAYER 5: Footer Elements (Absolute Positioned inside Gold Ring) -->
                            
                            <!-- QR Code (bottom-left) -->
                            <div style=${{ position: 'absolute', bottom: '40px', left: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 20 }}>
                                <div style=${{ width: '88px', height: '88px', background: '#fff', padding: '4px', border: '4px solid #0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <img crossOrigin="anonymous" src=${qrImgSrc} alt="QR Code" onLoad=${onReady} onError=${onReady} style=${{ width: '100%', height: '100%', display: 'block' }} />
                                </div>
                                <span style=${{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginTop: '6px', fontFamily: 'monospace' }}>
                                    ID: ${certificate.id}
                                </span>
                            </div>

                            <!-- Role Seal (bottom-right) -->
                            <div style=${{
                                position: 'absolute', bottom: '40px', right: '40px', zIndex: 20,
                                width: '88px', height: '88px', borderRadius: '50%',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                transform: 'rotate(-12deg)',
                                border: '4px solid ' + (isDoctor ? '#fde68a' : '#cbd5e1'),
                                background: isDoctor ? 'linear-gradient(135deg,#fde68a,#f59e0b,#d97706)' : 'linear-gradient(135deg,#e2e8f0,#94a3b8,#64748b)',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.18)'
                            }}>
                                <span style=${{ fontSize: '28px', lineHeight: 1 }}>🏅</span>
                                <span style=${{ fontSize: '9px', fontWeight: 900, marginTop: '3px', textAlign: 'center', textTransform: 'uppercase', color: isDoctor ? '#fff' : '#1e293b', letterSpacing: 'normal' }}>
                                    ${isDoctor ? 'Official' : 'Peer'}
                                </span>
                            </div>

                            <!-- Signature (bottom-center) -->
                            <div style=${{ position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', zIndex: 20 }}>
                                <p style=${{ fontSize: '26px', fontWeight: 900, color: '#0f172a', borderBottom: '2px solid #eab308', paddingBottom: '6px', paddingLeft: '24px', paddingRight: '24px', marginBottom: '8px', whiteSpace: 'nowrap', letterSpacing: 'normal' }}>
                                    ${senderName}
                                </p>
                                <div style=${{ fontSize: '12px', fontWeight: 500, color: '#94a3b8', direction: 'rtl' }}>
                                    ${isDoctor ? (lang === 'ar' ? 'دكتور المادة' : 'Professor') : (lang === 'ar' ? 'مسؤول المنصة' : 'Platform Moderator')}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                <!-- Action buttons (hidden on print) -->
                <div className="cert-no-print" style=${{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button
                        onClick=${() => window.print()}
                        style=${{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0f172a', color: '#fff', padding: '14px 28px', borderRadius: '12px', fontWeight: 800, fontSize: '16px', border: 'none', cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', transition: 'opacity 0.15s' }}>
                        📥 ${lang === 'ar' ? 'تحميل الشهادة (PDF)' : 'Download Certificate (PDF)'}
                    </button>
                    ${!window.location.search.includes('verify') && html`
                        <a
                            href=${verifyUrl}
                            style=${{ display: 'flex', alignItems: 'center', gap: '8px', background: '#2563eb', color: '#fff', padding: '14px 22px', borderRadius: '12px', fontWeight: 800, fontSize: '16px', textDecoration: 'none', boxShadow: '0 8px 24px rgba(37,99,235,0.3)', transition: 'opacity 0.15s' }}>
                            🔗 ${lang === 'ar' ? 'رابط التحقق المباشر' : 'Direct Verify Link'}
                        </a>
                    `}
                </div>
            </div>
        `;
    };



    // ================================================================
    // CertificateArchivePage — Master-Detail pattern + Pagination
    // ================================================================
    Luminova.Pages.CertificateArchivePage = ({ lang, goBack }) => {
        lang = lang || 'ar';
        const [certificates, setCertificates] = useState([]);
        const [loading, setLoading]           = useState(true);
        const [searchQuery, setSearchQuery]   = useState('');
        const [selectedCert, setSelectedCert] = useState(null);
        const [limit, setLimit]               = useState(5);

        const verifyId = new URLSearchParams(window.location.search).get('verify');

        useEffect(() => {
            window.loadCertificatesData().then(data => {
                const list = Array.isArray(data) ? data : [];
                setCertificates(list);
                setLoading(false);
                if (verifyId) {
                    setSearchQuery(verifyId);
                    const found = list.find(c => c.id.toLowerCase() === verifyId.toLowerCase());
                    if (found) setSelectedCert(found);
                }
            });
            if (verifyId) {
                const clean = window.location.protocol + '//' + window.location.host + window.location.pathname;
                window.history.pushState({ path: clean }, '', clean);
            }
        }, []);

        if (loading) return html`<${Luminova.Components.Loader} lang=${lang} />`;

        // ---- DETAIL VIEW ----
        if (selectedCert) {
            return html`
                <div style=${{ animation: 'fadeIn 0.3s ease', paddingBottom: '80px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
                    <div className="flex justify-start mb-6 w-full max-w-6xl mx-auto px-4 pt-6">
                        <button
                            onClick=${() => setSelectedCert(null)}
                            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-lg font-bold">
                            <span>←</span>
                            <span>${lang === 'ar' ? 'رجوع للأرشيف' : 'Back to Archive'}</span>
                        </button>
                    </div>
                    <div style=${{ padding: '0 16px', width: '100%', display: 'flex', justifyContent: 'center' }}>
                        <${Luminova.Components.CertificateImage} 
                            certificate=${selectedCert} 
                            lang=${lang} 
                            mode="full" 
                            onDownload=${(src, id) => Luminova.downloadCertificateImage(src, id)}
                        />
                    </div>
                </div>
            `;
        }

        // ---- MASTER LIST VIEW ----
        let displayed = [...certificates];

        if (searchQuery.trim() !== '') {
            const q = searchQuery.trim().toLowerCase();
            displayed = displayed.filter(c =>
                c.id.toLowerCase().includes(q) ||
                c.studentName.toLowerCase().includes(q) ||
                (c.studentNameEn && c.studentNameEn.toLowerCase().includes(q))
            );
        }

        displayed.sort((a, b) => new Date(b.date) - new Date(a.date));
        const paged   = displayed.slice(0, limit);
        const hasMore = paged.length < displayed.length;

        return html`
            <div style=${{ animation: 'fadeIn 0.3s ease', paddingBottom: '80px', marginTop: '16px', maxWidth: '1200px', margin: '0 auto' }}>

                <!-- Nav bar -->
                <div style=${{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', padding: '0 16px', gap: '16px' }}>
                    <button onClick=${goBack} style=${{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #e2e8f0', color: '#475569', fontWeight: 800, padding: '12px 24px', borderRadius: '12px', cursor: 'pointer', fontSize: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                        <span>${lang === 'ar' ? '←' : '→'}</span>
                        ${lang === 'ar' ? 'الرجوع للرئيسية' : 'Back to Home'}
                    </button>
                    <h2 style=${{ fontSize: '28px', fontWeight: 900, margin: 0, color: 'var(--color-brand, #3b82f6)' }}>
                        🏆 ${lang === 'ar' ? 'أرشيف الشهادات والتوثيق' : 'Certificates & Verification Archive'}
                    </h2>
                </div>

                <!-- Search / Verify bar -->
                <div style=${{ background: 'linear-gradient(135deg, var(--color-brand,#3b82f6), #2563eb)', padding: '32px', borderRadius: '24px', boxShadow: '0 12px 40px rgba(37,99,235,0.25)', marginBottom: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3 style=${{ color: '#fff', fontSize: '22px', fontWeight: 800, marginBottom: '16px', marginTop: 0 }}>
                        ${lang === 'ar' ? 'تحقق من صحة شهادة' : 'Verify a Certificate'}
                    </h3>
                    <div style=${{ width: '100%', maxWidth: '600px', position: 'relative' }}>
                        <input
                            type="text"
                            value=${searchQuery}
                            onChange=${e => setSearchQuery(e.target.value)}
                            placeholder=${lang === 'ar' ? 'أدخل كود الشهادة أو اسم الطالب...' : 'Enter Certificate ID or Student Name...'}
                            style=${{ width: '100%', boxSizing: 'border-box', padding: '16px 24px', borderRadius: '999px', fontSize: '16px', fontWeight: 700, border: 'none', outline: 'none', textAlign: 'center', color: '#1e293b', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.08)' }}
                        />
                        ${searchQuery && html`
                            <button onClick=${() => setSearchQuery('')} style=${{ position: 'absolute', insetBlock: 0, left: '16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', fontWeight: 700, color: '#94a3b8' }}>×</button>
                        `}
                    </div>
                    <p style=${{ color: 'rgba(255,255,255,0.75)', fontWeight: 700, marginTop: '12px', marginBottom: 0, fontSize: '13px' }}>
                        ${lang === 'ar' ? 'قاعدة البيانات الموثوقة للمنصة الأكاديمية' : 'Trusted Academic Platform Database'}
                    </p>
                </div>

                <!-- Results grid -->
                ${paged.length > 0 ? html`
                    <div style=${{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', padding: '0 8px' }}>
                        ${paged.map(cert => html`
                            <${Luminova.Components.MiniCertificateCard}
                                key=${cert.id}
                                certificate=${cert}
                                lang=${lang}
                                onView=${(c) => setSelectedCert(c)}
                            />
                        `)}
                    </div>

                    ${hasMore && html`
                        <div style=${{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
                            <button
                                onClick=${() => setLimit(l => l + 5)}
                                style=${{ background: 'var(--color-brand,#3b82f6)', color: '#fff', fontWeight: 800, fontSize: '17px', padding: '16px 40px', borderRadius: '16px', border: 'none', cursor: 'pointer', boxShadow: '0 8px 24px rgba(59,130,246,0.3)', transition: 'opacity 0.15s' }}>
                                ${lang === 'ar' ? 'عرض المزيد' : 'Load More'}
                            </button>
                        </div>
                    `}
                ` : html`
                    <div style=${{ textAlign: 'center', padding: '80px 24px' }}>
                        <div style=${{ fontSize: '60px', marginBottom: '16px' }}>🔍</div>
                        <h3 style=${{ fontSize: '22px', fontWeight: 800, color: '#475569' }}>
                            ${lang === 'ar' ? 'لم يتم العثور على شهادات تطابق البحث' : 'No certificates found matching your search'}
                        </h3>
                        <p style=${{ opacity: 0.6, marginTop: '8px', fontSize: '16px' }}>
                            ${lang === 'ar' ? 'تأكد من كتابة الكود بشكل صحيح' : 'Ensure you typed the code correctly'}
                        </p>
                    </div>
                `}
            </div>
        `;
    };

})();
