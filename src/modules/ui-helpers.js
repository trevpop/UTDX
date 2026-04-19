// ============================================================================
// UI-HELPERS.JS - UI Interaction & Toggle Functions
// ============================================================================

window.ancientMageState = { mode: 'utility', attackBoss: false };

// Reset and trigger database re-render
const resetAndRender = () => { 
    renderQueueIndex = 0; 
    renderDatabase(); 
};

function filterList(element) {
    const card = element.closest('.unit-card');
    if (!card) return;
    const unitId = card.id.replace('card-', '');

    if (typeof updateBuildListDisplay === 'function') {
        updateBuildListDisplay(unitId);
    }
}

// Generic checkbox toggle with callback
function toggleCheckbox(checkbox, callback) {
    checkbox.parentNode.classList.toggle('is-checked', checkbox.checked);
    if(callback) callback(checkbox);
}

// Helper to update body class based on checkbox state
const updateBodyClass = (className, isChecked) => {
    if (isChecked) document.body.classList.add(className);
    else document.body.classList.remove(className);
};

// --- GENERIC SYNCED TOGGLE LOGIC ---

/**
 * Syncs a checkbox with another checkbox ID and toggles a body class.
 * Replaces toggleSubStats, toggleHeadPiece, etc.
 * @param {HTMLInputElement} triggerEl - The checkbox clicked
 * @param {string} targetId - The ID of the matching checkbox in the other menu (Header vs Guide)
 * @param {string} cssClass - The class to toggle on document.body
 */
const syncVisualToggle = (triggerEl, targetId, cssClass) => {
    toggleCheckbox(triggerEl, (el) => {
        const otherCb = document.getElementById(targetId);
        if(otherCb) {
            otherCb.checked = el.checked;
            otherCb.parentNode.classList.toggle('is-checked', el.checked);
        }
        updateBodyClass(cssClass, el.checked);
        
        // PERFORMANCE: Trigger update for visible units instead of full render
        if (document.getElementById('dbPage').classList.contains('active')) {
            updateAllUnitsBuilds();
        } else if (document.getElementById('guidesPage').classList.contains('active') && typeof renderGuides === 'function') {
            renderGuides();
        }
    });
};

// Wrappers for HTML onclick handlers
const toggleSubStats = (cb) => {
    const target = cb.id === 'globalSubStats' ? 'guideSubStats' : 'globalSubStats';
    syncVisualToggle(cb, target, 'show-subs');
};

const toggleHeadPiece = (cb) => {
    const target = cb.id === 'globalHeadPiece' ? 'guideHeadPiece' : 'globalHeadPiece';
    syncVisualToggle(cb, target, 'show-head');
};

// Map old names for compatibility
const toggleGuideSubStats = toggleSubStats;
const toggleGuideHeadPiece = toggleHeadPiece;


// Toggle Inventory Mode
const toggleInventoryMode = (checkbox) => {
    const isChecked = checkbox.checked;
    inventoryMode = isChecked;
    
    // Visual toggle
    checkbox.parentNode.classList.toggle('is-checked', isChecked);

    // Sync other toggle
    const otherId = checkbox.id === 'globalInventoryMode' ? 'guideInventoryMode' : 'globalInventoryMode';
    const otherCheckbox = document.getElementById(otherId);
    if(otherCheckbox) {
        otherCheckbox.checked = isChecked;
        otherCheckbox.parentNode.classList.toggle('is-checked', isChecked);
    }

    // Trigger full calculation re-render
    resetAndRender();
    if(document.getElementById('guidesPage').classList.contains('active')) {
        renderGuides();
    }
};

// Add global states for Support Buffs
window.mikuBuffActive = false;
window.buddhaBuffActive = false;
window.frierenBuffActive = false;

// Shared Helper to handle visual updates and deferred math
// Shared Helper to handle visual updates and deferred math
const handleSupportToggle = (stateKey, checkbox) => {
    window[stateKey] = checkbox.checked;
    
    const label = checkbox.closest('.nav-toggle-label');
    if (label) {
        label.classList.toggle('is-checked', checkbox.checked);
        const span = label.querySelector('span');
        if (span) {
            let glowColor = '';
            // Assign specific colors to specific toggles
            if (stateKey === 'mikuBuffActive') glowColor = '#39C5BB';      // Miku's Cyan
            else if (stateKey === 'buddhaBuffActive') glowColor = '#FACC15'; // Golden Yellow
            else if (stateKey === 'frierenBuffActive') glowColor = '#E2E8F0'; // Bright Silver

            // Apply glow and border intensity when checked
            span.style.color = checkbox.checked ? glowColor : ''; 
            span.style.textShadow = checkbox.checked ? `0 0 12px ${glowColor}` : ''; 
            span.style.fontWeight = checkbox.checked ? 'bold' : '';
            
            if (checkbox.checked) {
                label.style.borderColor = glowColor;
                label.style.boxShadow = `0 0 10px ${glowColor}40`;
            } else {
                label.style.borderColor = '';
                label.style.boxShadow = '';
            }
        }
    }

    // Defer the heavy math so the switch animates smoothly
    setTimeout(() => {
        // Wipe cache to force fresh math
        if (typeof unitBuildsCache !== 'undefined') unitBuildsCache = {};
        
        // Trigger the recalculation (defer to allow UI update)
        if (typeof resetAndRender === 'function') resetAndRender();
        else if (typeof renderDatabase === 'function') {
            renderQueueIndex = 0;
            renderDatabase();
        }
    }, 20);
};

// Hook up the HTML buttons to the Shared Helper
window.toggleMikuBuff = (cb) => handleSupportToggle('mikuBuffActive', cb);
window.toggleBuddhaBuff = (cb) => handleSupportToggle('buddhaBuffActive', cb);
window.toggleFrierenBuff = (cb) => handleSupportToggle('frierenBuffActive', cb);


// Toggle Kirito mode (Realm/Card)
window.toggleKiritoMode = function(mode, checkbox) {
    if (mode === 'realm') {
        kiritoState.realm = checkbox.checked;
        // If turning off Realm, automatically turn off Magician Card
        if (!checkbox.checked) kiritoState.card = false; 
    } else if (mode === 'card') {
        kiritoState.card = checkbox.checked;
    }
    
    const unit = typeof unitDatabase !== 'undefined' ? unitDatabase.find(u => u.id === 'kirito') : null;
    if (!unit) return;

    // 1. Wipe the old math cache so the new state applies immediately
    if (typeof wipeUnitCache === 'function') wipeUnitCache('kirito');

    // 2. Safely update the UI if the card is currently visible
    const card = document.getElementById('card-kirito');
    if (card) {
        if (typeof getUnitControlsHtml === 'function') {
            const toolbars = card.querySelectorAll('.kirito-toolbar');
            toolbars.forEach(tb => {
                tb.outerHTML = getUnitControlsHtml(unit);
            });
        }
    }

    // 3. Trigger the recalculation and redraw the list
    if (typeof updateBuildListDisplay === 'function') {
        updateBuildListDisplay('kirito');
    }
    
    // 4. Update the Guides page if it is currently open
    const guidesPage = document.getElementById('guidesPage');
    if (guidesPage && guidesPage.classList.contains('active') && typeof renderGuides === 'function') {
        renderGuides();
    }
};

// Calculate Helpers
const getFilteredBuilds = () => globalBuilds.filter(b => {
    if (!statConfig.applyRelicCrit && (b.cf > 0 || b.cm > 0)) return false;
    if (!statConfig.applyRelicDot && b.dot > 0) return false;
    
    if (!statConfig.applyRelicDmg && b.dmg > 10 || !statConfig.applyRelicSpa && b.spa > 10) return false;
    return true;
});

const getValidSubCandidates = () => SUB_CANDIDATES.filter(c => 
    !((!statConfig.applyRelicCrit && (c === 'cm' || c === 'cf')) || (!statConfig.applyRelicDot && c === 'dot'))
);

// NEW: Injects Bambietta's specific durations and averages out her 50% proc chance
window.setBambiettaElement = function(elementName, selectElement) {
    if (typeof bambiettaState !== 'undefined') {
        bambiettaState.element = elementName;
    }
    
    const bambi = unitDatabase.find(u => u.id === 'bambietta');
    if (bambi && typeof BAMBIETTA_MODES !== 'undefined' && BAMBIETTA_MODES[elementName]) {
        const modeData = BAMBIETTA_MODES[elementName];
        
        // 50% Damage * 50% Proc Chance = 20% Effective DoT for the DPS average
        bambi.stats.dot = (modeData.dot || 0) * 0.5; 
        bambi.stats.dotDuration = modeData.dotDuration || 0;
    }
    
    wipeUnitCache('bambietta');
    
    if (typeof updateBuildListDisplay === 'function') {
        updateBuildListDisplay('bambietta');
    }
};

// Set Robot 17 & 18 Mode
function setRobot1718Mode(mode, selectEl) {
    robot1718State.mode = mode;
    const unit = unitDatabase.find(u => u.id === 'robot1718');
    if (!unit) return;

    if (typeof processUnitCache === 'function') {
        processUnitCache(unit);
    } else {
        resetAndRender();
        return;
    }

    updateBuildListDisplay(unit.id);
    
    if (document.getElementById('guidesPage').classList.contains('active')) {
        renderGuides();
    }
}

// Remove toggleSelection (DEPRECATED)
function updateCompareBtn() { /* DEPRECATED */ }

// Remove selectAllUnits and updateCompareBtn (DEPRECATED)

// Toggle ability for a unit
function toggleAbility(unitId, checkbox) {
    const card = document.getElementById('card-' + unitId);
    if (!card) return;
    checkbox.parentNode.classList.toggle('is-checked', checkbox.checked);
    if (checkbox.checked) {
        card.classList.add('use-ability');
        activeAbilityIds.add(unitId);
    } else {
        card.classList.remove('use-ability');
        activeAbilityIds.delete(unitId);
    }
    updateBuildListDisplay(unitId);
}

/**
 * Optimized way to refresh build lists on all currently rendered unit cards.
 * Avoids full renderDatabase() call which is much slower.
 */
function updateAllUnitsBuilds() {
    unitDatabase.forEach(unit => {
        const card = document.getElementById('card-' + unit.id);
        if (card && !card.classList.contains('lazy-build-load')) {
            updateBuildListDisplay(unit.id);
        }
    });

    // Also update Guides if they are active and not lazy
    const guides = document.querySelectorAll('.calc-guide-card:not(.lazy-guide-load)');
    guides.forEach(g => {
        const unitId = g.id.replace('card-', '');
        updateGuideBuilds(unitId);
    });
}

function injectDbToolbarButtons() {
    const dbToolbar = document.getElementById('dbInjector');
    if (!dbToolbar) return;

    // Inject Trait Tier List Button (Dynamic)
    if (!document.getElementById('btnTraitTierList')) {
        const btn = document.createElement('button');
        btn.id = 'btnTraitTierList';
        btn.className = 'nav-btn';
        btn.style.cssText = 'border: 1px solid var(--accent-start); color: var(--accent-start); margin-left: 10px;';
        btn.innerHTML = 'Trait Tier List';
        btn.onclick = () => window.openTraitTierList && window.openTraitTierList();
        dbToolbar.appendChild(btn);
    }
    // Inject Trait Stats Guide Button
    if (!document.getElementById('btnTraitStatsGuide')) {
        const btn = document.createElement('button');
        btn.id = 'btnTraitStatsGuide';
        btn.className = 'nav-btn';
        btn.style.cssText = 'border: 1px solid var(--accent-end); color: var(--accent-end); margin-left: 10px;';
        btn.innerHTML = 'Trait Stats';
        btn.onclick = () => window.openAllTraitsGuide && window.openAllTraitsGuide();
        dbToolbar.appendChild(btn);
    }
}

// Switch between pages
window.switchPage = function(targetPage) {
    // 1. Highlight the correct top navigation tab by checking its text
    document.querySelectorAll('.nav-bar .nav-btn').forEach(btn => {
        btn.classList.remove('active'); // Turn off all buttons
        
        // Turn on the specific button that matches the page
        if (targetPage === 'db' && btn.textContent.includes('Unit Database')) {
            btn.classList.add('active');
        }
        if (targetPage === 'inventory' && btn.textContent.includes('Relic Inventory')) {
            btn.classList.add('active');
        }
    });

    // 2. Show the correct sub-toolbar, hide the others
    document.querySelectorAll('.injector-panel').forEach(panel => panel.classList.add('hidden'));
    if (targetPage === 'db') document.getElementById('dbInjector')?.classList.remove('hidden');
    if (targetPage === 'inventory') document.getElementById('inventoryToolbar')?.classList.remove('hidden');

    // 3. THE NUKE: Violently force hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
        if (page.id === 'dbPage') page.classList.remove('db-grid');
        page.style.setProperty('display', 'none', 'important');
    });

    // 4. Safely open the target page
    const pageToOpen = document.getElementById(targetPage + 'Page');
    if (pageToOpen) {
        pageToOpen.classList.add('active');
        pageToOpen.style.removeProperty('display');
        if (targetPage === 'db') pageToOpen.classList.add('db-grid');
    }

    // 5. Trigger the necessary math/rendering
    if (targetPage === 'inventory' && typeof renderInventory === 'function') renderInventory();
};

function resetAndOpenInventory() {
    if (typeof clearInventoryHighlights === 'function') {
        clearInventoryHighlights();
    }
    switchPage('inventory');
}

// Toggle deep dive section
const toggleDeepDive = (btn) => {
    const content = btn.nextElementSibling;
    const arrow = btn.querySelector('.dd-arrow');
    
    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        arrow.textContent = '▼';
    } else {
        content.classList.add('hidden');
        arrow.textContent = '▶';
    }
};

function toggleHeader() {
    document.body.classList.toggle('header-collapsed');
}

// Sticky detection observer
document.addEventListener('DOMContentLoaded', () => {
    const sentinel = document.getElementById('sticky-sentinel');
    const toolbar = document.getElementById('headerToolbarSection');

    if (sentinel && toolbar) {
        const observer = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
                toolbar.classList.add('is-sticky');
            } else {
                toolbar.classList.remove('is-sticky');
            }
        }, { threshold: [1] });

        observer.observe(sentinel);
    }

    injectDbToolbarButtons();
});

let savedScrollPosition = 0;

function updateBodyScroll() {
    const visibleModals = Array.from(document.querySelectorAll('.modal-overlay')).some(m => m.classList.contains('is-visible'));
    const visiblePopups = document.getElementById('mathInfoPopup');
    const body = document.body;

    if (visibleModals || visiblePopups) {
        if (!body.classList.contains('scroll-locked')) {
            savedScrollPosition = window.scrollY;
            body.style.setProperty('--scroll-offset', `-${savedScrollPosition}px`);
            body.classList.add('scroll-locked');
        }
    } else {
        if (body.classList.contains('scroll-locked')) {
            body.classList.remove('scroll-locked');
            body.style.removeProperty('--scroll-offset');
            window.scrollTo(0, savedScrollPosition);
        }
    }
}

function renderCredits() {
    const container = document.getElementById('creditsContainer');
    if (!container || typeof creditsData === 'undefined') return;

    // Standard Discord Logo (Visual only)
    const discordLogo = `<svg class="discord-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="opacity: 0.7;"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 13.486 13.486 0 0 0-.64 1.28 18.27 18.27 0 0 0-4.998 0 13.49 13.49 0 0 0-.644-1.28.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.118.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.956 2.42-2.157 2.42zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.946 2.42-2.157 2.42z"/></svg>`;

    // External Link Icon (The "Little Button")
    const linkIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="external-link-icon"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`;

    container.innerHTML = creditsData.map(c => {
        // Updated Link Button Logic:
        // 1. Keep the standard HTML anchor tag (Best for Mobile Universal Links).
        // 2. Add onclick="handleDiscordLink" (Best for Desktop Protocol triggering).
        const linkButtonHtml = c.userId 
            ? `<a href="https://discord.com/users/${c.userId}" target="_blank" rel="noopener noreferrer" class="discord-link-btn" onclick="handleDiscordLink('${c.userId}', event)" title="Open Discord Profile" style="display: inline-flex; align-items: center; justify-content: center; text-decoration: none; color: inherit;">${linkIcon}</a>`
            : '';

        return `
        <div class="credit-badge ${c.type}" onclick="handleCreditClick('${c.id}')" title="Copy Username: ${c.id}">
            <div class="badge-role">${c.role}</div>
            <div class="badge-content">
                ${c.pfp ? `<img src="${c.pfp}" class="badge-pfp" alt="${c.name}">` : ''}
                <span class="badge-name">${c.name}</span>
                ${discordLogo}
                ${linkButtonHtml}
            </div>
        </div>
        `;
    }).join('');
}

// 1. Copy Function (Triggered when clicking the Badge body)
window.handleCreditClick = function(username) {
    copyDiscordToClipboard(username);
};

// 2. Hybrid Link Function (Triggered when clicking the Link Icon)
window.handleDiscordLink = function(userId, event) {
    // Stop event bubbling (prevents "Copy Username" toast)
    event.stopPropagation();

    // Check if the user is on Mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
        // MOBILE STRATEGY:
        // Do nothing in JS. Let the standard HTML <a> tag handle the navigation.
        // Mobile OSs (iOS/Android) are smart enough to see "https://discord.com/users/..."
        // and open the installed Discord App automatically via Universal Links.
        return;
    } else {
        // DESKTOP STRATEGY:
        // Desktop browsers usually treat "https://" as a website link and just open a tab.
        // To launch the App, we must explicitly trigger the "discord://" protocol.
        
        // This line attempts to launch the Desktop App:
        window.location.href = `discord://-/users/${userId}`;

        // NOTE: We do NOT use event.preventDefault().
        // Why? Because if the user *doesn't* have the Desktop App installed, the protocol line above does nothing.
        // By allowing the <a> tag's default behavior (opening the href in _blank), we ensure
        // a New Tab opens with the web profile as a failsafe.
        // Result: User gets "Open Discord?" prompt AND a web tab. This is standard behavior for deep links.
    }
};

window.copyDiscordToClipboard = function(username) {
    navigator.clipboard.writeText(username).then(() => {
        showToast(`Copied "${username}" to clipboard! Paste in Discord to message.`);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showToast('Failed to copy username.');
    });
};

function showToast(message) {
    let toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0, 0, 0, 0.9)',
        color: '#fff',
        padding: '12px 24px',
        borderRadius: '50px',
        zIndex: '9999',
        fontSize: '0.9rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(5px)',
        animation: 'fadeInOut 3s forwards'
    });

    if (!document.getElementById('toast-style')) {
        const style = document.createElement('style');
        style.id = 'toast-style';
        style.innerHTML = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translate(-50%, 20px); }
                10% { opacity: 1; transform: translate(-50%, 0); }
                90% { opacity: 1; transform: translate(-50%, 0); }
                100% { opacity: 0; transform: translate(-50%, -20px); }
            }
        `;
        document.head.appendChild(style);
    }

    setTimeout(() => {
        if(toast && toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3000);
}

// Force the website to cleanly load the Unit Database on startup
document.addEventListener('DOMContentLoaded', () => {
    if (typeof switchPage === 'function') {
        switchPage('db');
    }
});