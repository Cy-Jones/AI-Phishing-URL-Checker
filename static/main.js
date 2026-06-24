document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('analyzeForm');
    const urlInput = document.getElementById('urlInput');
    const submitBtn = document.getElementById('submitBtn');
    const resultsPanel = document.getElementById('resultsPanel');

    // Core UI Elements
    const statusHeadline = document.getElementById('statusHeadline');
    const statusSubtext = document.getElementById('statusSubtext');
    const statusIcon = document.getElementById('statusIcon');
    const scoreText = document.getElementById('scoreText');
    const riskBar = document.getElementById('riskBar');

    // Stats & Signals
    const domainStat = document.getElementById('domainStat');
    const slashStat = document.getElementById('slashStat');
    const vtStat = document.getElementById('vtStat');
    const ageStat = document.getElementById('ageStat');
    const payloadStat = document.getElementById('payloadStat');
    const ipSignal = document.getElementById('ipSignal');

    // Elements that require global theme swapping
    const themedElements = [
        document.getElementById('statusBanner'),
        scoreText,
        riskBar,
        document.getElementById('badgeML'),
        document.getElementById('badgeTF'), // <-- ADDED
        document.getElementById('badgeLexical'),
        document.getElementById('badgeIP'),
        document.getElementById('pillDomain'),
        document.getElementById('pillSlash')
    ];

    // SVG Icons
    const iconSafe = `<svg style="width:24px;height:24px;color:var(--safe-solid)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    const iconWarn = `<svg style="width:24px;height:24px;color:var(--warn-solid)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
    const iconDanger = `<svg style="width:24px;height:24px;color:var(--danger-solid)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const targetUrl = urlInput.value.trim();
        if (!targetUrl) return;

        // UI Loading State
        submitBtn.innerText = 'Scanning Tiers...';
        submitBtn.disabled = true;
        resultsPanel.classList.add('opacity-50');
        resultsPanel.classList.remove('hidden');
        riskBar.style.width = '0%';
        scoreText.innerText = '...';

        try {
            // Fetch from Python Backend
            const response = await fetch('/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: targetUrl })
            });

            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            // Data Sanitization
            let rawScore = parseFloat(data.risk_score);
            if (rawScore < 1 && rawScore > 0 && data.risk_score.toString().length > 4) {
                rawScore = rawScore * 100;
            }
            const cleanScore = Math.round(rawScore);

            // Populate Base Data
            scoreText.innerText = cleanScore;
            domainStat.innerText = data.domain_length;
            slashStat.innerText = data.slashes;

            // OSINT & Payload Processing
            vtStat.innerText = isNaN(data.vt_flags) ? data.vt_flags : `${data.vt_flags} Flags`;
            ageStat.innerText = data.domain_age;
            payloadStat.innerText = data.payload_status;

            resultsPanel.classList.remove('opacity-50');

            // Pill Theming Logic
            const pillVT = document.getElementById('pillVT');
            if (data.vt_flags > 0 || data.vt_flags.toString().includes("Bypassed")) {
                pillVT.className = "signal-pill border text-sm px-3 py-1.5 rounded-md font-medium flex items-center gap-2 transition-all backdrop-blur-sm theme-danger";
            } else {
                pillVT.className = "signal-pill border text-sm px-3 py-1.5 rounded-md font-medium flex items-center gap-2 transition-all backdrop-blur-sm theme-safe";
            }

            const pillAge = document.getElementById('pillAge');
            if (data.domain_age !== "Unknown" && !data.domain_age.toString().includes("Bypassed")) {
                const ageDays = parseInt(data.domain_age);
                if (ageDays < 30) {
                    pillAge.className = "signal-pill border text-sm px-3 py-1.5 rounded-md font-medium flex items-center gap-2 transition-all backdrop-blur-sm theme-danger";
                } else {
                    pillAge.className = "signal-pill border text-sm px-3 py-1.5 rounded-md font-medium flex items-center gap-2 transition-all backdrop-blur-sm theme-safe";
                }
            } else if (data.domain_age.toString().includes("Bypassed")) {
                pillAge.className = "signal-pill border text-sm px-3 py-1.5 rounded-md font-medium flex items-center gap-2 transition-all backdrop-blur-sm theme-danger";
            } else {
                pillAge.className = "signal-pill border text-sm px-3 py-1.5 rounded-md font-medium flex items-center gap-2 transition-all backdrop-blur-sm theme-warn";
            }

            const pillPayload = document.getElementById('pillPayload');
            if (data.payload_status === "Clean DOM") {
                pillPayload.className = "signal-pill border text-sm px-3 py-1.5 rounded-md font-medium flex items-center gap-2 transition-all backdrop-blur-sm theme-safe";
            } else if (data.payload_status.includes("Bypassed") || data.payload_status.includes("Timeout") || data.payload_status.includes("Failed")) {
                pillPayload.className = "signal-pill border text-sm px-3 py-1.5 rounded-md font-medium flex items-center gap-2 transition-all backdrop-blur-sm theme-warn";
            } else {
                pillPayload.className = "signal-pill border text-sm px-3 py-1.5 rounded-md font-medium flex items-center gap-2 transition-all backdrop-blur-sm theme-danger";
            }

            // Global Theme Application
            setTimeout(() => {
                riskBar.style.width = cleanScore + '%';

                let activeTheme = '';
                let badgeText = '';

                if (cleanScore > 75) {
                    activeTheme = 'theme-danger';
                    badgeText = 'Threat';
                    statusHeadline.innerText = "Critical Threat Detected";
                    statusSubtext.innerText = `${targetUrl} triggered multiple high-risk indicators. Do not visit this site.`;
                    statusIcon.innerHTML = iconDanger;
                } else if (cleanScore > 40) {
                    activeTheme = 'theme-warn';
                    badgeText = 'Warning';
                    statusHeadline.innerText = "Suspicious Link";
                    statusSubtext.innerText = `${targetUrl} exhibits anomalies. Proceed with extreme caution.`;
                    statusIcon.innerHTML = iconWarn;
                } else {
                    activeTheme = 'theme-safe';
                    badgeText = 'Clean';
                    statusHeadline.innerText = "No threats detected";
                    statusSubtext.innerText = `${targetUrl} was not flagged by the AI engine. Heuristic analysis is clear.`;
                    statusIcon.innerHTML = iconSafe;
                }

                applyTheme(activeTheme);
                setBadgesText(badgeText);

                if (data.status && data.status.includes("IP")) {
                    ipSignal.classList.remove('hidden');
                    document.getElementById('badgeIP').innerText = "Detected";
                    document.getElementById('badgeIP').className = "badge text-xs font-bold px-3 py-1 rounded-md border transition-colors duration-300 theme-danger";
                } else {
                    ipSignal.classList.add('hidden');
                }

            }, 50);

        } catch (error) {
            alert("Execution Fault: " + error.message);
            console.error(error);
        } finally {
            submitBtn.innerText = 'Check URL';
            submitBtn.disabled = false;
        }
    });

    function setBadgesText(text) {
        // Safe updater: Now includes badgeTF
        const badges = ['badgeML', 'badgeTF', 'badgeLexical', 'badgeIP'];
        badges.forEach(id => {
            const badgeElement = document.getElementById(id);
            if (badgeElement) {
                badgeElement.innerText = text;
            }
        });
    }

    function applyTheme(themeClass) {
        themedElements.forEach(el => {
            if (el) {
                el.classList.remove('theme-safe', 'theme-warn', 'theme-danger');
                el.classList.add(themeClass);
            }
        });
    }
});