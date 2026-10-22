/**
 * محرك مركز التدقيق الجنائي الأكاديمي (Admin SOC & Forensic Heatmap Renderer)
 */

function openForensicInspector(studentId, studentName, scoreText, riskScore, writtenAnswers, auditLog, ind, heatmapPoints) {
    document.getElementById('forensicModalBackdrop').style.display = 'flex';
    document.getElementById('modalHeaderTitle').innerText =
        `التقرير الجنائي الشامل: ${studentName} (${studentId}) — الدرجة: ${scoreText} — مؤشر الاشتباه: ${riskScore}%`;

    // 1. عرض إجابات الأسئلة الكتابية المقالية
    const essayContainer = document.getElementById('essayAnswersContainer');
    essayContainer.innerHTML = '';
    if (!writtenAnswers || writtenAnswers.length === 0) {
        essayContainer.innerHTML = '<p style="font-size:13px;color:#64748B;">لا توجد أسئلة مقالية مسجلة.</p>';
    } else {
        writtenAnswers.forEach(item => {
            essayContainer.innerHTML += `
                <div style="background:#F8FAFC;border:1px solid #E2E8F0;padding:12px;border-radius:4px;margin-bottom:10px;">
                    <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;color:#0F172A;margin-bottom:6px;">
                        <span>${item.question}</span>
                        <span class="mono" style="color:#1E3A8A;">التقييم التلقائي: ${item.earned}</span>
                    </div>
                    <div style="font-size:13.5px;color:#334155;background:#FFF;padding:10px;border:1px solid #CBD5E1;border-radius:4px;white-space:pre-wrap;">${item.answer}</div>
                </div>
            `;
        });
    }

    // 2. عرض مصفوفة الـ 100 مؤشر مقسمة على الوحدات الـ 5
    const unitsMount = document.getElementById('unitsBreakdownGrid');
    unitsMount.innerHTML = `
        <div class="unit-box">
            <h5>الوحدة 1: حركيات الماوس واللمس (1-25)</h5>
            <div>• إجمالي الحركات: <strong class="mono">${ind.u1_totalPointerMoves || 0}</strong></div>
            <div>• قفزات السرعة: <strong class="mono">${ind.u1_velocitySpikes || 0}</strong></div>
            <div>• مسارات خطية (Computer-Use AI): <strong class="mono">${ind.u1_linearAiPaths || 0}</strong></div>
            <div>• نقرات آلية (<10ms): <strong class="mono">${ind.u1_roboticClickDwell || 0}</strong></div>
            <div>• سكون (10ث / 20ث / 40ث): <strong class="mono">${ind.u1_idle10sCount || 0} / ${ind.u1_idle20sCount || 0} / ${ind.u1_idle40sCount || 0}</strong></div>
            <div>• خروج علوي/سفلي: <strong class="mono">${ind.u1_topTabBarExits || 0} / ${ind.u1_bottomTaskbarExits || 0}</strong></div>
            <div>• إيماءة لمس متعدد (جوال): <strong class="mono">${ind.u1_multiTouchScreenshotGesture || 0}</strong></div>
        </div>
        <div class="unit-box">
            <h5>الوحدة 2: الكيبورد والحافظة (26-45)</h5>
            <div>• ضغطات الكيبورد: <strong class="mono">${ind.u2_totalKeystrokes || 0}</strong></div>
            <div>• زمن المكوث/الانتقال: <strong class="mono">${ind.u2_avgKeyDwellMs || 0}ms / ${ind.u2_avgKeyFlightMs || 0}ms</strong></div>
            <div>• معدل المسح (Backspace): <strong class="mono">${ind.u2_backspaceCount || 0}</strong></div>
            <div>• تصوير الشاشة (PrintScreen): <strong class="mono">${ind.u2_printScreenDetected || 0}</strong></div>
            <div>• محاولات النسخ/اللصق: <strong class="mono">${(ind.u2_copyShortcutBlocked || 0) + (ind.u2_pasteShortcutBlocked || 0)}</strong></div>
            <div>• محاولات DevTools / Inspect: <strong class="mono">${(ind.u2_devToolsF12Blocked || 0) + (ind.u2_inspectShortcutBlocked || 0)}</strong></div>
            <div>• تبديل Alt+Tab / Meta: <strong class="mono">${(ind.u2_altTabDetected || 0) + (ind.u2_osMetaKeyDetected || 0)}</strong></div>
        </div>
        <div class="unit-box">
            <h5>الوحدة 3: نزاهة المتصفح والـ DOM (46-70)</h5>
            <div>• مغادرة التبويب (Tab Hidden): <strong class="mono">${ind.u3_tabHiddenCount || 0}</strong></div>
            <div>• فقدان التركيز (Window Blur): <strong class="mono">${ind.u3_windowBlurCount || 0}</strong></div>
            <div>• إجمالي زمن الغياب: <strong class="mono">${ind.u3_totalAwaySeconds || 0}s</strong></div>
            <div>• حقن DOM (Script/Iframe): <strong class="mono">${(ind.u3_domScriptInjections || 0) + (ind.u3_domIframeInjections || 0)}</strong></div>
            <div>• فرق أبعاد DevTools: <strong class="mono">${ind.u3_devToolsDimensionDelta || 0}</strong></div>
            <div>• تعدد الشاشات / تدوير الجوال: <strong class="mono">${ind.u3_extendedMonitorDetected || 0} / ${ind.u3_mobileOrientationRotations || 0}</strong></div>
            <div>• أتمتة WebDriver: <strong class="mono">${ind.u3_webdriverAutomationFlag || 0}</strong></div>
        </div>
        <div class="unit-box">
            <h5>الوحدة 4: القياسات الزمنية والجنائية (71-85)</h5>
            <div>• زمن أول تفاعل: <strong class="mono">${ind.u4_firstInteractionLatencySec || 0}s</strong></div>
            <div>• متوسط زمن الصفحة: <strong class="mono">${ind.u4_avgTimePerPageSec || 0}s</strong></div>
            <div>• الحل الخاطف (<3s): <strong class="mono">${ind.u4_rapidGuessingUnder3s || 0}</strong></div>
            <div>• تغيير الإجابة المتكرر: <strong class="mono">${ind.u4_mcqAnswerChanges || 0}</strong></div>
            <div>• الحل فور العودة من نافذة: <strong class="mono">${ind.u4_blurToAnswerCorrelation || 0}</strong></div>
            <div>• قفزة نص مقالي (شبهة لصق): <strong class="mono">${ind.u4_essayPasteLengthSpike || 0}</strong></div>
            <div>• معامل الثقة السلوكي: <strong class="mono">${ind.u4_psychometricTrustScore ?? 100}%</strong></div>
        </div>
        <div class="unit-box">
            <h5>الوحدة 5: الرؤية الحاسوبية والصوت (86-100)</h5>
            <div>• التفات الرأس الأفقي (Yaw): <strong class="mono">${ind.u5_headYawLeftRight || 0}</strong></div>
            <div>• ميلان الرأس العمودي (Pitch): <strong class="mono">${ind.u5_headPitchUpDown || 0}</strong></div>
            <div>• غياب الوجه عن الكاميرا: <strong class="mono">${ind.u5_faceAbsenceFrames || 0}</strong></div>
            <div>• تعدد الوجوه بالكاميرا: <strong class="mono">${ind.u5_multipleFacesDetected || 0}</strong></div>
            <div>• حركة الشفاه (MAR): <strong class="mono">${ind.u5_mouthMovementMarAlerts || 0}</strong></div>
            <div>• ذبذبات الصوت والحديث: <strong class="mono">${ind.u5_audioSpeechThresholdHits || 0}</strong></div>
            <div>• فصل الكاميرا القسري: <strong class="mono">${ind.u5_mediaStreamDisconnected || 0}</strong></div>
        </div>
    `;

    // 3. عرض الجدول الزمني الدقيق للحركات التي رفعت النسبة
    const timelineBody = document.getElementById('forensicTimelineBody');
    timelineBody.innerHTML = '';
    if (!auditLog || auditLog.length === 0) {
        timelineBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#166534;font-weight:600;">جلسة مثالية نظيفة — لم يتم رصد أي مخالفات سلوكية أو تقنية (0%).</td></tr>';
    } else {
        auditLog.forEach(item => {
            timelineBody.innerHTML += `
                <tr>
                    <td class="mono"><strong>${item.time}</strong></td>
                    <td>${item.category}</td>
                    <td>${item.event}</td>
                    <td class="mono" style="color:#991B1B;font-weight:700;">${item.weight}</td>
                </tr>
            `;
        });
    }

    // 4. رسم الخريطة الحرارية على Canvas
    renderHeatmapCanvas(heatmapPoints);
}

function renderHeatmapCanvas(points) {
    const canvas = document.getElementById('forensicHeatmapCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // رسم شبكة إحداثيات خلفية دقيقة
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 45) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 45) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    if (!points || points.length === 0) return;

    // رسم خطوط المسار المتصل للماوس/اللمس
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.lineWidth = 1.5;
    points.forEach((pt, idx) => {
        const px = pt.x * canvas.width;
        const py = pt.y * canvas.height;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // رسم بؤر التمركز والنقرات
    points.forEach(pt => {
        const px = pt.x * canvas.width;
        const py = pt.y * canvas.height;
        ctx.beginPath();
        if (pt.type === 'click') {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
            ctx.arc(px, py, 8, 0, Math.PI * 2);
        } else {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
            ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        }
        ctx.fill();
    });
}

function closeForensicInspector() {
    document.getElementById('forensicModalBackdrop').style.display = 'none';
}