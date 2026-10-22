/**
 * محرك القياس السلوكي والجنائي المطور (100-Indicator Enterprise Telemetry Engine v3.5 MAX)
 * النسخة الأقوى: كاميرا فائقة الاستقرار + كشف تغطية العدسة + صوت فائق الحساسية + دقة ماوس AI
 */

let examMode = 'Full-Edge-AI';
let currentStudentId = '';
let examQuestions = [];
let studentResponses = {};
let currentPageIndex = 0;
const ITEMS_PER_PAGE = 2;
let pageCountdown = null;
let secondsRemaining = 120;
let isSessionActive = false;

let compositeRiskScore = 0;
let forensicAuditTimeline = [];
let heatmapCoordinates = [];
let sessionStartTime = 0;
let pageRenderTimestamp = 0;
let lastInteractionTime = Date.now();
let lastBlurTime = 0;
let mouseDownTimestamp = 0;
let lastPointerPos = { x: 0, y: 0, t: 0 };
let pointerTrajectory = [];
let idleFlags = { s10: false, s20: false, s40: false };

let cooldowns = {
    audio: 0,
    visionYaw: 0,
    visionPitch: 0,
    visionAbsence: 0,
    visionMouth: 0,
    visionDark: 0,
    domScript: 0,
    topExit: 0
};
let consecutiveAudioSpikes = 0;

let keyDownTimestamps = {};
let lastKeyUpTime = 0;
let essayStartTimes = {};

let indicators100 = {
    u1_totalPointerMoves: 0, u1_velocitySpikes: 0, u1_accelerationAnomalies: 0, u1_missingPreClickDecel: 0,
    u1_linearAiPaths: 0, u1_lowAngularVariance: 0, u1_zeroPathClicks: 0, u1_idle10sCount: 0,
    u1_idle20sCount: 0, u1_idle40sCount: 0, u1_viewportExits: 0, u1_topTabBarExits: 0,
    u1_bottomTaskbarExits: 0, u1_questionHoverSec: 0, u1_optionHoverSwitches: 0, u1_roboticClickDwell: 0,
    u1_rageClickBursts: 0, u1_rightClickBlocked: 0, u1_middleClickBlocked: 0, u1_doubleClickSelections: 0,
    u1_dragDropBlocked: 0, u1_scrollSpeedSpikes: 0, u1_reverseScrollCount: 0, u1_multiTouchScreenshotGesture: 0,
    u1_touchSwipeAnomalies: 0,

    u2_totalKeystrokes: 0, u2_avgKeyDwellMs: 0, u2_avgKeyFlightMs: 0, u2_essayBurstTyping: 0,
    u2_backspaceCount: 0, u2_copyShortcutBlocked: 0, u2_pasteShortcutBlocked: 0, u2_cutShortcutBlocked: 0,
    u2_selectAllBlocked: 0, u2_findInPageBlocked: 0, u2_printOrSaveBlocked: 0, u2_printScreenDetected: 0,
    u2_snipToolShortcut: 0, u2_devToolsF12Blocked: 0, u2_inspectShortcutBlocked: 0, u2_viewSourceBlocked: 0,
    u2_altTabDetected: 0, u2_osMetaKeyDetected: 0, u2_escapeKeyCount: 0, u2_clipboardPoisonedCount: 0,

    u3_tabHiddenCount: 0, u3_windowBlurCount: 0, u3_repeatedBlurMultiplier: 0, u3_totalAwaySeconds: 0,
    u3_fullscreenExits: 0, u3_windowResizeEvents: 0, u3_splitScreenRatioAlert: 0, u3_devToolsDimensionDelta: 0,
    u3_extendedMonitorDetected: 0, u3_mobileOrientationRotations: 0, u3_domScriptInjections: 0, u3_domIframeInjections: 0,
    u3_styleTamperAttempts: 0, u3_webdriverAutomationFlag: navigator.webdriver ? 1 : 0, u3_heartbeatFailures: 0, u3_networkDisconnects: 0,
    u3_storageIntegrityCheck: 1, u3_userAgentConsistent: 1, u3_timezoneMatched: 1, u3_touchMouseConsistency: 1,
    u3_popupBlockedCount: 0, u3_unloadAttemptCount: 0, u3_watermarkTamperCount: 0, u3_debuggerTimingAnomaly: 0,
    u3_hardwareConcurrencyScore: navigator.hardwareConcurrency || 4,

    u4_firstInteractionLatencySec: 0, u4_avgTimePerPageSec: 0, u4_rapidGuessingUnder3s: 0, u4_pageTimeoutAutoAdvances: 0,
    u4_mcqAnswerChanges: 0, u4_burstAnsweringPattern: 0, u4_nonSequentialOrder: 0, u4_unansweredItemsCount: 0,
    u4_blurToAnswerCorrelation: 0, u4_idleToAnswerCorrelation: 0, u4_essayPasteLengthSpike: 0, u4_essayWpmAnomaly: 0,
    u4_submitButtonSpam: 0, u4_behavioralEntropyIndex: 0, u4_psychometricTrustScore: 100,

    u5_headYawLeftRight: 0, u5_headPitchUpDown: 0, u5_headRollTilt: 0, u5_faceAbsenceFrames: 0,
    u5_multipleFacesDetected: 0, u5_faceOffCenterAlerts: 0, u5_faceDistanceShifts: 0, u5_mouthMovementMarAlerts: 0,
    u5_irisGazeDeviation: 0, u5_cameraLowLightOcclusion: 0, u5_audioSpeechThresholdHits: 0, u5_acousticSuddenSpikes: 0,
    u5_sustainedNoiseEvents: 0, u5_mediaStreamDisconnected: 0, u5_finalCompositeRisk: 0
};

function canTriggerAlert(key, cooldownMs) {
    const now = Date.now();
    if (now - (cooldowns[key] || 0) >= cooldownMs) {
        cooldowns[key] = now;
        return true;
    }
    return false;
}

function chooseMonitoringMode(mode) {
    examMode = mode;
    document.getElementById('cardModeFull').classList.toggle('selected', mode === 'Full-Edge-AI');
    document.getElementById('cardModeBehavioral').classList.toggle('selected', mode === 'DOM-Behavioral-Only');
}

function getElapsedTimeString() {
    if (!sessionStartTime) return "00:00";
    const totalSec = Math.floor((Date.now() - sessionStartTime) / 1000);
    return `${String(Math.floor(totalSec / 60)).padStart(2, '0')}:${String(totalSec % 60).padStart(2, '0')}`;
}

function saveProgressLocally() {
    if (!currentStudentId) return;
    localStorage.setItem(`raqeeb_backup_${currentStudentId}`, JSON.stringify({
        responses: studentResponses,
        risk: compositeRiskScore,
        timeline: forensicAuditTimeline,
        indicators: indicators100,
        page: currentPageIndex
    }));
}

function logForensicEvent(unitName, description, riskWeight) {
    if (!isSessionActive) return;
    compositeRiskScore = Math.min(100, +(compositeRiskScore + riskWeight).toFixed(1));
    indicators100.u5_finalCompositeRisk = compositeRiskScore;
    indicators100.u4_psychometricTrustScore = Math.max(0, +(100 - compositeRiskScore).toFixed(1));

    forensicAuditTimeline.push({
        time: getElapsedTimeString(),
        category: unitName,
        event: description,
        weight: `+${riskWeight}%`
    });
    saveProgressLocally();
}

function setWorkspaceBlur(isBlurred) {
    const ws = document.getElementById('questionsMountNode');
    if (ws) {
        ws.style.filter = isBlurred ? 'blur(12px)' : 'none';
        ws.style.transition = 'filter 0.2s ease';
    }
}

async function authorizeAndStartExam() {
    const idField = document.getElementById('studentIdInput').value.trim();
    const agreed = document.getElementById('policyConsentCheck').checked;
    const errAlert = document.getElementById('authErrorBox');

    if (!idField) {
        errAlert.style.display = 'block';
        errAlert.innerText = 'يرجى إدخال الرقم الجامعي الرسمي للمتابعة.';
        return;
    }
    if (!agreed) {
        errAlert.style.display = 'block';
        errAlert.innerText = 'يرجى الموافقة على وثيقة سياسة الخصوصية وشروط النزاهة الأكاديمية.';
        return;
    }

    try {
        const res = await fetch('/api/auth_student', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: idField })
        });
        const data = await res.json();
        if (data.status !== 'authorized') {
            errAlert.style.display = 'block';
            errAlert.innerText = data.message;
            return;
        }

        currentStudentId = idField;
        examQuestions = data.questions;

        const savedBackup = localStorage.getItem(`raqeeb_backup_${currentStudentId}`);
        if (savedBackup) {
            try {
                const parsed = JSON.parse(savedBackup);
                studentResponses = parsed.responses || {};
                compositeRiskScore = parsed.risk || 0;
                forensicAuditTimeline = parsed.timeline || [];
            } catch (e) {}
        }

        document.getElementById('headerStudentInfo').innerText = `${data.name} (${currentStudentId})`;
        document.getElementById('gateSection').style.display = 'none';
        document.getElementById('examWorkspace').style.display = 'block';

        const wm = document.getElementById('watermarkLayer');
        wm.style.display = 'block';
        wm.innerText = (`RAQEEB-SESSION // ${currentStudentId} // ${data.name}   `).repeat(45);

        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
        }

        sessionStartTime = Date.now();
        lastInteractionTime = Date.now();
        isSessionActive = true;

        start100IndicatorsTelemetry();
        if (examMode === 'Full-Edge-AI') {
            await startEdgeVisionAndAudio();
        } else {
            logForensicEvent("الخصوصية والبيئة", "بدء الجلسة بالنمط السلوكي المعزول (بدون كاميرا) وفق اختيار الطالب", 0);
        }

        renderExamPage();
    } catch (err) {
        errAlert.style.display = 'block';
        errAlert.innerText = 'تعذر الاتصال بخادم الامتحانات، يرجى التحقق من الشبكة.';
    }
}

function start100IndicatorsTelemetry() {
    if (navigator.webdriver) {
        logForensicEvent("الوحدة 3: نزاهة البيئة", "رصد تشغيل المتصفح عبر أداة تحكم آلي (WebDriver)", 30);
    }
    if (window.screen && window.screen.isExtended) {
        indicators100.u3_extendedMonitorDetected = 1;
        logForensicEvent("الوحدة 3: نزاهة البيئة", "رصد توصيل شاشة عرض إضافية بالجهاز", 15);
    }

    const domObserver = new MutationObserver((mutations) => {
        mutations.forEach(m => {
            m.addedNodes.forEach(node => {
                if (node.tagName === 'SCRIPT') {
                    const src = (node.src || '').toLowerCase();
                    const isSafe = src.includes('mediapipe') ||
                                   src.includes('jsdelivr') ||
                                   src.startsWith('chrome-extension://') ||
                                   src.startsWith('moz-extension://') ||
                                   src.startsWith('safari-extension://');
                    if (!isSafe && canTriggerAlert('domScript', 10000)) {
                        indicators100.u3_domScriptInjections++;
                        logForensicEvent("الوحدة 3: نزاهة DOM", "رصد محاولة حقن سكريبت غير مصرح به في الصفحة", 20);
                    }
                } else if (node.tagName === 'IFRAME' && canTriggerAlert('domScript', 10000)) {
                    indicators100.u3_domIframeInjections++;
                    logForensicEvent("الوحدة 3: نزاهة DOM", "رصد حقن إطار خارجي IFRAME داخل ورقة الاختبار", 20);
                }
            });
        });
    });
    domObserver.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('mousemove', (e) => {
        if (!isSessionActive) return;
        const now = Date.now();
        lastInteractionTime = now;
        idleFlags = { s10: false, s20: false, s40: false };
        setWorkspaceBlur(false);
        indicators100.u1_totalPointerMoves++;

        if (indicators100.u4_firstInteractionLatencySec === 0) {
            indicators100.u4_firstInteractionLatencySec = +((now - sessionStartTime) / 1000).toFixed(1);
        }

        if (now - lastPointerPos.t > 110) {
            if (heatmapCoordinates.length < 500) {
                heatmapCoordinates.push({
                    x: +(e.clientX / window.innerWidth).toFixed(3),
                    y: +(e.clientY / window.innerHeight).toFixed(3),
                    type: 'move'
                });
            }
            const dist = Math.hypot(e.clientX - lastPointerPos.x, e.clientY - lastPointerPos.y);
            const velocity = dist / ((now - lastPointerPos.t) || 1);
            if (velocity > 9.5) indicators100.u1_velocitySpikes++;

            pointerTrajectory.push({ x: e.clientX, y: e.clientY });
            if (pointerTrajectory.length >= 12) {
                evaluateTrajectoryLinearity(pointerTrajectory);
                pointerTrajectory = [];
            }
            lastPointerPos = { x: e.clientX, y: e.clientY, t: now };
        }
    });

    document.addEventListener('mouseleave', (e) => {
        if (!isSessionActive) return;
        indicators100.u1_viewportExits++;
        setWorkspaceBlur(true);
        if (e.clientY <= 0 && canTriggerAlert('topExit', 6000)) {
            indicators100.u1_topTabBarExits++;
            logForensicEvent("الوحدة 1: حركيات الفأرة", "خروج المؤشر باتجاه شريط التبويبات العلوي للمتصفح", 3);
        } else if (e.clientY >= window.innerHeight && canTriggerAlert('topExit', 6000)) {
            indicators100.u1_bottomTaskbarExits++;
            logForensicEvent("الوحدة 1: حركيات الفأرة", "خروج المؤشر باتجاه شريط المهام السفلي للنظام", 3);
        }
    });

    document.addEventListener('mousedown', () => {
        if (!isSessionActive) return;
        mouseDownTimestamp = Date.now();
    });

    document.addEventListener('mouseup', (e) => {
        if (!isSessionActive) return;
        const dwell = Date.now() - mouseDownTimestamp;
        if (dwell > 0 && dwell < 9) {
            indicators100.u1_roboticClickDwell++;
            logForensicEvent("الوحدة 1: كشف الأتمتة", `نقرة آلية فائقة السرعة (${dwell}ms - نمط أداة Computer-Use AI)`, 10);
        }
        if (heatmapCoordinates.length < 500) {
            heatmapCoordinates.push({
                x: +(e.clientX / window.innerWidth).toFixed(3),
                y: +(e.clientY / window.innerHeight).toFixed(3),
                type: 'click'
            });
        }
    });

    window.addEventListener('keydown', (e) => {
        if (!isSessionActive) return;
        if (e.repeat) return;

        const now = Date.now();
        lastInteractionTime = now;
        indicators100.u2_totalKeystrokes++;

        if (!keyDownTimestamps[e.code]) {
            keyDownTimestamps[e.code] = now;
            if (lastKeyUpTime > 0) {
                const flight = now - lastKeyUpTime;
                indicators100.u2_avgKeyFlightMs = Math.round((indicators100.u2_avgKeyFlightMs + flight) / 2);
            }
        }

        if (e.key === 'Backspace' || e.key === 'Delete') indicators100.u2_backspaceCount++;
        if (e.key === 'Escape') indicators100.u2_escapeKeyCount++;

        if (e.key === 'PrintScreen') {
            setWorkspaceBlur(true);
            indicators100.u2_printScreenDetected++;
            navigator.clipboard.writeText('محتوى محمي بواسطة نظام رقيب').catch(() => {});
            logForensicEvent("الوحدة 2: درع الشاشة", "محاولة التقاط صورة للشاشة عبر مفتاح PrintScreen", 15);
        }
        if (e.key === 'F12') {
            e.preventDefault();
            indicators100.u2_devToolsF12Blocked++;
            logForensicEvent("الوحدة 2: نزاهة المتصفح", "محاولة فتح أدوات المطور عبر مفتاح F12", 20);
        }
        if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) {
            e.preventDefault();
            indicators100.u2_inspectShortcutBlocked++;
            logForensicEvent("الوحدة 2: نزاهة المتصفح", `محاولة فحص عناصر الصفحة (Ctrl+Shift+${e.key.toUpperCase()})`, 20);
        }
        if (e.ctrlKey && ['C', 'V', 'X', 'P', 'S', 'U', 'F'].includes(e.key.toUpperCase())) {
            e.preventDefault();
            const k = e.key.toUpperCase();
            if (k === 'C') indicators100.u2_copyShortcutBlocked++;
            if (k === 'V') indicators100.u2_pasteShortcutBlocked++;
            if (k === 'X') indicators100.u2_cutShortcutBlocked++;
            if (k === 'U') indicators100.u2_viewSourceBlocked++;
            if (k === 'F') indicators100.u2_findInPageBlocked++;
            if (k === 'P' || k === 'S') indicators100.u2_printOrSaveBlocked++;
            logForensicEvent("الوحدة 2: درع الكيبورد", `اعتراض اختصار لوحة مفاتيح محظور (Ctrl+${k})`, 6);
        }
        if (e.metaKey && e.shiftKey && e.key.toUpperCase() === 'S') {
            setWorkspaceBlur(true);
            indicators100.u2_snipToolShortcut++;
            logForensicEvent("الوحدة 2: درع الشاشة", "محاولة قص وتصوير الشاشة عبر أداة (Win+Shift+S)", 20);
        } else if (e.key === 'Meta' || e.key === 'OS') {
            indicators100.u2_osMetaKeyDetected++;
            logForensicEvent("الوحدة 2: درع النظام", "ضغط مفتاح النظام (Windows Key) لإظهار شريط المهام", 8);
        }
        if (e.altKey && e.key === 'Tab') {
            indicators100.u2_altTabDetected++;
            logForensicEvent("الوحدة 2: درع النظام", "محاولة تبديل النوافذ عبر اختصار Alt+Tab", 10);
        }
    });

    window.addEventListener('keyup', (e) => {
        if (!isSessionActive) return;
        const now = Date.now();
        lastKeyUpTime = now;
        if (keyDownTimestamps[e.code]) {
            const dwell = now - keyDownTimestamps[e.code];
            indicators100.u2_avgKeyDwellMs = Math.round((indicators100.u2_avgKeyDwellMs + dwell) / 2);
            delete keyDownTimestamps[e.code];
        }
    });

    ['contextmenu', 'copy', 'paste', 'cut', 'dragstart'].forEach(evt => {
        document.addEventListener(evt, (e) => {
            if (!isSessionActive) return;
            e.preventDefault();
            if (evt === 'contextmenu') indicators100.u1_rightClickBlocked++;
            if (evt === 'paste') indicators100.u2_pasteShortcutBlocked++;
            if (evt === 'dragstart') indicators100.u1_dragDropBlocked++;
            logForensicEvent("الوحدة 2: درع الحافظة", `منع إجراء غير مصرح به داخل الورقة (${evt})`, 5);
        });
    });

    document.addEventListener('visibilitychange', () => {
        if (!isSessionActive) return;
        if (document.hidden) {
            setWorkspaceBlur(true);
            indicators100.u3_tabHiddenCount++;
            lastBlurTime = Date.now();
            logForensicEvent("الوحدة 3: نزاهة الجلسة", "مغادرة تبويب الاختبار أو تصغير المتصفح", 20);
        } else if (lastBlurTime > 0) {
            setWorkspaceBlur(false);
            const awaySec = Math.round((Date.now() - lastBlurTime) / 1000);
            indicators100.u3_totalAwaySeconds += awaySec;
            logForensicEvent("الوحدة 3: نزاهة الجلسة", `العودة لنافذة الاختبار بعد غياب استمر ${awaySec} ثانية`, 5);
        }
    });

    window.addEventListener('blur', () => {
        if (!isSessionActive) return;
        setWorkspaceBlur(true);
        indicators100.u3_windowBlurCount++;
        lastBlurTime = Date.now();
        logForensicEvent("الوحدة 3: نزاهة الجلسة", "فقدان التركيز عن نافذة الاختبار (الانتقال لنافذة خارجية)", 12);
    });

    window.addEventListener('focus', () => {
        if (!isSessionActive) return;
        setWorkspaceBlur(false);
    });

    setInterval(() => {
        if (!isSessionActive) return;
        const idleDuration = Date.now() - lastInteractionTime;

        if (idleDuration > 10000 && !idleFlags.s10) {
            idleFlags.s10 = true;
            indicators100.u1_idle10sCount++;
            logForensicEvent("الوحدة 1: مؤشر السكون", "سكون تام للمؤشر والكيبورد لمدة 10 ثوانٍ", 3);
        }
        if (idleDuration > 20000 && !idleFlags.s20) {
            idleFlags.s20 = true;
            indicators100.u1_idle20sCount++;
            logForensicEvent("الوحدة 1: مؤشر السكون", "انقطاع التفاعل لمدة 20 ثانية متواصلة (شبهة قراءة خارجية)", 8);
        }
        if (idleDuration > 40000 && !idleFlags.s40) {
            idleFlags.s40 = true;
            indicators100.u1_idle40sCount++;
            logForensicEvent("الوحدة 1: مؤشر السكون", "سكون حرج لمدة 40 ثانية دون أي تفاعل", 15);
        }

        fetch('/api/heartbeat', { method: 'POST' }).catch(() => {
            indicators100.u3_heartbeatFailures++;
        });
    }, 2500);
}

// منع الإنذارات الوهمية للماوس (مسافة أكبر + حساسية 99.85% + تكرار 5 مرات)
function evaluateTrajectoryLinearity(pts) {
    const start = pts[0], end = pts[pts.length - 1];
    const directDist = Math.hypot(end.x - start.x, end.y - start.y);
    
    if (directDist < 320) return;

    let pathLen = 0;
    for (let i = 1; i < pts.length; i++) {
        pathLen += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    }

    const linearityRatio = directDist / (pathLen || 1);

    if (linearityRatio > 0.9985) {
        indicators100.u1_linearAiPaths++;
        if (indicators100.u1_linearAiPaths % 5 === 0) {
            logForensicEvent("الوحدة 1: كشف AI", "رصد مسار حركة ماوس خطي آلي (شبهة أداة Computer-Use AI)", 12);
        }
    }
}

// المحرك الأقوى للكاميرا والميكروفون (Multi-Stage Fallback + Occlusion Detection + Auto-Resume Audio)
async function startEdgeVisionAndAudio() {
    let videoStream = null;
    const vid = document.getElementById('webcamStream');

    // 1. محاولة تشغيل الكاميرا بمرونة قصوى (تعمل على أي كاميرا لابتوب أو USB)
    try {
        try {
            videoStream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: "user" },
                audio: false
            });
        } catch (firstCamErr) {
            // محاولة ثانية بالإعدادات الافتراضية المطلقة إذا رفضت الكاميرا الأبعاد المحددة
            videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }

        vid.srcObject = videoStream;
        vid.setAttribute('playsinline', '');
        vid.muted = true;
        await vid.play().catch(() => {});
        document.getElementById('pipCameraBox').style.display = 'block';

        videoStream.getVideoTracks().forEach(track => {
            track.onended = () => {
                indicators100.u5_mediaStreamDisconnected++;
                logForensicEvent("الوحدة 5: الكاميرا الطرفية", "تم إيقاف أو فصل الكاميرا أثناء سير الاختبار", 20);
            };
        });

        // 2. فحص سطوع الكاميرا لكشف تغطية العدسة (Camera Occlusion / Darkness Check)
        const lightCanvas = document.createElement('canvas');
        lightCanvas.width = 40;
        lightCanvas.height = 30;
        const lightCtx = lightCanvas.getContext('2d', { willReadFrequently: true });

        setInterval(() => {
            if (!isSessionActive || vid.readyState < 2) return;
            try {
                lightCtx.drawImage(vid, 0, 0, 40, 30);
                const pixels = lightCtx.getImageData(0, 0, 40, 30).data;
                let totalLuma = 0;
                for (let i = 0; i < pixels.length; i += 4) {
                    totalLuma += (pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114);
                }
                const avgBrightness = totalLuma / (pixels.length / 4);
                if (avgBrightness < 12 && canTriggerAlert('visionDark', 18000)) {
                    indicators100.u5_cameraLowLightOcclusion++;
                    logForensicEvent("الوحدة 5: الكاميرا الطرفية", "رصد إعتام كلي أو تغطية لعدسة الكاميرا", 8);
                }
            } catch (err) {}
        }, 4000);

        // 3. تشغيل الميكروفون بأعلى حساسية مع إعادة التفعيل التلقائي (Auto-Resume AudioContext)
        try {
            const audioStream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                video: false
            });
            const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioCtxClass();

            const resumeAudioIfNeeded = () => {
                if (audioCtx.state === 'suspended') {
                    audioCtx.resume().catch(() => {});
                }
            };
            resumeAudioIfNeeded();
            document.addEventListener('click', resumeAudioIfNeeded, { passive: true });
            document.addEventListener('keydown', resumeAudioIfNeeded, { passive: true });

            const src = audioCtx.createMediaStreamSource(audioStream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.6;
            src.connect(analyser);
            const freqData = new Uint8Array(analyser.frequencyBinCount);

            setInterval(() => {
                if (!isSessionActive) return;
                if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});

                analyser.getByteFrequencyData(freqData);
                const avgLevel = freqData.reduce((a, b) => a + b, 0) / freqData.length;

                if (avgLevel > 38) {
                    consecutiveAudioSpikes++;
                    if (consecutiveAudioSpikes >= 2 && canTriggerAlert('audio', 10000)) {
                        indicators100.u5_audioSpeechThresholdHits++;
                        logForensicEvent("الوحدة 5: المؤشر الصوتي", "رصد حديث بشري أو صوت مستمر في محيط الطالب", 4);
                        consecutiveAudioSpikes = 0;
                    }
                } else {
                    consecutiveAudioSpikes = 0;
                }
            }, 1500);
        } catch (audioErr) {
            console.warn("الميكروفون غير متاح، استمرار العمل بالكاميرا فقط:", audioErr);
        }

        // 4. تشغيل الذكاء الاصطناعي للرؤية الحاسوبية (MediaPipe FaceMesh)
        if (typeof FaceMesh !== 'undefined') {
            const faceMesh = new FaceMesh({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
            });
            faceMesh.setOptions({
                maxNumFaces: 2,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            let lastFrameCheck = 0;
            faceMesh.onResults((results) => {
                if (!isSessionActive || Date.now() - lastFrameCheck < 2200) return;
                lastFrameCheck = Date.now();

                if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
                    if (canTriggerAlert('visionAbsence', 12000)) {
                        indicators100.u5_faceAbsenceFrames++;
                        logForensicEvent("الوحدة 5: الرؤية الحاسوبية", "غياب الوجه الكلي عن مجال الكاميرا", 6);
                    }
                    return;
                }
                if (results.multiFaceLandmarks.length > 1 && canTriggerAlert('visionAbsence', 12000)) {
                    indicators100.u5_multipleFacesDetected++;
                    logForensicEvent("الوحدة 5: الرؤية الحاسوبية", "رصد وجود أكثر من وجه أمام الكاميرا", 20);
                }

                const lm = results.multiFaceLandmarks[0];
                const nose = lm[1], leftCheek = lm[234], rightCheek = lm[454];
                const upperLip = lm[13], lowerLip = lm[14];

                const dL = Math.abs(nose.x - leftCheek.x);
                const dR = Math.abs(rightCheek.x - nose.x);
                if ((dL / (dR + 0.001) > 2.5 || dR / (dL + 0.001) > 2.5) && canTriggerAlert('visionYaw', 10000)) {
                    indicators100.u5_headYawLeftRight++;
                    logForensicEvent("الوحدة 5: الرؤية الحاسوبية", "انحراف زاوية الرأس الأفقية (Yaw) خارج نطاق الشاشة", 5);
                }
                if ((nose.y > 0.80 || nose.y < 0.20) && canTriggerAlert('visionPitch', 10000)) {
                    indicators100.u5_headPitchUpDown++;
                    logForensicEvent("الوحدة 5: الرؤية الحاسوبية", "ميلان الرأس العمودي للأسفل أو الأعلى (Pitch)", 5);
                }
                if (Math.abs(lowerLip.y - upperLip.y) > 0.048 && canTriggerAlert('visionMouth', 12000)) {
                    indicators100.u5_mouthMovementMarAlerts++;
                    logForensicEvent("الوحدة 5: الرؤية الحاسوبية", "رصد حركة شفاه مستمرة (تحدث أثناء الاختبار)", 4);
                }
            });

            // حلقة إرسال إطارات الفيديو مباشرة إلى FaceMesh لضمان عدم توقف الكاميرا
            async function processVideoFrames() {
                if (!isSessionActive) return;
                if (vid.readyState >= 2) {
                    try {
                        await faceMesh.send({ image: vid });
                    } catch (err) {}
                }
                setTimeout(() => requestAnimationFrame(processVideoFrames), 600);
            }
            requestAnimationFrame(processVideoFrames);
        }
    } catch (e) {
        console.error("Camera Error Details:", e);
        examMode = 'DOM-Behavioral-Fallback';
        logForensicEvent("الوحدة 5: البيئة", `تعذر فتح الكاميرا (${e.name || 'خطأ صلاحيات'}) - تم التبديل للوضع السلوكي`, 5);
    }
}

function renderExamPage() {
    const container = document.getElementById('questionsMountNode');
    container.innerHTML = '';
    pageRenderTimestamp = Date.now();

    const startIdx = currentPageIndex * ITEMS_PER_PAGE;
    const pageItems = examQuestions.slice(startIdx, startIdx + ITEMS_PER_PAGE);
    const totalPages = Math.ceil(examQuestions.length / ITEMS_PER_PAGE);

    document.getElementById('pageCounterText').innerText = `${currentPageIndex + 1} / ${totalPages}`;
    document.getElementById('nextPageBtn').innerText = (currentPageIndex + 1 === totalPages)
        ? 'اعتماد وإرسال ورقة الاختبار النهائية'
        : 'حفظ والانتقال للصفحة التالية';

    pageItems.forEach((q, idx) => {
        const qNumber = startIdx + idx + 1;
        const block = document.createElement('div');
        block.className = 'question-block';

        let inputMarkup = '';
        if (q.type === 'mcq') {
            q.options.forEach((optText, optIndex) => {
                const isChecked = studentResponses[q.id] === optIndex ? 'checked' : '';
                inputMarkup += `
                    <label class="mcq-option">
                        <input type="radio" name="q_${q.id}" value="${optIndex}" ${isChecked}
                               onchange="recordMcqSelection(${q.id}, ${optIndex})">
                        <span>${optText}</span>
                    </label>
                `;
            });
        } else if (q.type === 'essay') {
            const savedText = studentResponses[q.id] || '';
            inputMarkup = `
                <textarea class="textarea-control" id="essay_${q.id}"
                          placeholder="اكتب إجابتك التحليلية هنا بوضوح..."
                          oninput="recordEssayInput(${q.id}, this.value)">${savedText}</textarea>
                <div style="display:flex;justify-content:space-between;font-size:12px;color:#64748B;margin-top:6px;">
                    <span>سؤال كتابي مقالي</span>
                    <span id="wordCount_${q.id}" class="mono">الأحرف: ${savedText.length}</span>
                </div>
            `;
        }

        block.innerHTML = `
            <div class="question-header">
                <div class="question-title">السؤال ${qNumber}: ${q.q}</div>
                <span class="points-tag mono">${q.points} درجة</span>
            </div>
            <div>${inputMarkup}</div>
        `;
        container.appendChild(block);
    });

    startPageTimer();
}

function recordMcqSelection(questionId, optionIndex) {
    const now = Date.now();
    if (now - pageRenderTimestamp < 2800) {
        indicators100.u4_rapidGuessingUnder3s++;
        logForensicEvent("الوحدة 4: القياسات الزمنية", `اختيار إجابة خاطفة للسؤال (${questionId}) في أقل من 3 ثوانٍ`, 4);
    }
    if (studentResponses[questionId] !== undefined && studentResponses[questionId] !== optionIndex) {
        indicators100.u4_mcqAnswerChanges++;
    }
    if (lastBlurTime > 0 && (now - lastBlurTime) < 6500) {
        indicators100.u4_blurToAnswerCorrelation++;
        logForensicEvent("الوحدة 4: الارتباط الجنائي", `الإجابة على السؤال (${questionId}) فور العودة من نافذة خارجية`, 15);
    }
    studentResponses[questionId] = optionIndex;
    saveProgressLocally();
}

function recordEssayInput(questionId, textValue) {
    if (!essayStartTimes[questionId]) essayStartTimes[questionId] = Date.now();
    const prevText = String(studentResponses[questionId] || '');
    const charDelta = textValue.length - prevText.length;

    if (charDelta > 25) {
        indicators100.u4_essayPasteLengthSpike++;
        indicators100.u2_essayBurstTyping++;
        logForensicEvent("الوحدة 4: نزاهة الأسئلة المقالية", `إدراج نص كبير دفعة واحدة (+${charDelta} حرفاً) في السؤال المقالي (${questionId})`, 18);
    }

    const elapsedMinutes = Math.max(0.1, (Date.now() - essayStartTimes[questionId]) / 60000);
    const wordCount = textValue.trim().split(/\s+/).filter(Boolean).length;
    const currentWpm = Math.round(wordCount / elapsedMinutes);

    if (wordCount > 12 && currentWpm > 135) {
        indicators100.u4_essayWpmAnomaly = currentWpm;
    }

    studentResponses[questionId] = textValue;
    saveProgressLocally();

    const wcNode = document.getElementById(`wordCount_${questionId}`);
    if (wcNode) wcNode.innerText = `الأحرف: ${textValue.length} | الكلمات: ${wordCount}`;
}

function startPageTimer() {
    clearInterval(pageCountdown);
    secondsRemaining = 120;
    const timerVal = document.getElementById('timerSecondsText');
    const timerPill = document.getElementById('timerPillBox');
    timerVal.innerText = secondsRemaining;
    timerPill.classList.remove('urgent');

    pageCountdown = setInterval(() => {
        secondsRemaining--;
        timerVal.innerText = secondsRemaining;
        if (secondsRemaining <= 20) timerPill.classList.add('urgent');
        if (secondsRemaining <= 0) {
            indicators100.u4_pageTimeoutAutoAdvances++;
            logForensicEvent("الوحدة 4: القياسات الزمنية", `انتهاء المهلة الزمنية للصفحة (${currentPageIndex + 1}) وسحبها تلقائياً`, 4);
            advanceExamPage();
        }
    }, 1000);
}

async function advanceExamPage() {
    const totalPages = Math.ceil(examQuestions.length / ITEMS_PER_PAGE);
    if (currentPageIndex + 1 < totalPages) {
        currentPageIndex++;
        renderExamPage();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        await finalizeAndSubmitExam();
    }
}

async function finalizeAndSubmitExam() {
    isSessionActive = false;
    clearInterval(pageCountdown);
    localStorage.removeItem(`raqeeb_backup_${currentStudentId}`);

    const totalElapsedSec = Math.max(1, Math.round((Date.now() - sessionStartTime) / 1000));
    indicators100.u4_avgTimePerPageSec = Math.round(totalElapsedSec / Math.ceil(examQuestions.length / ITEMS_PER_PAGE));
    indicators100.u5_finalCompositeRisk = compositeRiskScore;

    const res = await fetch('/api/submit_exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            student_id: currentStudentId,
            answers: studentResponses,
            suspicion_score: compositeRiskScore,
            exam_mode: examMode,
            device_type: 'Laptop/Desktop',
            audit_log: forensicAuditTimeline,
            indicators_100: indicators100,
            heatmap_data: heatmapCoordinates
        })
    });
    const receipt = await res.json();

    document.getElementById('pipCameraBox').style.display = 'none';
    document.getElementById('examWorkspace').innerHTML = `
        <div class="card-header">
            <h2>تم استلام وإيداع ورقة الاختبار الرسمية بنجاح</h2>
            <p>تم حفظ إجاباتك الموضوعية والمقالية في قاعدة البيانات المركزية للجامعة.</p>
        </div>
        <div style="background:#F8FAFC;border:1px solid #CBD5E1;padding:22px;border-radius:4px;line-height:2.1;">
            <div><strong>الرقم الجامعي:</strong> <span class="mono">${currentStudentId}</span></div>
            <div><strong>رقم الوصل المرجعي (Reference ID):</strong> <span class="mono">${receipt.reference_id}</span></div>
            <div><strong>حالة الورقة الامتحانية:</strong> <span style="color:#166534;font-weight:700;">مؤرشفة ومعتمدة للتصحيح الأكاديمي</span></div>
        </div>
        <p style="font-size:13px;color:#64748B;margin-top:16px;">يمكنك الآن إغلاق نافذة المتصفح بأمان.</p>
    `;
}