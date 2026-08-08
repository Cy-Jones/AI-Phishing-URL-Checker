document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // DOM REFERENCES
    // ==========================================
    const form = document.getElementById('analyzeForm');
    const urlInput = document.getElementById('urlInput');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');
    const resultsPanel = document.getElementById('resultsPanel');
    const scanProgress = document.getElementById('scanProgress');

    // Status
    const statusBanner = document.getElementById('statusBanner');
    const statusHeadline = document.getElementById('statusHeadline');
    const statusSubtext = document.getElementById('statusSubtext');
    const statusIcon = document.getElementById('statusIcon');

    // Gauge
    const scoreText = document.getElementById('scoreText');
    const gaugeFill = document.getElementById('gaugeFill');
    const GAUGE_CIRCUMFERENCE = 326.73; // 2 * π * 52

    // Signals
    const signalsContainer = document.getElementById('signalsContainer');

    // Screenshot
    const screenshotCard = document.getElementById('screenshotCard');
    const screenshotImg = document.getElementById('screenshotImg');

    // SSL
    const sslIcon = document.getElementById('sslIcon');
    const sslStatus = document.getElementById('sslStatus');
    const sslProtocol = document.getElementById('sslProtocol');
    const sslDetails = document.getElementById('sslDetails');

    // Redirects
    const redirectChain = document.getElementById('redirectChain');

    // Breakdown
    const breakdownChart = document.getElementById('breakdownChart');

    // History
    const recentUrlsBody = document.getElementById('recentUrlsBody');
    let scanHistory = JSON.parse(localStorage.getItem('phishHistory')) || [];

    // Badges
    const badgeIds = ['badgeML', 'badgeTF', 'badgeLexical', 'badgeIP'];

    // Themed elements (for global theme swap)
    const themedElements = [
        statusBanner, scoreText, gaugeFill,
        ...badgeIds.map(id => document.getElementById(id))
    ];

    // Store last response for export
    let lastScanData = null;

    // ==========================================
    // SVG ICONS
    // ==========================================
    const iconSafe = `<svg style="width:24px;height:24px;color:var(--safe-solid)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    const iconWarn = `<svg style="width:24px;height:24px;color:var(--warn-solid)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
    const iconDanger = `<svg style="width:24px;height:24px;color:var(--danger-solid)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;

    // ==========================================
    // FEATURE DICTIONARY
    // ==========================================
    const featureDictionary = {
        'url_length': 'URL Length', 'domain_length': 'Domain Length',
        'domain_qty_dot': 'Domain Dots', 'qty_dot': 'Dots (.)',
        'qty_hyphen': 'Hyphens (-)', 'qty_underline': 'Underscores (_)',
        'qty_slash': 'Slashes (/)', 'qty_questionmark': 'Questions (?)',
        'qty_equal': 'Equals (=)', 'qty_at': 'At Symbols (@)',
        'qty_and': 'Ampersands (&)', 'qty_exclamation': 'Exclamations (!)',
        'qty_space': 'Spaces', 'qty_tilde': 'Tildes (~)',
        'qty_comma': 'Commas (,)', 'qty_plus': 'Plus (+)',
        'qty_asterisk': 'Asterisks (*)', 'qty_hashtag': 'Hashtags (#)',
        'qty_dollar': 'Dollars ($)', 'qty_percent': 'Percents (%)',
        'has_ip': 'IP Masquerade'
    };

    // ==========================================
    // DARK MODE
    // ==========================================
    const moonSVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    const sunSVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;

    const darkToggle = document.getElementById('darkModeToggle');
    const toggleIcon = darkToggle ? darkToggle.querySelector('.toggle-icon') : null;

    if (darkToggle && toggleIcon) {
        const themeColorMeta = document.getElementById('themeColorMeta');
        const LIGHT_THEME_COLOR = '#d5dff0';
        const DARK_THEME_COLOR = '#0c1322';

        function updateThemeColor(isDark) {
            if (themeColorMeta) {
                themeColorMeta.setAttribute('content', isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
            }
        }

        // Load saved preference
        if (localStorage.getItem('darkMode') === 'true') {
            document.documentElement.classList.add('dark');
            toggleIcon.innerHTML = sunSVG;
            updateThemeColor(true);
        } else {
            toggleIcon.innerHTML = moonSVG;
            updateThemeColor(false);
        }

        darkToggle.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
            const isDark = document.documentElement.classList.contains('dark');
            localStorage.setItem('darkMode', isDark);
            toggleIcon.innerHTML = isDark ? sunSVG : moonSVG;
            updateThemeColor(isDark);
        });
    }

    // ==========================================
    // HELPER: CREATE SIGNAL PILL
    // ==========================================
    function createPillHTML(label, value, themeClass, isOsint = false) {
        let displayValue = value;
        if (label === 'IP Masquerade') displayValue = value === 1 ? 'Yes' : 'No';
        const fullText = `${label}: ${displayValue}`;
        const osintClass = isOsint ? 'signal-pill--osint' : '';
        return `
            <div class="signal-pill ${themeClass} ${osintClass}" title="${fullText}">
                <div style="display:flex;align-items:center;gap:0.4rem;min-width:0;overflow:hidden">
                    <span class="signal-dot"></span>
                    <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${label}</span>
                </div>
                <span style="font-weight:700;margin-left:0.5rem;flex-shrink:0;white-space:nowrap">${displayValue}</span>
            </div>
        `;
    }

    // ==========================================
    // HELPER: THEME EVALUATORS
    // ==========================================
    function getVTTheme(vt_flags) {
        if (vt_flags > 0 || String(vt_flags).includes("Bypassed")) return 'theme-danger';
        return 'theme-safe';
    }

    function getAgeTheme(domain_age) {
        if (domain_age !== "Unknown" && !String(domain_age).includes("Bypassed")) {
            return parseInt(domain_age) < 30 ? 'theme-danger' : 'theme-safe';
        }
        if (String(domain_age).includes("Bypassed")) return 'theme-danger';
        return 'theme-warn';
    }

    function getPayloadTheme(payload_status) {
        if (payload_status === "Clean DOM") return 'theme-safe';
        if (payload_status.includes("Bypassed") || payload_status.includes("Timeout") || payload_status.includes("Failed")) return 'theme-warn';
        return 'theme-danger';
    }

    function getScoreColor(score) {
        if (score > 75) return '#f87171';
        if (score > 40) return '#fbbf24';
        return '#4ade80';
    }

    // ==========================================
    // SCANNING PROGRESS ANIMATION
    // ==========================================
    let progressTimers = [];

    function startScanProgress() {
        scanProgress.classList.remove('hidden');
        const steps = scanProgress.querySelectorAll('.scan-step');
        
        // Reset all steps
        steps.forEach(step => {
            step.classList.remove('active', 'done');
            step.querySelector('.step-check').classList.add('hidden');
        });

        // Staggered step activation
        const delays = [0, 800, 2000, 3500, 5500];
        steps.forEach((step, i) => {
            const timer = setTimeout(() => {
                // Mark previous step as done
                if (i > 0) {
                    steps[i - 1].classList.remove('active');
                    steps[i - 1].classList.add('done');
                    steps[i - 1].querySelector('.step-check').classList.remove('hidden');
                }
                step.classList.add('active');
            }, delays[i]);
            progressTimers.push(timer);
        });
    }

    function completeScanProgress() {
        progressTimers.forEach(t => clearTimeout(t));
        progressTimers = [];
        
        const steps = scanProgress.querySelectorAll('.scan-step');
        steps.forEach(step => {
            step.classList.remove('active');
            step.classList.add('done');
            step.querySelector('.step-check').classList.remove('hidden');
        });

        // Fade out after a beat
        setTimeout(() => {
            scanProgress.classList.add('hidden');
        }, 1500);
    }

    // ==========================================
    // RENDER: SSL DETAILS
    // ==========================================
    // SVG Icons for SSL states (Feather-style, premium look)
    const sslIconLocked = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--safe-solid)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`;
    const sslIconUnlocked = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--danger-solid)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 019.9-1"/></svg>`;
    const sslIconWarning = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--warn-solid)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    const sslIconNone = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--danger-solid)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`;

    function renderSSL(ssl_info) {
        if (!ssl_info) {
            sslIcon.innerHTML = sslIconNone;
            sslStatus.textContent = 'No SSL Certificate';
            sslStatus.style.color = 'var(--danger-text)';
            sslProtocol.textContent = '';
            sslDetails.innerHTML = '';
            return;
        }

        if (ssl_info.is_expired) {
            sslIcon.innerHTML = sslIconUnlocked;
            sslStatus.textContent = 'Certificate Expired';
            sslStatus.style.color = 'var(--danger-text)';
        } else if (ssl_info.days_until_expiry < 30) {
            sslIcon.innerHTML = sslIconWarning;
            sslStatus.textContent = `Expires in ${ssl_info.days_until_expiry} days`;
            sslStatus.style.color = 'var(--warn-text)';
        } else {
            sslIcon.innerHTML = sslIconLocked;
            sslStatus.textContent = 'Valid Certificate';
            sslStatus.style.color = 'var(--safe-text)';
        }

        sslProtocol.textContent = ssl_info.protocol || '';

        sslDetails.innerHTML = `
            <div class="ssl-detail-item">
                <span class="ssl-detail-label">Issuer</span>
                <span class="ssl-detail-value">${ssl_info.issuer}</span>
            </div>
            <div class="ssl-detail-item">
                <span class="ssl-detail-label">Subject</span>
                <span class="ssl-detail-value">${ssl_info.subject}</span>
            </div>
            <div class="ssl-detail-item">
                <span class="ssl-detail-label">Valid From</span>
                <span class="ssl-detail-value">${ssl_info.valid_from}</span>
            </div>
            <div class="ssl-detail-item">
                <span class="ssl-detail-label">Valid Until</span>
                <span class="ssl-detail-value">${ssl_info.valid_until}</span>
            </div>
        `;
    }

    // ==========================================
    // RENDER: REDIRECT CHAIN
    // ==========================================
    function renderRedirects(chain) {
        if (!chain || chain.length === 0) {
            redirectChain.innerHTML = '<span style="color:var(--text-muted);font-size:0.8rem">No data</span>';
            return;
        }

        let html = '';
        chain.forEach((hop, i) => {
            const domain = hop.domain || new URL(hop.url).hostname;
            const statusCode = hop.status > 0 ? hop.status : '?';
            html += `<div class="redirect-hop" title="${hop.url}">
                <span class="hop-status">${statusCode}</span>
                ${domain}
            </div>`;
            if (i < chain.length - 1) {
                html += `<span class="redirect-arrow">→</span>`;
            }
        });

        // Flag if chain is long
        if (chain.length > 3) {
            html += `<span style="color:var(--danger-text);font-size:0.7rem;font-weight:600;margin-left:0.5rem">⚠ ${chain.length} hops</span>`;
        }

        redirectChain.innerHTML = html;
    }

    // ==========================================
    // RENDER: THREAT BREAKDOWN CHART
    // ==========================================
    function renderBreakdown(breakdown) {
        if (!breakdown) {
            breakdownChart.innerHTML = '';
            return;
        }

        const labels = {
            'heuristics': 'Heuristics',
            'ml_ensemble': 'AI Ensemble',
            'virustotal': 'VirusTotal',
            'domain_age': 'Domain Age',
            'payload': 'Payload',
            'ssl': 'SSL / TLS'
        };

        let html = '';
        for (const [key, label] of Object.entries(labels)) {
            const value = Math.round(breakdown[key] || 0);
            const color = getScoreColor(value);
            html += `
                <div class="breakdown-row animate-in">
                    <span class="breakdown-label">${label}</span>
                    <div class="breakdown-track">
                        <div class="breakdown-fill" style="width:0%;background:${color}" data-target="${value}"></div>
                    </div>
                    <span class="breakdown-value">${value}</span>
                </div>
            `;
        }
        breakdownChart.innerHTML = html;

        // Animate bars after render
        requestAnimationFrame(() => {
            setTimeout(() => {
                breakdownChart.querySelectorAll('.breakdown-fill').forEach(bar => {
                    bar.style.width = bar.dataset.target + '%';
                });
            }, 100);
        });
    }

    // ==========================================
    // RENDER: HISTORY TABLE
    // ==========================================
    function renderHistory() {
        if (!recentUrlsBody) return;
        if (scanHistory.length === 0) {
            recentUrlsBody.innerHTML = `<tr><td colspan="3" style="padding:1rem;text-align:center;color:var(--text-muted);font-size:0.85rem">No recent scans yet. Check a URL to see it here.</td></tr>`;
            return;
        }

        recentUrlsBody.innerHTML = scanHistory.map(item => {
            let statusClass = '', displayStatus = '';
            if (item.status === 'SAFE') {
                statusClass = 'background:var(--safe-bg);color:var(--safe-text);border:1px solid var(--safe-border)';
                displayStatus = 'Clean';
            } else if (item.status === 'SUSPICIOUS') {
                statusClass = 'background:var(--warn-bg);color:var(--warn-text);border:1px solid var(--warn-border)';
                displayStatus = 'Suspicious';
            } else {
                statusClass = 'background:var(--danger-bg);color:var(--danger-text);border:1px solid var(--danger-border)';
                displayStatus = 'Threat';
            }
            return `
                <tr style="border-bottom:1px solid var(--table-border);transition:background 0.2s" onmouseover="this.style.background='var(--glass-card-bg)'" onmouseout="this.style.background='transparent'">
                    <td style="padding:0.75rem 0.5rem;font-size:0.8rem;color:#2563eb;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                        <a href="${item.url}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;color:inherit" title="${item.url}">${item.url}</a>
                    </td>
                    <td style="padding:0.85rem 1rem">
                        <span style="padding:0.2rem 0.6rem;border-radius:0.35rem;font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;${statusClass}">${displayStatus}</span>
                    </td>
                    <td style="padding:0.85rem 1rem;text-align:right">
                        <button type="button" class="delete-history-btn" data-url="${encodeURIComponent(item.url)}" title="Delete entry" style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:0.25rem;border-radius:0.25rem;display:inline-flex;align-items:center;justify-content:center;transition:all 0.2s" onmouseover="this.style.color='var(--danger-solid)'" onmouseout="this.style.color='var(--text-muted)'">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Attach delete listeners
        recentUrlsBody.querySelectorAll('.delete-history-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetUrl = decodeURIComponent(btn.dataset.url);
                scanHistory = scanHistory.filter(h => h.url !== targetUrl);
                localStorage.setItem('phishHistory', JSON.stringify(scanHistory));
                renderHistory();
            });
        });
    }

    renderHistory();

    // ==========================================
    // FAQ ACCORDION
    // ==========================================
    document.querySelectorAll('.faq-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const content = btn.nextElementSibling;
            const icon = btn.querySelector('.faq-icon');
            const isHidden = content.classList.contains('hidden');

            document.querySelectorAll('.faq-content').forEach(c => c.classList.add('hidden'));
            document.querySelectorAll('.faq-icon').forEach(i => { i.textContent = '+'; i.classList.remove('rotate-45'); });

            if (isHidden) {
                content.classList.remove('hidden');
                icon.textContent = '−';
            }
        });
    });

    // ==========================================
    // RENDER: SKELETON UI (WHILE LOADING)
    // ==========================================
    function renderSkeletonUI(targetUrl) {
        resultsPanel.classList.remove('hidden');
        resultsPanel.classList.add('animate-in');

        // Status Banner Neutral
        statusBanner.className = 'status-banner rounded-xl p-5 border flex items-center gap-4 transition-colors duration-300';
        statusIcon.innerHTML = `<div class="skeleton-shimmer w-6 h-6 rounded-full"></div>`;
        statusHeadline.innerHTML = `<div class="skeleton-shimmer h-5 w-44 mb-1"></div>`;
        statusSubtext.innerText = `Inspecting ${targetUrl} across all threat intelligence tiers...`;

        // Gauge & Score
        scoreText.innerText = '--';
        scoreText.style.color = 'var(--text-faint)';
        gaugeFill.style.strokeDashoffset = GAUGE_CIRCUMFERENCE;
        gaugeFill.style.stroke = 'var(--gauge-track)';

        // Badges
        badgeIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.innerText = '...';
                el.className = 'badge';
            }
        });

        // Connection Card (Stretched during load)
        const connectionCard = document.getElementById('connectionCard');
        if (connectionCard) connectionCard.style.gridColumn = '1 / -1';
        screenshotCard.classList.add('hidden');

        // SSL Section
        sslIcon.innerHTML = `<div class="skeleton-shimmer w-5 h-5 rounded-full"></div>`;
        sslStatus.textContent = 'Analyzing SSL & Certificate...';
        sslProtocol.textContent = '';
        sslDetails.innerHTML = `
            <div class="ssl-detail-item"><span class="ssl-detail-label">Issuer</span><div class="skeleton-shimmer h-4 w-28 mt-1"></div></div>
            <div class="ssl-detail-item"><span class="ssl-detail-label">Subject</span><div class="skeleton-shimmer h-4 w-36 mt-1"></div></div>
            <div class="ssl-detail-item"><span class="ssl-detail-label">Valid From</span><div class="skeleton-shimmer h-4 w-24 mt-1"></div></div>
            <div class="ssl-detail-item"><span class="ssl-detail-label">Valid Until</span><div class="skeleton-shimmer h-4 w-24 mt-1"></div></div>
        `;

        // Redirects
        redirectChain.innerHTML = `<div class="skeleton-shimmer h-6 w-48 rounded"></div>`;

        // Breakdown Chart Skeletons
        const breakdownLabels = ['Heuristics', 'AI Ensemble', 'VirusTotal', 'Domain Age', 'Payload', 'SSL / TLS'];
        breakdownChart.innerHTML = breakdownLabels.map(label => `
            <div class="breakdown-row">
                <span class="breakdown-label">${label}</span>
                <div class="breakdown-track">
                    <div class="skeleton-shimmer h-full w-full"></div>
                </div>
                <span class="breakdown-value" style="color:var(--text-faint)">--</span>
            </div>
        `).join('');

        // Intelligence Signals Skeletons
        signalsContainer.innerHTML = Array(10).fill(0).map(() => `
            <div class="signal-pill" style="border-color:var(--glass-card-border)">
                <div style="display:flex;align-items:center;gap:0.4rem;width:100%">
                    <div class="skeleton-shimmer w-2 h-2 rounded-full"></div>
                    <div class="skeleton-shimmer h-4 flex-1"></div>
                </div>
            </div>
        `).join('');
    }

    // ==========================================
    // MAIN FORM SUBMIT
    // ==========================================
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        let targetUrl = urlInput.value.trim();
        if (!targetUrl) return;

        // --- URL Normalization ---
        // 1. Add https:// if no protocol
        if (!/^https?:\/\//i.test(targetUrl)) {
            targetUrl = 'https://' + targetUrl;
        }

        // 2. Add www. if the domain is bare (e.g. "youtube.com" → "www.youtube.com")
        //    Skip for: IPs, localhost, domains that already have a subdomain (e.g. "mail.google.com")
        try {
            const urlObj = new URL(targetUrl);
            const hostname = urlObj.hostname;
            const isIP = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':');
            const isLocalhost = hostname === 'localhost';
            const dotParts = hostname.split('.');
            // A bare domain like "youtube.com" has exactly 2 parts; "www.youtube.com" or "mail.google.com" has 3+
            const isBare = dotParts.length === 2 && !isIP && !isLocalhost;

            if (isBare) {
                urlObj.hostname = 'www.' + hostname;
            }

            // 3. Add trailing slash if path is empty
            if (urlObj.pathname === '/' && !urlObj.href.endsWith('/')) {
                targetUrl = urlObj.href + '/';
            } else {
                targetUrl = urlObj.href;
            }
        } catch (_) {
            // If URL parsing fails, just use what we have
        }

        urlInput.value = targetUrl;

        // UI Loading State
        btnText.textContent = 'Scanning...';
        btnSpinner.classList.remove('hidden');
        submitBtn.disabled = true;
        
        // Render Skeleton Results UI while loading
        renderSkeletonUI(targetUrl);

        // Start animated progress steps
        startScanProgress();

        try {
            const response = await fetch('/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: targetUrl })
            });

            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            // Complete scan progress
            completeScanProgress();

            // Store for export
            lastScanData = data;

            // Score processing
            let rawScore = parseFloat(data.risk_score);
            if (rawScore < 1 && rawScore > 0 && data.risk_score.toString().length > 4) {
                rawScore = rawScore * 100;
            }
            const cleanScore = Math.round(rawScore);

            // Show results
            setTimeout(() => {
                resultsPanel.classList.remove('hidden');
                resultsPanel.classList.add('animate-in');

                // Populate score
                scoreText.innerText = cleanScore;
                scoreText.style.color = getScoreColor(cleanScore);

                // Animate radial gauge
                const offset = GAUGE_CIRCUMFERENCE * (1 - cleanScore / 100);
                gaugeFill.style.strokeDashoffset = offset;
                gaugeFill.style.stroke = getScoreColor(cleanScore);

                // Theme
                const activeTheme = cleanScore > 75 ? 'theme-danger' : (cleanScore > 40 ? 'theme-warn' : 'theme-safe');

                // Status banner
                let badgeText = '';
                if (cleanScore > 75) {
                    badgeText = 'Threat';
                    statusHeadline.innerText = "Critical Threat Detected";
                    statusSubtext.innerText = `${targetUrl} triggered multiple high-risk indicators. Do not visit this site.`;
                    statusIcon.innerHTML = iconDanger;
                } else if (cleanScore > 40) {
                    badgeText = 'Warning';
                    statusHeadline.innerText = "Suspicious Link";
                    statusSubtext.innerText = `${targetUrl} exhibits anomalies. Proceed with extreme caution.`;
                    statusIcon.innerHTML = iconWarn;
                } else {
                    badgeText = 'Clean';
                    statusHeadline.innerText = "No threats detected";
                    statusSubtext.innerText = `${targetUrl} was not flagged by the AI engine. Heuristic analysis is clear.`;
                    statusIcon.innerHTML = iconSafe;
                }

                // Apply theme to all elements
                applyTheme(activeTheme);
                setBadgesText(badgeText);

                // --- SIGNALS GRID ---
                signalsContainer.innerHTML = '';
                const vtDisplay = isNaN(data.vt_flags) ? data.vt_flags : `${data.vt_flags} Flags`;
                signalsContainer.innerHTML += createPillHTML('VirusTotal', vtDisplay, getVTTheme(data.vt_flags), true);
                signalsContainer.innerHTML += createPillHTML('Domain Age', data.domain_age, getAgeTheme(data.domain_age), true);
                signalsContainer.innerHTML += createPillHTML('Payload', data.payload_status, getPayloadTheme(data.payload_status), true);

                // GSB pill
                if (data.gsb_flags !== null && data.gsb_flags !== undefined) {
                    const gsbTheme = data.gsb_flags > 0 ? 'theme-danger' : 'theme-safe';
                    signalsContainer.innerHTML += createPillHTML('Safe Browsing', `${data.gsb_flags} Threats`, gsbTheme, true);
                }

                // Divider between OSINT and lexical features
                signalsContainer.innerHTML += '<div class="signals-divider"></div>';

                // Lexical features
                if (data.lexical_features) {
                    for (const [backendKey, uiLabel] of Object.entries(featureDictionary)) {
                        const value = data.lexical_features[backendKey];
                        if (value !== undefined) {
                            signalsContainer.innerHTML += createPillHTML(uiLabel, value, activeTheme);
                        }
                    }
                }

                // --- SCREENSHOT + CONNECTION CARD LAYOUT ---
                const connectionCard = document.getElementById('connectionCard');
                if (data.screenshot) {
                    screenshotCard.classList.remove('hidden');
                    screenshotImg.src = `data:image/png;base64,${data.screenshot}`;
                    connectionCard.style.gridColumn = '';
                } else {
                    screenshotCard.classList.add('hidden');
                    // Stretch connection card to full width when no screenshot
                    connectionCard.style.gridColumn = '1 / -1';
                }

                // --- SSL DETAILS ---
                renderSSL(data.ssl_info);

                // --- REDIRECT CHAIN ---
                renderRedirects(data.redirect_chain);

                // --- THREAT BREAKDOWN ---
                renderBreakdown(data.score_breakdown);

                // --- HISTORY ---
                scanHistory = scanHistory.filter(h => h.url !== targetUrl);
                scanHistory.unshift({ url: targetUrl, status: data.status });
                if (scanHistory.length > 10) scanHistory.pop();
                localStorage.setItem('phishHistory', JSON.stringify(scanHistory));
                renderHistory();

            }, 300);

        } catch (error) {
            completeScanProgress();
            alert("Analysis Failed: " + error.message);
            console.error(error);
        } finally {
            btnText.textContent = 'Analyze URL';
            btnSpinner.classList.add('hidden');
            submitBtn.disabled = false;
        }
    });

    // ==========================================
    // THEME & BADGE HELPERS
    // ==========================================
    function setBadgesText(text) {
        badgeIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (id !== 'badgeIP' || el.innerText !== 'Detected') {
                    el.innerText = text;
                }
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

    // ==========================================
    // SAMPLE URL CHIPS
    // ==========================================
    document.querySelectorAll('.sample-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const url = chip.dataset.url;
            if (url && urlInput) {
                urlInput.value = url;
                form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }
        });
    });

    // ==========================================
    // EXPORT: COPY SUMMARY
    // ==========================================
    const copySummaryBtn = document.getElementById('copySummary');
    const copyBtnText = document.getElementById('copyBtnText');
    if (copySummaryBtn) {
        copySummaryBtn.addEventListener('click', async () => {
            if (!lastScanData) return alert('No scan data to copy. Run a scan first.');
            
            const d = lastScanData;
            const summary = `Phishing URL Checker Summary
Target URL: ${d.url}
Threat Score: ${Math.round(d.risk_score)}/100 [${d.status}]
VirusTotal Flags: ${d.vt_flags}
Domain Age: ${d.domain_age}
Payload Status: ${d.payload_status}
SSL Certificate: ${d.ssl_info ? `${d.ssl_info.issuer} (${d.ssl_info.protocol || 'TLS'})` : 'No SSL'}
Redirect Hops: ${d.redirect_chain ? d.redirect_chain.length : 1}
Scanned: ${new Date().toLocaleString()}`;

            try {
                await navigator.clipboard.writeText(summary);
                if (copyBtnText) {
                    const original = copyBtnText.textContent;
                    copyBtnText.textContent = 'Copied! ✓';
                    setTimeout(() => { copyBtnText.textContent = original; }, 2000);
                }
            } catch (err) {
                alert('Could not copy to clipboard.');
            }
        });
    }

    // ==========================================
    // EXPORT: JSON
    // ==========================================
    document.getElementById('exportJSON').addEventListener('click', () => {
        if (!lastScanData) return alert('No scan data to export. Run a scan first.');

        const blob = new Blob([JSON.stringify(lastScanData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const domain = new URL(lastScanData.url).hostname || 'scan';
        a.download = `phishing_url_report_${domain}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    // ==========================================
    // EXPORT: PDF (via print)
    // ==========================================
    document.getElementById('exportPDF').addEventListener('click', () => {
        if (!lastScanData) return alert('No scan data to export. Run a scan first.');

        // Build a clean HTML report
        const d = lastScanData;
        const scoreColor = getScoreColor(Math.round(d.risk_score));
        const sslHtml = d.ssl_info ? `
            <div style="margin:12px 0;padding:12px;border:1px solid #e2e8f0;border-radius:8px">
                <strong>SSL Certificate</strong><br>
                Issuer: ${d.ssl_info.issuer}<br>
                Subject: ${d.ssl_info.subject}<br>
                Valid: ${d.ssl_info.valid_from} — ${d.ssl_info.valid_until}<br>
                Protocol: ${d.ssl_info.protocol || 'N/A'}<br>
                ${d.ssl_info.is_expired ? '<span style="color:#dc2626;font-weight:600">EXPIRED</span>' : `Expires in ${d.ssl_info.days_until_expiry} days`}
            </div>
        ` : '<p>No SSL certificate detected.</p>';

        const redirectHtml = d.redirect_chain ? d.redirect_chain.map(h =>
            `<code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:12px">[${h.status}] ${h.domain}</code>`
        ).join(' → ') : 'N/A';

        const screenshotHtml = d.screenshot ? 
            `<img src="data:image/png;base64,${d.screenshot}" style="max-width:100%;border:1px solid #e2e8f0;border-radius:8px;margin:12px 0">` : '';

        const reportHtml = `
        <!DOCTYPE html>
        <html><head>
            <title>Phishing URL Checker — Scan Report</title>
            <style>
                body { font-family: 'Segoe UI', system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #1e293b; }
                h1 { font-size: 24px; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
                h2 { font-size: 16px; color: #475569; margin-top: 24px; }
                .score { font-size: 64px; font-weight: 900; color: ${scoreColor}; }
                .status { font-size: 18px; font-weight: 700; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
                .item { padding: 8px; background: #f8fafc; border-radius: 6px; font-size: 13px; }
                .item-label { font-weight: 600; color: #64748b; }
                code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
            </style>
        </head><body>
            <h1>Phishing URL Checker — Scan Report</h1>
            <p><strong>URL:</strong> <code>${d.url}</code></p>
            <p><strong>Scanned:</strong> ${new Date().toLocaleString()}</p>
            
            <h2>Risk Assessment</h2>
            <div class="score">${Math.round(d.risk_score)}</div>
            <div class="status">Status: ${d.status}</div>
            
            <h2>OSINT Intelligence</h2>
            <div class="grid">
                <div class="item"><span class="item-label">VirusTotal Flags:</span> ${d.vt_flags}</div>
                <div class="item"><span class="item-label">Domain Age:</span> ${d.domain_age}</div>
                <div class="item"><span class="item-label">Payload:</span> ${d.payload_status}</div>
                <div class="item"><span class="item-label">Safe Browsing:</span> ${d.gsb_flags !== null ? d.gsb_flags + ' threats' : 'N/A'}</div>
            </div>
            
            <h2>SSL Certificate</h2>
            ${sslHtml}
            
            <h2>Redirect Chain</h2>
            <p>${redirectHtml}</p>
            
            ${screenshotHtml ? '<h2>Site Preview</h2>' + screenshotHtml : ''}
            
            <h2>Lexical Features</h2>
            <div class="grid">
                ${Object.entries(d.lexical_features || {}).map(([k, v]) =>
                    `<div class="item"><span class="item-label">${featureDictionary[k] || k}:</span> ${v}</div>`
                ).join('')}
            </div>
            
            <hr style="margin-top:32px;border-color:#e2e8f0">
            <p style="font-size:11px;color:#94a3b8;text-align:center">Generated by Phishing URL Checker</p>
        </body></html>`;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(reportHtml);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    });

    // ==========================================
    // BULK SCAN MODAL
    // ==========================================
    const bulkBtn = document.getElementById('bulkBtn');
    const bulkModal = document.getElementById('bulkModal');
    const bulkOverlay = document.getElementById('bulkOverlay');
    const bulkClose = document.getElementById('bulkClose');
    const bulkCancel = document.getElementById('bulkCancel');
    const bulkSubmit = document.getElementById('bulkSubmit');
    const bulkInput = document.getElementById('bulkInput');
    const bulkResults = document.getElementById('bulkResults');
    const bulkBtnText = document.getElementById('bulkBtnText');
    const bulkSpinner = document.getElementById('bulkSpinner');

    function openBulkModal() { bulkModal.classList.remove('hidden'); }
    function closeBulkModal() {
        bulkModal.classList.add('hidden');
        bulkResults.classList.add('hidden');
        bulkResults.innerHTML = '';
    }

    bulkBtn.addEventListener('click', openBulkModal);
    bulkOverlay.addEventListener('click', closeBulkModal);
    bulkClose.addEventListener('click', closeBulkModal);
    bulkCancel.addEventListener('click', closeBulkModal);

    bulkSubmit.addEventListener('click', async () => {
        const urls = bulkInput.value.trim().split('\n').filter(u => u.trim());
        if (urls.length === 0) return;

        bulkBtnText.textContent = 'Scanning...';
        bulkSpinner.classList.remove('hidden');
        bulkSubmit.disabled = true;

        try {
            const response = await fetch('/analyze-bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls })
            });

            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            // Render results
            bulkResults.classList.remove('hidden');
            bulkResults.innerHTML = data.results.map(r => {
                let statusStyle = '';
                let statusLabel = '';
                if (r.status === 'SAFE') {
                    statusStyle = 'background:var(--safe-bg);color:var(--safe-text);border:1px solid var(--safe-border)';
                    statusLabel = 'Clean';
                } else if (r.status === 'SUSPICIOUS') {
                    statusStyle = 'background:var(--warn-bg);color:var(--warn-text);border:1px solid var(--warn-border)';
                    statusLabel = 'Suspicious';
                } else if (r.status === 'ERROR') {
                    statusStyle = 'background:var(--gauge-track);color:var(--text-muted)';
                    statusLabel = 'Error';
                } else {
                    statusStyle = 'background:var(--danger-bg);color:var(--danger-text);border:1px solid var(--danger-border)';
                    statusLabel = 'Threat';
                }
                return `
                    <div class="bulk-result-row">
                        <span class="bulk-url" title="${r.url}">${r.url}</span>
                        <span class="bulk-status" style="${statusStyle};padding:0.2rem 0.6rem;border-radius:0.35rem;font-size:0.65rem">${statusLabel} (${r.risk_score >= 0 ? Math.round(r.risk_score) : '?'})</span>
                    </div>
                `;
            }).join('');

        } catch (error) {
            alert("Bulk scan failed: " + error.message);
        } finally {
            bulkBtnText.textContent = 'Scan All';
            bulkSpinner.classList.add('hidden');
            bulkSubmit.disabled = false;
        }
    });
});