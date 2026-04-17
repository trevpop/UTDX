// Bridge function so HTML can safely wipe the memory for dynamic toggles
window.wipeUnitCache = function(unitId) {
    if (typeof unitBuildsCache !== 'undefined') {
        unitBuildsCache[unitId] = null;
    }
};

const unitControls = {
    kirito: (unit) => {
        const { realm, card } = kiritoState;
        const labelClass = card ? 'color-custom font-bold' : 'color-gray';
        const switchClass = card ? 'bg-custom' : '';
        return `<div class="unit-toolbar custom-toolbar kirito-toolbar">
            <div class="toggle-wrapper"><span>Virtual Realm</span><label><input type="checkbox" ${realm ? 'checked' : ''} onchange="wipeUnitCache('kirito'); toggleKiritoMode('realm', this)"><div class="mini-switch"></div></label></div>
            ${realm ? `<div class="toggle-wrapper animate-fade"><span class="${labelClass}">Magician Card</span><label><input type="checkbox" ${card ? 'checked' : ''} onchange="wipeUnitCache('kirito'); toggleKiritoMode('card', this)"><div class="mini-switch ${switchClass}"></div></label></div>` : ''}
        </div>`;
    },
    bambietta: (unit) => {
        const currentEl = bambiettaState.element;
        const options = Object.keys(BAMBIETTA_MODES).map(k => 
            `<option value="${k}" ${currentEl === k ? 'selected' : ''}>${k} (${BAMBIETTA_MODES[k].desc})</option>`
        ).join('');
        return `<div class="unit-toolbar custom-toolbar"><div class="bambi-wrapper"><span class="bambi-label">Element:</span><select onchange="wipeUnitCache('bambietta'); setBambiettaElement(this.value, this)" class="bambi-select">${options}</select></div></div>`;
    },
    robot1718: (unit) => {
        const currentMode = robot1718State.mode;
        if (!unit.modes) return '';
        const options = Object.keys(unit.modes).map(k => 
            `<option value="${k}" ${currentMode === k ? 'selected' : ''}>${k} (${unit.modes[k].desc})</option>`
        ).join('');
        return `<div class="unit-toolbar custom-toolbar"><div class="bambi-wrapper" style="display: flex; align-items: center; width: 100%;"><span class="bambi-label" style="margin-right: 6px;">Form:</span><select onchange="wipeUnitCache('robot1718'); setRobot1718Mode(this.value, this)" class="bambi-select" style="flex: 1;">${options}</select></div></div>`;
    },
    ancient_mage: (unit) => {
        const currentMode = ancientMageState.mode;
        
        const options = Object.keys(unit.modes).map(k => 
            `<option value="${k}" ${currentMode === k ? 'selected' : ''}>${unit.modes[k].desc}</option>`
        ).join('');

        return `
        <div class="unit-toolbar custom-toolbar">
            <div class="bambi-wrapper" style="display: flex; align-items: center; width: 100%;">
                <span class="bambi-label" style="margin-right: 6px;">Mode:</span>
                <select onchange="setAncientMageMode(this.value)" class="bambi-select" style="flex: 1;">${options}</select>
            </div>
        </div>`;
    }
};

window.setAncientMageMode = function(val) {
    ancientMageState.mode = val;
    const unit = unitDatabase.find(u => u.id === 'ancient_mage');
    if (!unit) return;
    
    // Only manage the caps and the DoT baseline here
    unit.stats.spaCap = (val === 'dps') ? 3.5 : 2.5;
    unit.stats.passiveDot = (val === 'specialist') ? 60 : 20;

    // Show/Hide Boss Toggle
    const bossWrap = document.getElementById('am-boss-toggle-wrap');
    if (bossWrap) {
        bossWrap.style.display = (val === 'dps') ? 'flex' : 'none';
        if (val !== 'dps' && document.getElementById('am-boss-cb')) {
            document.getElementById('am-boss-cb').checked = false;
            ancientMageState.attackBoss = false;
        }
    }

    wipeUnitCache('ancient_mage');
    updateBuildListDisplay('ancient_mage');
};

window.toggleAncientMageBoss = function(cb) {
    ancientMageState.attackBoss = cb.checked;
    wipeUnitCache('ancient_mage');
    updateBuildListDisplay('ancient_mage');
};

function getUnitControlsHtml(unit) {
    return unitControls[unit.id] ? unitControls[unit.id](unit) : '';
}

function createBaseUnitCard(unit, options = {}) {
    const { id = '', additionalClasses = '', bannerContent = '', tagsContent = '', topControls = '', bottomControls = '', mainContent = '' } = options;
    const card = document.createElement('div');
    card.className = `unit-card ${additionalClasses}`;
    if (id) card.id = id;

    const banner = `<div class="unit-banner">${bannerContent}</div>`;
    const tags = tagsContent ? `<div class="unit-tags custom-tags">${tagsContent}</div>` : 
                 (unit.tags && unit.tags.length > 0 ? `<div class="unit-tags">${unit.tags.map(t => `<span class="unit-tag">${t}</span>`).join('')}</div>` : '');

    card.innerHTML = `${banner}${tags}${topControls}${getUnitControlsHtml(unit)}${bottomControls}${mainContent}`;
    return card;
}

function calculateBuildEfficiency(build, unitCost, unitMaxPlacement, unitId) {
    const foundTrait = getTraitByName(build.traitName, unitId);

    let traitLimit = null;
    if (build.traitName && build.traitName.includes('Ruler')) {
        traitLimit = 1;
    } else if (foundTrait && foundTrait.limitPlace) {
        traitLimit = foundTrait.limitPlace;
    }

    const actualPlacement = traitLimit ? Math.min(unitMaxPlacement, traitLimit) : unitMaxPlacement;
    const costMult = (foundTrait && foundTrait.costReduction) ? Math.max(0, 1 - (foundTrait.costReduction / 100)) : 1;
    const actualTotalCost = unitCost * actualPlacement * costMult;
    return actualTotalCost === 0 ? 0 : (build.dps / actualTotalCost);
}

function getHeadBadgeHtml(headUsed) {
    if (!headUsed || headUsed === 'none') return '';
    const config = {
        'sun_god': { name: 'Sun God', border: 'border-sungod', text: 'text-sungod' },
        'ninja': { name: 'Ninja', border: 'border-ninja', text: 'text-ninja' },
        'reaper_necklace': { name: 'Reaper', border: 'border-reaper', text: 'text-reaper' },
        'shadow_reaper_necklace': { name: 'S. Reaper', border: 'border-sreaper', text: 'text-sreaper' },
        'junior': { name: 'Junior Ninja', border: 'border-ninja', text: 'text-ninja' },
        'biju_energy': { name: 'Biju Energy', border: 'border-biju', text: 'text-biju'},
        'bloodline_eye': { name: 'Bloodline', border: 'border-bloodeye', text: 'text-bloodeye'},
        'spirit_armor': {name: "Spirit Armor", border: 'border-spirit', text: 'text-spirit'}
    };
    
    const h = config[headUsed] || { name: 'Unknown', border: 'border-unknown', text: 'text-unknown' };
    
    // If it has an overrideStyle, inject it directly so we don't rely on missing CSS classes
    if (h.overrideStyle) {
        return `<div class="stat-line"><span class="sl-label">HEAD</span><div class="badge-base" style="${h.overrideStyle}"><span style="color: inherit; text-shadow: 0 0 8px rgba(249, 115, 22, 0.4);">${h.name}</span></div></div>`;
    }
    
    return `<div class="stat-line"><span class="sl-label">HEAD</span><div class="badge-base ${h.border}"><span class="${h.text}">${h.name}</span></div></div>`;
}

function generateBuildRowHTML(r, i, unitConfig = {}) {
    const { totalCost = 50000, placement = 1, sortMode = 'dps', unitId = '', benchmarkDps = 0 } = unitConfig;
    
    let rankClass = (i < 3 ? `rank-${i+1}` : 'rank-other') + (r.isCustom ? ' is-custom' : '');
    const effScore = calculateBuildEfficiency(r, totalCost, placement, unitId).toFixed(3);

    let optimalityHtml = '';
    if (inventoryMode && benchmarkDps > 0) {
        const optPct = (r.dps / benchmarkDps) * 100;
        let color, glow;
        if (optPct >= 95) { color = '#00ffaa'; glow = 'rgba(0, 255, 170, 0.15)'; }
        else if (optPct >= 80) { color = '#ffcc00'; glow = 'rgba(255, 204, 0, 0.15)'; }
        else { color = '#ff4d4d'; glow = 'rgba(255, 77, 77, 0.15)'; }
        
        optimalityHtml = `<div class="optimality-badge" style="color: ${color}; border-color: ${color}66; --glow-color: ${glow};"><span class="opt-label" style="color: ${color}">OPTIMALITY</span><span class="opt-pct">${optPct.toFixed(1)}%</span></div>`;
    }

    const prioConfig = { 'spa': { label: 'SPA STAT', cls: 'prio-spa' }, 'range': { label: 'RANGE STAT', cls: 'prio-range' }, 'default': { label: 'DMG STAT', cls: 'prio-dmg' } };

    let prioHtml = '';
    if (r.relicIds) {
        const hId = r.relicIds.head || 'none';
        const bId = r.relicIds.body || 'none-b';
        const lId = r.relicIds.legs || 'none-l';
        const currentPrio = r.prio || 'default';
        const secCfg = prioConfig[currentPrio] || prioConfig['default'];
        const invBadge = `<button class="prio-badge prio-inv clickable" onclick="viewInventoryItems('${hId}', '${bId}', '${lId}')" title="Locate in Inventory"><img src="https://img.icons8.com/fluency-systems-filled/48/ffffff/backpack.png" alt="Inv"></button>`;
        const statBadge = `<span class="prio-badge ${secCfg.cls}">${secCfg.label}</span>`;
        prioHtml = `<div class="br-badges">${invBadge}${statBadge}</div>`;
    } else {
        const pCfg = prioConfig[r.prio] || prioConfig['default'];
        prioHtml = `<span class="prio-badge ${pCfg.cls}">${pCfg.label}</span>`;
    }

    const mainBodyBadge = getBadgeHtml(r.mainStats.body, MAIN_STAT_VALS.body[r.mainStats.body]);
    const mainLegsBadge = getBadgeHtml(r.mainStats.legs, MAIN_STAT_VALS.legs[r.mainStats.legs]);
    const headHtml = getHeadBadgeHtml(r.headUsed);
    const s = r.subStats || {};
    const headRow = (r.headUsed && r.headUsed !== 'none') ? `<div class="stat-line"><span class="sl-label">SUB</span> ${getRichBadgeHtml(s.head || [])}</div>` : '';
    const bodyRow = `<div class="stat-line"><span class="sl-label">BODY</span> ${getRichBadgeHtml(s.body || [])}</div>`;
    const legsRow = `<div class="stat-line"><span class="sl-label">LEGS</span> ${getRichBadgeHtml(s.legs || [])}</div>`;
    
    let displayVal = format(r.dps), displayLabel = "DPS";
    if (sortMode === 'range') { displayVal = (r.range || 0).toFixed(1); displayLabel = "RNG"; }
    else if (sortMode === 'damage') { displayVal = format(r.dmgVal); displayLabel = "DMG"; }

    return `
        <div class="build-row ${rankClass} ${sortMode === 'efficiency' ? 'is-efficiency-sort' : ''}">
            <div class="br-header">
                <div class="br-header-info"><span class="br-rank">#${i+1}</span><span class="br-set">${r.setName}</span><span class="br-sep">/</span><span class="br-trait">${r.traitName}</span></div>
                <div style="display:flex; gap:8px; align-items:center;">${optimalityHtml}${prioHtml}</div>
            </div>
            <div class="br-grid">
                <div class="br-col main"><div class="br-col-title">MAIN STAT</div>${headHtml}<div class="stat-line"><span class="sl-label">BODY</span> ${mainBodyBadge}</div><div class="stat-line"><span class="sl-label">LEGS</span> ${mainLegsBadge}</div></div>
                <div class="br-col sub">
                    <div class="br-col-header"><div class="br-col-title">SUB STAT</div><button class="sub-list-btn" title="View Sub-Stat Priority" onclick="viewSubPriority('${r.id}')">≡</button></div>
                    ${headRow}${bodyRow}${legsRow}
                </div>
                <div class="br-res-col">
                    <button class="info-btn" onclick="showMath('${r.id}')">?</button>
                    <div class="eff-score-line" onclick="event.stopPropagation(); openInfoPopup('efficiency')">${effScore} <span class="eff-label">Eff</span></div>
                    <div class="dps-container"><span class="build-dps">${displayVal}</span><span class="dps-label">${displayLabel}</span></div>
                </div>
            </div>
        </div>`;
}

function updateBuildListDisplay(unitId) {
    const card = document.getElementById('card-' + unitId);
    if (!card) return;
    const unitObj = unitDatabase.find(u => u.id === unitId);
    const unitCost = unitObj ? (unitObj.totalCost || 50000) : 50000;
    const unitPlace = unitObj ? (unitObj.placement || 1) : 1;

    const activeMode = 'fixed';
    const showHead = document.body.classList.contains('show-head');
    const showSubs = document.body.classList.contains('show-subs');
    const activeCfg = (showHead ? 2 : 0) + (showSubs ? 1 : 0);
    const activeType = activeAbilityIds.has(unitId) && unitObj && unitObj.ability ? 'abil' : 'base';

    let benchmarkDps = 0;
    try {
        if (inventoryMode && window.STATIC_BUILD_DB) {
            let dbKey = (unitId === 'kirito' && kiritoState.card) ? 'kirito_card' : unitId;
            if (activeType === 'abil') dbKey += '_abil';
            const dbEntry = window.STATIC_BUILD_DB[dbKey] || {};
            const modeData = dbEntry[activeMode] || dbEntry[activeMode === 'fixed' ? 'f' : 'b'];
            const perfectBuilds = modeData ? modeData[activeCfg] : null;
            if (perfectBuilds && perfectBuilds.length > 0) benchmarkDps = perfectBuilds[0].dps || 0;
        }
    } catch (e) { console.warn("Benchmark error", e); }

    const searchInput = card.querySelector('.search-container input')?.value?.toLowerCase() || '';
    const prioSelect = card.querySelector('select[data-filter="prio"]')?.value || 'all';
    const setSelect = card.querySelector('select[data-filter="set"]')?.value || 'all';
    const headSelect = card.querySelector('select[data-filter="head"]')?.value || 'all';
    const sortSelect = card.querySelector('select[data-filter="sort"]')?.value || 'dps'; 

    const hydrateBuildEntry = (r) => {
        if (!r) return null;
        
        // FIX: Reconstruct the missing damage value BEFORE the early return
        if (r.dmgVal === undefined) {
            r.dmgVal = (r.dps || r.d || 0) * (r.spa || r.sp || 1);
        }

        // Now we can safely return early if it's a static database entry
        if (r.id && r.mainStats && r.setName) return r; 
        
        // Map raw/short keys for dynamic math entries
        const res = {
            id: r.id || `db-${unitId}-${Math.random().toString(36).substr(2, 9)}`,
            traitName: (typeof r.t === 'number' ? (traitsList[r.t]?.name) : (r.traitName || r.t)) || 'Unknown Trait',
            setName: (typeof r.s === 'number' ? (SETS[r.s]?.name) : (r.setName || r.s)) || 'Unknown Set',
            dps: r.d || r.dps || 0,
            dmgVal: r.dmgVal || r.dv || ((r.d || r.dps || 0) * (r.sp || r.spa || 1)),
            spa: r.sp || r.spa || 0,
            range: r.ra || r.range || 0,
            prio: r.p || r.prio || 'dmg',
            headUsed: (typeof r.h === 'number' ? (['none','sun_god','ninja','reaper_necklace','shadow_reaper_necklace','junior','biju_energy','bloodline_eye', 'spirit_armor'][r.h]) : (r.headUsed || r.h)) || 'none',
            isCustom: !!(r.c || r.isCustom),
            subStats: r.ss || r.subStats || {},
            mainStats: r.ms || r.mainStats || {
                body: (typeof r.b === 'string' ? r.b : (r.b === 1 ? 'dot' : (r.b === 2 ? 'cm' : 'dmg'))),
                legs: (typeof r.l === 'string' ? r.l : (r.l === 1 ? 'spa' : (r.l === 2 ? 'cf' : (r.l === 3 ? 'range' : 'dmg'))))
            }
        };
        return res;
    };

    const renderListInternal = (builds) => {
        if(!builds || builds.length === 0) return '<div class="msg-empty">No valid builds found.</div>';

        let filtered = builds.map(hydrateBuildEntry).filter(r => {
            if (!r) return false;
            const prioMatch = (prioSelect === 'all' || r.prio === prioSelect);
            if (!prioMatch) return false;
            if (setSelect !== 'all' && r.setName !== setSelect) return false;
            if (headSelect !== 'all' && (r.headUsed || 'none') !== headSelect) return false;

            let hSearch = ({'sun_god':'Sun God','ninja':'Ninja','reaper_necklace':'Reaper','shadow_reaper_necklace':'Shadow Reaper','junior':'Junior','biju_energy':'Biju Energy', 'bloodline_eye':'Bloodline Eye', 'spirit_armor':'Spirit Armor'})[r.headUsed] || '';
            const searchText = `${r.traitName} ${r.setName} ${r.prio} ${hSearch}`.toLowerCase();
            return searchText.includes(searchInput);
        });

        if (prioSelect === 'all') {
            const uniqueMap = new Map();
            filtered.forEach(r => {
                const key = `${r.setName}|${r.traitName}|${r.mainStats.body}|${r.mainStats.legs}`;
                
                if (!uniqueMap.has(key)) {
                    uniqueMap.set(key, r);
                } else {
                    const existing = uniqueMap.get(key);
                    const weight = (unitId === 'sjw' && r.headUsed === 'sun_god') ? 1.05 : 1.0;
                    const existWeight = (unitId === 'sjw' && existing.headUsed === 'sun_god') ? 1.05 : 1.0;
                    
                    let isBetter = false;
                    // NEW: Keep the duplicate based on what you are actually sorting by!
                    if (sortSelect === 'range') {
                        isBetter = (r.range || 0) > (existing.range || 0);
                    } else if (sortSelect === 'damage') {
                        isBetter = (r.dmgVal || 0) > (existing.dmgVal || 0);
                    } else {
                        isBetter = (r.dps * weight) > (existing.dps * existWeight);
                    }
                    
                    if (isBetter) uniqueMap.set(key, r);
                }
            });
            filtered = Array.from(uniqueMap.values());
        }

        if (filtered.length === 0) return '<div class="msg-empty">No matches found.</div>';

        filtered.sort((a, b) => {
            const getW = (x) => (unitId === 'sjw' && x.headUsed === 'sun_god') ? 1.05 : 1.0;
            if (sortSelect === 'range') return (b.range || 0) - (a.range || 0);
            if (sortSelect === 'damage') return (b.dmgVal || 0) - (a.dmgVal || 0);
            return (b.dps * getW(b)) - (a.dps * getW(a));
        });

        const slice = filtered.slice(0, 50);
        return slice.map((r, i) => generateBuildRowHTML(r, i, { totalCost: unitCost, placement: unitPlace, sortMode: sortSelect, unitId, benchmarkDps: benchmarkDps })).join('');
    };

    ['base', 'abil'].forEach(type => {
        const mode = 'fixed';
        for(let cfg=0; cfg<4; cfg++) {
            const container = document.getElementById(`results-${type}-${mode}-${cfg}-${unitId}`);
            if (!container) continue;
            if (type === activeType && cfg === activeCfg) {
                const buildData = unitBuildsCache[unitId]?.[type]?.[mode]?.[cfg];
                if (buildData) {
                    try { container.innerHTML = renderListInternal(buildData); } 
                    catch(e) { console.error("Render crash", e); container.innerHTML = '<div class="msg-error">Render error</div>'; }
                } else {
                    setTimeout(() => {
                        const unit = unitDatabase.find(u => u.id === unitId);
                        if (unit) {
                            processUnitCache(unit, cfg);
                            const finalData = unitBuildsCache[unitId][type][mode][cfg];
                            try { container.innerHTML = renderListInternal(finalData); } catch(e) {}
                        }
                    }, 10);
                }
            } else {
                container.innerHTML = '';
            }
        }
    });
}

function processUnitCache(unit, specificCfg = null) {
    if (!unitBuildsCache[unit.id]) {
        unitBuildsCache[unit.id] = { 
            base: { fixed: [null, null, null, null] }, 
            abil: { fixed: [null, null, null, null] } 
        };
    }
    
    const CONFIGS = [{ head: false, subs: false }, { head: false, subs: true }, { head: true,  subs: false }, { head: true,  subs: true }];

    const performCalcSet = (mode, useAbility, targetCache) => {
        let dbKey = (unit.id === 'kirito' && kiritoState.card) ? 'kirito_card' : unit.id;
        if (useAbility && unit.ability) dbKey += '_abil';
        
        const useInventory = (inventoryMode === true);

        for (let i = 0; i < 4; i++) {
            if (specificCfg !== null && i !== specificCfg) continue;
            if (targetCache[i] !== null) continue;

            const cfg = CONFIGS[i];
            let calculatedResults = [];
            let loadedFromStatic = false;
            
            if (!useInventory) {
                const canUseStatic = false;
                if (canUseStatic && window.STATIC_BUILD_DB && window.STATIC_BUILD_DB[dbKey]) {
                    const dbTable = window.STATIC_BUILD_DB[dbKey];
                    const dbList = dbTable[mode] || dbTable[mode === 'fixed' ? 'f' : 'b'];
                    if(dbList && dbList[i]) {
                        calculatedResults = dbList[i].map(r => ({...r}));
                        loadedFromStatic = false;
                    }
                }
            }

            // Hybrid Calculations
            if (loadedFromStatic && !useInventory) {
                if (typeof globalBuilds !== 'undefined') {
                    // 1. Calculate missing Reanimated Armor
                    const missingBuilds = globalBuilds.filter(b => b.set === 'reanimated_armor');
                    if (missingBuilds.length > 0) {
                        const extraResults = calculateUnitBuilds(
                            unit, null, missingBuilds, getValidSubCandidates(), 
                            cfg.head ? ['sun_god', 'ninja', 'reaper_necklace', 'shadow_reaper_necklace', 'junior', 'biju_energy', 'bloodline_eye', 'spirit_armor'] : ['none'], 
                            cfg.subs, null, useAbility, mode
                        );
                        calculatedResults = [...calculatedResults, ...extraResults];
                    }

                    // 1.5 Calculate the missing NEW HATS for ALL OLD SETS
                    if (cfg.head) {
                        const oldBuilds = globalBuilds.filter(b => b.set !== 'reanimated_armor');
                        const newHatResults = calculateUnitBuilds(
                            unit, null, oldBuilds, getValidSubCandidates(), 
                            ['biju_energy', 'bloodline_eye'], // <-- Bloodline Eye added here so it generates with old sets!
                            cfg.subs, null, useAbility, mode
                        );
                        calculatedResults = [...calculatedResults, ...newHatResults];
                    }

                    // 2. Calculate missing Custom Traits
                    const newCustomTraits = [...(typeof customTraits !== 'undefined' ? customTraits : []), ...(unitSpecificTraits[unit.id] || [])];
                    if (newCustomTraits.length > 0) {
                        const oldBuilds = globalBuilds.filter(b => b.set !== 'reanimated_armor');
                        const customTraitResults = calculateUnitBuilds(
                            unit, null, oldBuilds, getValidSubCandidates(), 
                            cfg.head ? ['sun_god', 'ninja', 'reaper_necklace', 'shadow_reaper_necklace', 'junior', 'biju_energy', 'bloodline_eye', 'spirit_armor'] : ['none'], 
                            cfg.subs, newCustomTraits, useAbility, mode
                        );
                        calculatedResults = [...calculatedResults, ...customTraitResults];
                    }
                }
            } else {
                // Standard fallback if static DB is missing or Inventory Mode is ON
                const traitsForCalc = (calculatedResults.length > 0) ? [...(typeof customTraits !== 'undefined' ? customTraits : []), ...(unitSpecificTraits[unit.id] || [])] : null;
                if (traitsForCalc === null || traitsForCalc.length > 0 || useInventory) {
                    const dynamicResults = calculateUnitBuilds(unit, null, getFilteredBuilds(), getValidSubCandidates(), cfg.head ? ['sun_god', 'ninja', 'reaper_necklace', 'shadow_reaper_necklace', 'junior', 'biju_energy', 'bloodline_eye', 'spirit_armor'] : ['none'], cfg.subs, traitsForCalc, useAbility, mode);
                    calculatedResults = [...calculatedResults, ...dynamicResults];
                }
            }

            // === THE FORWARD DAMAGE CALCULATOR ===
            // This forces the static DB to sync its DPS numbers with your freshly patched live math!
            calculatedResults.forEach(copy => {
                if (typeof reconstructMathData === 'function') {
                    const freshMath = reconstructMathData(copy);
                    if (freshMath) {
                        copy.dps = freshMath.total;     // <--- The missing link! Updates visual DPS!
                        copy.dmgVal = freshMath.dmgVal; 
                        copy.dv = freshMath.dmgVal; 
                        copy.spa = freshMath.spa;       // Updates visual SPA
                        copy.range = freshMath.range;   // Updates visual Range
                    }
                }
            });

            // Re-sort everything using the newly corrected DPS
            calculatedResults.sort((a, b) => b.dps - a.dps);
            
            calculatedResults.forEach(r => { if (r.id) cachedResults[r.id] = r; });
            targetCache[i] = calculatedResults;
        }
    };

    performCalcSet('fixed', false, unitBuildsCache[unit.id].base.fixed);
    if (unit.ability) {
        performCalcSet('fixed', true, unitBuildsCache[unit.id].abil.fixed);
    }
}

// NEW: Sorts by actual, perfectly calculated DPS (No bypasses, no hardcoding)
const getQuickScore = (unit) => {
    // Determine the current state of the unit
    const type = typeof activeAbilityIds !== 'undefined' && activeAbilityIds.has(unit.id) && unit.ability ? 'abil' : 'base';
    const mode = 'fixed';
    const cfgIndex = 3; // 3 represents "+Head and +Subs", which gives the absolute Max Potential for sorting

    // 1. Force the hybrid math engine to run for this unit right now.
    // This instantly loads the Static DB for old units, injects Reanimated Armor, 
    // and completely calculates new units (like Hades) live in memory!
    if (!unitBuildsCache[unit.id] || !unitBuildsCache[unit.id][type] || !unitBuildsCache[unit.id][type][mode][cfgIndex]) {
        processUnitCache(unit, cfgIndex);
    }

    // 2. Grab the perfectly calculated, fully sorted array of builds
    const builds = unitBuildsCache[unit.id][type][mode][cfgIndex];

    // 3. Return the exact DPS of the #1 build
    if (builds && builds.length > 0) {
        // Law sorts by Range, everyone else sorts by DPS
        return unit.id === 'law' ? (builds[0].range || 0) : builds[0].dps;
    }

    return 0; // Fallback if a unit has completely broken data
};

window.toggleBuilds = function(unitId) {
    const wrapper = document.getElementById(`builds-wrapper-${unitId}`);
    const btn = document.getElementById(`btn-expand-${unitId}`);
    const card = document.getElementById(`card-${unitId}`); 
    const preview = document.getElementById(`preview-${unitId}`); 
    
    if (wrapper.style.display === "none") {
        wrapper.style.display = "flex"; 
        if (preview) preview.style.display = "none"; 
        btn.innerText = "▲ Hide More Builds"; // <--- UPDATED
        card.classList.add("expanded-card"); 
        updateBuildListDisplay(unitId); 
    } else {
        wrapper.style.display = "none";
        if (preview) preview.style.display = "block"; 
        btn.innerText = "▼ Show More Builds"; // <--- UPDATED
        card.classList.remove("expanded-card"); 
    }
};

window.loadPreviewBuild = function(unitId) {
    const preview = document.getElementById(`preview-${unitId}`);
    if (!preview) return;

    // 1. Figure out which hidden list container is currently active
    const unit = unitDatabase.find(u => u.id === unitId);
    const showHead = document.body.classList.contains('show-head');
    const showSubs = document.body.classList.contains('show-subs');
    const activeCfg = (showHead ? 2 : 0) + (showSubs ? 1 : 0);
    const type = activeAbilityIds.has(unitId) && unit && unit.ability ? 'abil' : 'base';
    
    const activeListContainer = document.getElementById(`results-${type}-fixed-${activeCfg}-${unitId}`);

    // 2. Just copy the top row from the filtered list!
    if (activeListContainer) {
        const firstRow = activeListContainer.querySelector('.build-row');
        
        if (firstRow) {
            preview.innerHTML = firstRow.outerHTML; // Copies the #1 filtered build
        } else if (activeListContainer.querySelector('.msg-loading')) {
            preview.innerHTML = `<div class="msg-loading" style="padding: 10px;">Loading...</div>`;
        } else {
            preview.innerHTML = '<div class="msg-empty" style="padding: 10px;">No builds match your filters.</div>';
        }
    }
};

window.cardRenderQueue = [];
window.isCardRendering = false;

window.processCardRenderQueue = function() {
    if (window.cardRenderQueue.length === 0) {
        window.isCardRendering = false;
        return;
    }
    window.isCardRendering = true;
    
    // Grab the next card calculation in line
    const task = window.cardRenderQueue.shift();
    task();
    
    // Give Chrome 35ms to breathe and paint the screen before moving on
    setTimeout(window.processCardRenderQueue, 35);
};

function renderDatabase() {
    const container = document.getElementById('dbPage');
    if (renderQueueIndex === 0) {
        container.innerHTML = '';
        if (!window.STATIC_BUILD_DB) cachedResults = {}; 
        unitBuildsCache = {};
    }
    if (renderQueueId) { cancelAnimationFrame(renderQueueId); renderQueueId = null; }

    const sortedUnits = unitDatabase.map(unit => {
        // OPTIMIZATION: Do NOT process cache here. Use quick lookup for sort.
        return { unit, maxScore: getQuickScore(unit) };
    }).sort((a, b) => b.maxScore - a.maxScore);

    function processNextChunk() {
        const startTime = performance.now();
        const fragment = document.createDocumentFragment();
        let itemsAdded = 0;
        let staggerIndex = 0; 

        while (renderQueueIndex < sortedUnits.length) {
            const unit = sortedUnits[renderQueueIndex].unit;
            
            renderQueueIndex++;

let abilityLabel = (unit.ability && unit.ability.abilityName) ? unit.ability.abilityName : 'Ability';
let toggleScript = '';

if (unit.id === 'phantom_captain') abilityLabel = 'Planes';
else if (unit.id === 'megumin') abilityLabel = 'Passive';
else if (unit.id === 'vegeta') abilityLabel = 'Boss Stacks';
else if (unit.id === 'super_roku') abilityLabel = 'Same Enemy';
else if (unit.id === 'cell') {
    const isToggled = activeAbilityIds.has(unit.id);
    abilityLabel = isToggled ? 'Perfect Form' : 'True Form';
    toggleScript = `; 
        this.parentElement.previousElementSibling.innerText = this.checked ? 'Perfect Form' : 'True Form';
        this.closest('.unit-toolbar').firstElementChild.style.gap = '2px';
    `;
}
            
let abilityToggleHtml = (unit.ability && !unit.ability.noToggle) ? `<div class="toggle-wrapper"><span class="ut-ability-text" title="${abilityLabel}">${abilityLabel}</span><label><input type="checkbox" class="ability-cb" ${activeAbilityIds.has(unit.id) ? 'checked' : ''} onchange="toggleAbility('${unit.id}', this)${toggleScript}"><div class="mini-switch"></div></label></div>` : '<div></div>';

// --- NEW: INJECT ANCIENT MAGE BOSS TOGGLE INTO THE TOP BAR ---
if (unit.id === 'ancient_mage') {
    const isDpsMode = typeof ancientMageState !== 'undefined' && ancientMageState.mode === 'dps';
    const displayStyle = isDpsMode ? 'display: flex;' : 'display: none;';
    abilityToggleHtml = `
    <div class="toggle-wrapper" id="am-boss-toggle-wrap" style="${displayStyle}">
        <span class="ut-ability-text" title="Attack Boss">Attack Boss</span>
        <label>
            <input type="checkbox" class="ability-cb" id="am-boss-cb" ${typeof ancientMageState !== 'undefined' && ancientMageState.attackBoss ? 'checked' : ''} onchange="toggleAncientMageBoss(this)">
            <div class="mini-switch"></div>
        </label>
    </div>`;
}

const topControls = `<div class="unit-toolbar"><div class="ut-actions"><button class="calc-btn ut-btn-compact" onclick="openCalc('${unit.id}')">🖩 Custom</button><button class="calc-btn ut-btn-compact" onclick="openTraitBestList('${unit.id}')" title="Best Build per Trait">📊 Traits</button><button class="calc-btn ut-btn-compact" onclick="openUnitInfo('${unit.id}')">ⓘ Info</button></div>${abilityToggleHtml}</div>`;
            let defaultSort = 'dps';
            if (['sjw', 'esdeath'].includes(unit.id)) defaultSort = 'damage';
            else if (unit.id === 'law') defaultSort = 'range';

            const bottomControls = `
                <div class="search-container">
                    <div class="search-row"><input type="text" placeholder="Search..." class="search-input" onkeyup="filterList(this)">
                        <select onchange="filterList(this)" data-filter="sort" class="search-select sort-select">
                            <option value="dps" ${defaultSort === 'dps' ? 'selected' : ''}>Sort: DPS</option>
                            <option value="damage" ${defaultSort === 'damage' ? 'selected' : ''}>Sort: Damage</option>
                            <option value="range" ${defaultSort === 'range' ? 'selected' : ''}>Sort: Range</option>
                            <option value="efficiency" ${defaultSort === 'efficiency' ? 'selected' : ''}>Sort: Efficiency</option>
                        </select>
                        <select onchange="filterList(this)" data-filter="prio" class="search-select prio-select"><option value="all">All Prio</option><option value="dmg">Dmg</option><option value="spa">SPA</option><option value="range">Range</option></select>
                    </div>
                    <div class="search-row">
                        <select onchange="filterList(this)" data-filter="set" class="search-select"><option value="all">All Sets</option><option value="Master Ninja">Ninja Set</option><option value="Junior Ninja">Junior Ninja</option><option value="Sun God">Sun God Set</option><option value="Laughing Captain">Laughing Set</option><option value="Ex Captain">Ex Set</option><option value="Shadow Reaper">Shadow Reaper</option><option value="Reaper Set">Reaper Set</option><option value="Super Roku">Super Roku</option><option value="Bio-Android">Bio-Android</option><option value="Reanimated Armor">Reanimated Armor</option></select>
                        <select onchange="filterList(this)" data-filter="head" class="search-select">
                            <option value="all">All Heads</option>
                            <option value="sun_god">Sun God</option>
                            <option value="biju_energy">Biju Energy</option>
                            <option value="bloodline_eye">Bloodline Eye</option>
                            <option value="spirit_armor">Spirit Armor</option>
                            <option value="ninja">Ninja</option>
                            <option value="junior">Junior Ninja</option>
                            <option value="reaper_necklace">Reaper</option>
                            <option value="shadow_reaper_necklace">Shadow Reaper</option>
                            <option value="none">No Head</option>
                        </select>
                    </div>
                </div>`;
            let main
            let mainContent = '';
            ['base', 'abil'].forEach(type => { 
                const mode = 'fixed'; 
                for(let cfg=0; cfg<4; cfg++) {
                    mainContent += `<div class="top-builds-list build-list-container mode-${type} mode-${mode} cfg-${cfg}" id="results-${type}-${mode}-${cfg}-${unit.id}"></div>`; 
                }
            });

            // FIX: Changed to overflow-y: auto and gave it padding so the scrollbar functions properly
            mainContent += `<div id="builds-wrapper-${unit.id}" style="display: none; flex-direction: column; flex: 1; overflow-y: auto; padding-bottom: 10px;">`;
            ['base', 'abil'].forEach(type => { const mode = 'fixed'; for(let cfg=0; cfg<4; cfg++) mainContent += `<div class="top-builds-list build-list-container mode-${type} mode-${mode} cfg-${cfg}" id="results-${type}-${mode}-${cfg}-${unit.id}"></div>`; });
            mainContent += `</div>`;

            const card = createBaseUnitCard(unit, {
                id: 'card-' + unit.id,
                additionalClasses: (activeAbilityIds.has(unit.id) ? ' use-ability' : '') + ' lazy-build-load',
                bannerContent: `<div class="placement-badge">Max Place: ${unit.placement}</div>${getUnitImgHtml(unit, 'unit-avatar')}<div class="unit-title"><h2>${unit.name}</h2><span>${unit.role} <span class="sss-tag">SSS</span></span></div>${unit.meta ? `<button class="trait-guide-btn" onclick="openTraitGuide('${unit.id}')">📋 Rec. Traits</button>` : ''}`,
                topControls, bottomControls, mainContent
            });

            card.style.setProperty('--stagger-delay', `${staggerIndex * 50}ms`); 
            staggerIndex++; fragment.appendChild(card); itemsAdded++;
            if (performance.now() - startTime > 12) break;
        }
        
        if (itemsAdded > 0) {
            container.appendChild(fragment);
            
            // PERFORMANCE: Use IntersectionObserver with a rendering queue
            if (!window.buildLoadObserver) {
                window.buildLoadObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const unitId = entry.target.id.replace('card-', '');
                            const unit = unitDatabase.find(u => u.id === unitId);
                            
                            if (unit) {
                                // Put this card in the back of the queue instead of freezing the browser
                                window.cardRenderQueue.push(() => {
                                    if (!unitBuildsCache[unitId]) processUnitCache(unit);
                                    updateBuildListDisplay(unitId);
                                });
                                
                                // Start the line moving if it's currently stopped
                                if (!window.isCardRendering) window.processCardRenderQueue();
                            }
                            
                            window.buildLoadObserver.unobserve(entry.target);
                            entry.target.classList.remove('lazy-build-load');
                        }
                    });
                }, { rootMargin: '200px' });
            }
            
            const newCards = container.querySelectorAll('.lazy-build-load');
            newCards.forEach(c => window.buildLoadObserver.observe(c));
        }

        if (renderQueueIndex < sortedUnits.length) renderQueueId = requestAnimationFrame(processNextChunk);
        else {
            renderQueueId = null;
            if(document.getElementById('globalHeadPiece').checked) document.body.classList.add('show-head');
            if(document.getElementById('globalSubStats').checked) document.body.classList.add('show-subs');
        }
    }
    processNextChunk();
}

function setGuideMode(mode) {
    currentGuideMode = mode;
    const isFixed = (mode === 'fixed');
    const warning = document.getElementById('guideWarning');
    if(warning) warning.classList[mode === 'current' ? 'remove' : 'add']('hidden');
}

function populateGuideDropdowns() {
    const unitSelect = document.getElementById('guideUnitSelect');
    const traitSelect = document.getElementById('guideTraitSelect');
    if (!unitSelect || !traitSelect) return;
    unitSelect.innerHTML = '<option value="all">All Units</option>';
    traitSelect.innerHTML = '<option value="auto">Auto (Best Trait)</option>';
    unitDatabase.forEach(unit => unitSelect.add(new Option(unit.name, unit.id)));
    traitsList.forEach(trait => { if (trait.id !== 'none') traitSelect.add(new Option(trait.name, trait.id)); });
}

function openGuideConfig() {
    tempGuideUnitSet = new Set(guideUnitSelection);
    tempGuideTrait = document.getElementById('guideTraitSelect').value;
    renderGuideConfigUI();
    toggleModal('guideConfigModal', true);
}

const closeGuideConfig = () => toggleModal('guideConfigModal', false);

const selectGuideUnit = (id) => { 
    if (id === 'all') {
        tempGuideUnitSet.clear();
        tempGuideUnitSet.add('all');
    } else {
        if (tempGuideUnitSet.has('all')) tempGuideUnitSet.delete('all');
        if (tempGuideUnitSet.has(id)) tempGuideUnitSet.delete(id); else tempGuideUnitSet.add(id);
        if (tempGuideUnitSet.size === 0) tempGuideUnitSet.add('all');
    }
    renderGuideConfigUI(); 
};

const selectGuideTrait = (id) => { tempGuideTrait = id; renderGuideConfigUI(); };

function renderGuideConfigUI() {
    const unitGrid = document.getElementById('guideConfigUnitGrid');
    const traitList = document.getElementById('guideConfigTraitList');
    const isAll = tempGuideUnitSet.has('all');

    let unitsHtml = `<div class="config-item ${isAll ? 'selected' : ''}" onclick="selectGuideUnit('all')"><div class="cp-avatar-placeholder">ALL</div><span>All Units</span></div>`;
    unitDatabase.forEach(u => {
        const isSelected = tempGuideUnitSet.has(u.id); 
        unitsHtml += `<div class="config-item ${isSelected ? 'selected' : ''}" onclick="selectGuideUnit('${u.id}')">${getUnitImgHtml(u, '', 'small')}<span>${u.name}</span></div>`;
    });
    unitGrid.innerHTML = unitsHtml;

    let availableTraits = [...traitsList, ...customTraits];
    if (!isAll && tempGuideUnitSet.size === 1) {
        const singleId = Array.from(tempGuideUnitSet)[0];
        if (unitSpecificTraits[singleId]) availableTraits = [...availableTraits, ...unitSpecificTraits[singleId]];
    }
    availableTraits = availableTraits.filter((t, index, self) => index === self.findIndex((x) => x.id === t.id) && t.id !== 'none');
    
    let traitsHtml = `<div class="config-chip ${tempGuideTrait === 'auto' ? 'selected' : ''}" onclick="selectGuideTrait('auto')">Auto (Best)</div>`;
    availableTraits.forEach(t => traitsHtml += `<div class="config-chip ${tempGuideTrait === t.id ? 'selected' : ''}" onclick="selectGuideTrait('${t.id}')">${t.name}</div>`);
    traitList.innerHTML = traitsHtml;
}

const applyGuideConfig = () => {
    guideUnitSelection = new Set(tempGuideUnitSet);
    const unitSelect = document.getElementById('guideUnitSelect');
    if (guideUnitSelection.has('all')) {
        unitSelect.innerHTML = '<option value="all">All Units</option>';
        unitSelect.value = 'all';
    } else {
        const count = guideUnitSelection.size;
        const text = count === 1 ? unitDatabase.find(u => u.id === Array.from(guideUnitSelection)[0]).name : `${count} Units Selected`;
        unitSelect.innerHTML = `<option value="multi">${text}</option>`;
        unitSelect.value = 'multi';
    }
    document.getElementById('guideTraitSelect').value = tempGuideTrait;
    renderGuides(); 
    closeGuideConfig();
};

function getGuideBuildsFromCache(unit, mode, configIndex) {
    if (!unitBuildsCache || !unitBuildsCache[unit.id]) return [];
    let source = unitBuildsCache[unit.id].base;
    if (unit.ability !== undefined && activeAbilityIds.has(unit.id) && unitBuildsCache[unit.id].abil && unitBuildsCache[unit.id].abil[mode]) source = unitBuildsCache[unit.id].abil;
    return source?.[mode]?.[configIndex] || [];
}

function processGuideTop3(rawBuilds, unit, traitFilterId) {
    if (!rawBuilds || rawBuilds.length === 0) return [];
    let filtered = [...rawBuilds];
    if (traitFilterId && traitFilterId !== 'auto') {
        const tObj = getTraitById(traitFilterId, unit.id);
        const targetName = tObj ? tObj.name : "";
        if (targetName) filtered = filtered.filter(b => b.traitName === targetName);
    }

    // SJW Sun God Weighting (Match Database Logic)
    const getWeight = (b) => (unit.id === 'sjw' && b.headUsed === 'sun_god') ? 1.05 : 1.0;

    if (unit.id === 'law') {
        filtered.sort((a, b) => (b.range || 0) - (a.range || 0));
    } else if (['sjw', 'esdeath'].includes(unit.id)) {
        filtered.sort((a, b) => {
            const scoreA = a.dps * (a.mainStats.body === 'dmg' && a.mainStats.legs === 'dmg' ? 1.2 : 1) * getWeight(a);
            const scoreB = b.dps * (b.mainStats.body === 'dmg' && b.mainStats.legs === 'dmg' ? 1.2 : 1) * getWeight(b);
            return scoreB - scoreA;
        });
    } else {
        filtered.sort((a, b) => (b.dps * getWeight(b)) - (a.dps * getWeight(a)));
    }
    return filtered.slice(0, 3);
}

function createGuideCard(unitObj, modeClass) {
    const bannerContent = `<div class="mp-container is-dps" id="guide-mp-${unitObj.id}"><span class="mp-label">Max Potential</span><span class="mp-val">...</span></div>
        ${getUnitImgHtml(unitObj, 'unit-avatar')}<div class="unit-title"><h2>${unitObj.name}</h2><span>${unitObj.role} <span class="sss-tag">SSS</span></span></div>`;

    const mainContent = `<div class="top-builds-list guide-list-wrapper" id="guide-list-${unitObj.id}"><div class="msg-empty">Loading builds...</div></div>`;

    return createBaseUnitCard(unitObj, {
        id: 'card-' + unitObj.id,
        additionalClasses: `calc-guide-card lazy-guide-load ${modeClass}`,
        bannerContent,
        tagsContent: `<span class="guide-trait-tag text-xs-plus" id="guide-trait-${unitObj.id}">Best: ...</span>`,
        mainContent
    });
}

function updateGuideBuilds(unitId) {
    const unit = unitDatabase.find(u => u.id === unitId);
    if (!unit) return;

    const activeMode = 'fixed';

    const showHead = document.body.classList.contains('show-head');
    const showSubs = document.body.classList.contains('show-subs');
    
    const activeCfg = (showHead ? 2 : 0) + (showSubs ? 1 : 0);
    const filterTraitId = document.getElementById('guideTraitSelect').value;

    if (!unitBuildsCache[unitId]) processUnitCache(unit);
    const builds = processGuideTop3(getGuideBuildsFromCache(unit, activeMode, activeCfg), unit, filterTraitId);

    const mpLabel = document.getElementById(`guide-mp-${unitId}`);
    const traitLabel = document.getElementById(`guide-trait-${unitId}`);
    const listContainer = document.getElementById(`guide-list-${unitId}`);

    if (!builds || builds.length === 0) {
        if (listContainer) listContainer.innerHTML = '<div class="msg-empty">No builds found.</div>';
        return;
    }

    const best = builds[0];
    const isRange = unit.id === 'law';
    if (mpLabel) {
        mpLabel.className = `mp-container ${isRange ? 'is-range' : 'is-dps'}`;
        mpLabel.querySelector('.mp-label').innerText = isRange ? 'Max Range' : 'Max Potential';
        mpLabel.querySelector('.mp-val').innerText = isRange ? (best.range || 0).toFixed(1) : format(best.dps);
    }
    if (traitLabel) traitLabel.innerText = `Best: ${best.traitName}`;
    if (listContainer) {
        listContainer.innerHTML = builds.map((b, i) => generateBuildRowHTML(b, i, { totalCost: unit.totalCost || 50000, placement: unit.placement || 1, sortMode: 'dps', unitId: unit.id })).join('');
    }
}

function renderGuides() {
    const guideGrid = document.getElementById('guideList');
    if (!guideGrid) return;
    guideGrid.innerHTML = '';
    
    const filterTraitId = document.getElementById('guideTraitSelect').value;

    let uName = 'All Units';
    if (!guideUnitSelection.has('all')) {
        if (guideUnitSelection.size === 1) {
            uName = unitDatabase.find(u => u.id === Array.from(guideUnitSelection)[0])?.name || 'Unknown';
        } else {
            uName = `${guideUnitSelection.size} Units`;
        }
    }

    let tName = 'Auto Trait';
    if(filterTraitId !== 'auto') { 
        const found = getTraitById(filterTraitId);
        if(found) tName = found.name; 
    }
    document.getElementById('dispGuideUnit').innerText = uName; 
    document.getElementById('dispGuideTrait').innerText = tName;

    // Determine Active State
    const activeMode = 'fixed';
    const showHead = document.body.classList.contains('show-head'); 
    const showSubs = document.body.classList.contains('show-subs');
    const activeCfg = (showHead ? 2 : 0) + (showSubs ? 1 : 0);

    const unitsToProcess = (guideUnitSelection.has('all')) ? [...unitDatabase] : unitDatabase.filter(u => guideUnitSelection.has(u.id));
    
    // Sort Build Guides by DPS (Quick Score) to match Unit Database
    unitsToProcess.sort((a, b) => getQuickScore(b) - getQuickScore(a));
    
    // Create card skeletons
    const fragment = document.createDocumentFragment();
    unitsToProcess.forEach(unit => {
        fragment.appendChild(createGuideCard(unit, `mode-${activeMode} cfg-${activeCfg}`));
    });
    guideGrid.appendChild(fragment);

    // PERFORMANCE: Reuse observer for guides
    if (!window.guideLoadObserver) {
        window.guideLoadObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const unitId = entry.target.id.replace('card-', '');
                    updateGuideBuilds(unitId);
                    window.guideLoadObserver.unobserve(entry.target);
                    entry.target.classList.remove('lazy-guide-load');
                }
            });
        }, { rootMargin: '200px' });
    }

    const newGuides = guideGrid.querySelectorAll('.lazy-guide-load');
    newGuides.forEach(g => window.guideLoadObserver.observe(g));
    
    if (guideGrid.children.length === 0) guideGrid.innerHTML = `<div class="msg-empty">No guides found. Database may still be calculating.</div>`;
}

function openTraitBestList(unitId) {
    const unit = typeof getUnitById === 'function' ? getUnitById(unitId) : unitDatabase.find(u => u.id === unitId);
    if (!unit) return;

    const mode = 'fixed';
    const type = activeAbilityIds.has(unitId) && unit.ability ? 'abil' : 'base';
    
    const showHead = document.body.classList.contains('show-head');
    const showSubs = document.body.classList.contains('show-subs');
    let cfgIndex = 0;
    if (!showHead && !showSubs) cfgIndex = 0;
    else if (!showHead && showSubs) cfgIndex = 1;
    else if (showHead && !showSubs) cfgIndex = 2;
    else if (showHead && showSubs) cfgIndex = 3;

    const allBuilds = unitBuildsCache[unitId]?.[type]?.[mode]?.[cfgIndex] || [];
    
    if (allBuilds.length === 0) {
        showUniversalModal({
            title: 'TRAIT LEADERBOARD',
            content: '<div class="msg-empty">No builds calculated. Please wait for calculation to finish.</div>',
            size: 'modal-sm'
        });
        return;
    }

    const bestByTrait = new Map();
    allBuilds.forEach(build => {
        if (!bestByTrait.has(build.traitName)) {
            bestByTrait.set(build.traitName, build);
        } else {
            const current = bestByTrait.get(build.traitName);
            const isRange = (unitId === 'law');
            const valBuild = isRange ? (build.range || 0) : build.dps;
            const valCurrent = isRange ? (current.range || 0) : current.dps;
            
            if (valBuild > valCurrent) {
                bestByTrait.set(build.traitName, build);
            }
        }
    });

    const sortedTraits = Array.from(bestByTrait.values()).sort((a, b) => {
        const isRange = (unitId === 'law');
        const valA = isRange ? (a.range || 0) : a.dps;
        const valB = isRange ? (b.range || 0) : b.dps;
        return valB - valA;
    });

    let tagsHtml = '';
    if (window.mikuBuffActive) {
        tagsHtml += `<span style="background: rgba(74, 222, 128, 0.2); color: #4ade80; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold; border: 1px solid rgba(74, 222, 128, 0.3);">Miku Buff ON</span>`;
    }
    if (activeAbilityIds.has(unitId) && unit.ability) {
        tagsHtml += `<span style="background: rgba(168, 85, 247, 0.2); color: #c084fc; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold; border: 1px solid rgba(168, 85, 247, 0.3);">Ability Active</span>`;
    }

    let html = `<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <div style="width: 48px; height: 48px; flex-shrink: 0; border-radius: 4px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #222;">
            ${typeof getUnitImgHtml === 'function' ? getUnitImgHtml(unit, '', 'small') : `<img src="${unit.img}" style="width: 100%; height: 100%; object-fit: contain;">`}
        </div>
        <div>
            <div class="text-lg font-bold text-white leading-tight" style="display: flex; align-items: center; gap: 8px;">
                ${unit.name}
            </div>
            <div class="text-xs text-dim" style="margin-top: 4px;">${unit.role}</div>
            ${tagsHtml ? `<div style="margin-top: 6px; display: flex; gap: 6px;">${tagsHtml}</div>` : ''}
        </div>
    </div>`;

    html += `<table class="compare-table"><thead><tr><th style="width: 10%">#</th><th style="width: 30%">Trait</th><th style="width: 40%">Best Setup</th><th style="width: 20%">Result</th></tr></thead><tbody>`;

    const mapStat = (s) => {
        if (s === 'cf') return 'Crit Rate';
        if (s === 'cm') return 'Crit Dmg';
        if (s === 'spa') return 'SPA';
        if (s === 'range') return 'Range';
        if (s === 'dot') return 'DoT';
        return 'Dmg';
    };

    sortedTraits.forEach((b, idx) => {
        const isRange = (unitId === 'law');
        const val = isRange ? (b.range || 0).toFixed(1) : format(b.dps);
        const label = isRange ? 'RNG' : 'DPS';
        const labelClass = isRange ? 'comp-val-rng' : 'comp-val-dps';
        let headText = (b.headUsed && b.headUsed !== 'none') ? ` + ${({'sun_god':'Sun God','ninja':'Ninja','reaper_necklace':'Reaper','shadow_reaper_necklace':'S.Reaper'})[b.headUsed] || 'Head'}` : '';
        const setupText = `${b.setName} <span class="text-dim text-xs">(${mapStat(b.mainStats.body)}/${mapStat(b.mainStats.legs)})</span>${headText}`;
        
        let rankStyle = 'opacity: 0.5; font-size: 0.9em;';
        if (idx === 0) rankStyle = 'color: #fbbf24; font-weight: bold; font-size: 1.1em; text-shadow: 0 0 10px rgba(251, 191, 36, 0.3);';
        else if (idx === 1) rankStyle = 'color: #e2e8f0; font-weight: bold;';
        else if (idx === 2) rankStyle = 'color: #b45309; font-weight: bold;';

        // 1. Fetch the correct trait image based on the name
        const cleanTraitName = b.traitName.split('(')[0].trim();
        const tObj = traitsList.find(x => x.name.toLowerCase() === cleanTraitName.toLowerCase() || x.id === cleanTraitName.toLowerCase());
        
        // 2. Build the little square icon UI
        const traitImgHtml = tObj ? `<div style="display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; margin-right: 8px; border-radius: 4px; overflow: hidden; background: #111; border: 1px solid rgba(255,255,255,0.1);"><img src="src/images/traits/${tObj.name}.png" style="width: 100%; height: 100%; object-fit: contain;" onerror="this.style.display='none'"></div>` : '';

        // 3. Inject it directly next to the trait name tag!
        html += `<tr>
            <td style="text-align: center;"><span style="${rankStyle}">#${idx + 1}</span></td>
            <td><div style="display: flex; align-items: center;">${traitImgHtml}<span class="comp-tag">${b.traitName}</span></div></td>
            <td><div class="text-sm">${setupText}</div><div class="text-xs text-dim">Prio: ${b.prio.toUpperCase()}</div></td>
            <td><div class="comp-highlight">${val} <span class="comp-val-label ${labelClass}">${label}</span></div></td>
        </tr>`;
    });
    
    html += `</tbody></table>`;
    showUniversalModal({ title: `TRAIT LEADERBOARD`, content: html, size: 'modal-lg' });
}