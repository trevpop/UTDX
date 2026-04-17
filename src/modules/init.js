// ============================================================================
// INIT.JS - Application Initialization
// ============================================================================

window.onload = () => { 
    // 1. SYNC CSS CLASSES
    const globalHead = document.getElementById('globalHeadPiece');
    const globalSubs = document.getElementById('globalSubStats');
    if(globalHead && globalHead.checked) document.body.classList.add('show-head');
    if(globalSubs && globalSubs.checked) document.body.classList.add('show-subs');

    // 2. Setup Guide Dropdowns (Safe check)
    if(typeof populateGuideDropdowns === 'function') populateGuideDropdowns(); 

    // 3. Inject Buttons
    injectSupportButtons();
    if(typeof injectTierListButton === 'function') injectTierListButton();

    if(typeof setGuideMode === 'function') setGuideMode('current'); 

    // 4. Render Content
    if(typeof renderCredits === 'function') renderCredits();
    
    // 5. CRITICAL: Draw the database!
    if(typeof renderDatabase === 'function') renderDatabase(); 
    
    // 6. Initialize Inventory
    if(typeof initInventory === 'function') initInventory();
};

function injectSupportButtons() {
    // 1. Inject distinct styles for the support buttons and switches
    if (!document.getElementById('support-btn-styles')) {
        const style = document.createElement('style');
        style.id = 'support-btn-styles';
        style.innerHTML = `
            /* Miku (Blue) */
            .miku-btn-special { border-color: rgba(57, 197, 187, 0.4) !important; color: #39C5BB !important; }
            .miku-btn-special:hover span { color: #fff !important; text-shadow: 0 0 10px rgba(57, 197, 187, 0.8) !important; }
            input#globalMikuBuff:checked + .mini-switch { background: #39C5BB !important; border-color: #39C5BB !important; }

            /* Buddha (Yellow) */
            .buddha-btn-special { border-color: rgba(250, 204, 21, 0.4) !important; color: #FACC15 !important; }
            .buddha-btn-special:hover span { color: #fff !important; text-shadow: 0 0 10px rgba(250, 204, 21, 0.8) !important; }
            input#globalBuddhaBuff:checked + .mini-switch { background: #FACC15 !important; border-color: #FACC15 !important; }

            /* Frieren (Silver) */
            .frieren-btn-special { border-color: rgba(226, 232, 240, 0.4) !important; color: #E2E8F0 !important; }
            .frieren-btn-special:hover span { color: #fff !important; text-shadow: 0 0 10px rgba(226, 232, 240, 0.8) !important; }
            input#globalFrierenBuff:checked + .mini-switch { background: #E2E8F0 !important; border-color: #E2E8F0 !important; }
        `;
        document.head.appendChild(style);
    }

    const injector = document.getElementById('dbInjector');
    if (!injector) return;

    // 2. A flexible button creator (Removed the hardcoded miku-btn-label)
    const createSupportBtn = (id, text, hoverTitle, toggleFuncName, specialClass) => {
        const label = document.createElement('label');
        label.className = `nav-toggle-label ${specialClass}`;
        label.title = hoverTitle;
        
        label.innerHTML = `
            <div class="toggle-wrapper" style="gap: 6px;">
                <input type="checkbox" id="${id}" style="cursor: pointer;">
                <div class="mini-switch"></div>
                <span style="transition: all 0.2s ease;">${text}</span>
            </div>
        `;
        
        const input = label.querySelector('input');
        input.addEventListener('change', function() { 
            if(typeof window[toggleFuncName] === 'function') window[toggleFuncName](this); 
        });
        
        return label;
    };

    // 3. Inject the three buttons with their specific color classes
    const mikuBtn = createSupportBtn('globalMikuBuff', 'Miku Buff', "Apply Miku's +100% Damage Buff", 'toggleMikuBuff', 'miku-btn-special');
    const buddhaBtn = createSupportBtn('globalBuddhaBuff', 'Buddha Buff', "Apply Buddha's +20% Dmg/Rng/SPA Buff", 'toggleBuddhaBuff', 'buddha-btn-special');
    const frierenBtn = createSupportBtn('globalFrierenBuff', 'Frieren Support', "Apply Frieren's +20% Crit Buffs", 'toggleFrierenBuff', 'frieren-btn-special');

    // Find the Inventory Mode toggle to place them right after it
    const invLabel = document.getElementById('invModeToggle');
    if (invLabel) {
        invLabel.insertAdjacentElement('afterend', frierenBtn);
        invLabel.insertAdjacentElement('afterend', buddhaBtn);
        invLabel.insertAdjacentElement('afterend', mikuBtn);
    } else {
        injector.appendChild(mikuBtn);
        injector.appendChild(buddhaBtn);
        injector.appendChild(frierenBtn);
    }
}

function injectTierListButton() {
    const dbToolbar = document.getElementById('dbInjector');
    if (dbToolbar && !document.getElementById('btnTraitTierList')) {
        const btn = document.createElement('button');
        btn.id = 'btnTraitTierList';
        btn.className = 'nav-btn';
        btn.style.cssText = 'border: 1px solid var(--accent-start); color: var(--accent-start); margin-left: 10px;';
        btn.innerHTML = 'Trait Tier List';
        btn.onclick = () => window.openTraitTierList && window.openTraitTierList();
        dbToolbar.appendChild(btn);
    }
}