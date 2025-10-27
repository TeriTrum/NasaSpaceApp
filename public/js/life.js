// js/life.js
(function(){
  const P = window.POWER = window.POWER || {};

  // simple helper
  function clip(x,a=0,b=1){ return Math.max(a, Math.min(b, x)); }

  // irrigation decision model (copied simplified from original)
  P.irrigation_decision = function(T, S, R, I_prev=0){
    const qT5=-11.7681, qT95=16.8419, qS5=197.6556, qS95=233.2954, qR5=1.8792, qR95=2.8035, eps=1e-8;
    const Tn=clip((T-qT5)/(qT95-qT5+eps),0,1), Sn=clip((S-qS5)/(qS95-qS5+eps),0,1), Rn=clip((R-qR5)/(qR95-qR5+eps),0,1);
    const alpha=0.40,kappa=0.50,a=0.80,b=0.10,c=0.10,theta_on=0.3723,theta_off=0.5044,R_stop=2.5989;
    const E=alpha*Tn*(1-Sn), B=1-Math.exp(-kappa*Rn), W=clip(a*Sn+b*B-c*E,0,1);
    let I; if(R>=R_stop) I=0; else if(W<theta_on) I=1; else if(W>theta_off) I=0; else I=I_prev; return I;
  };

  // life maps
  P.lifeById = new Map();
  P.actionsById = new Map(); // { id: { dayIdx: { rec, act } } }

  // return "active series" structure for the currently selected site in selSiteForDay
  P.activeSeries = function(){
    try{
      const sel = document.getElementById('selSiteForDay');
      const id = (sel && sel.value) || (P.sites && P.sites[0] && P.sites[0].id);
      const s = (P.sites || []).find(x => x.id === id);
      if (!s) return null;
      return { id:s.id, tmax:s.series.tmax, tmin:s.series.tmin, prcp:s.series.prec, rh:s.series.rh, gtop:s.series.gtop, groot:s.series.groot };
    }catch(e){ return null; }
  };

  // get active id
  function getActiveId(){ return window.activePointId || null; }

  // day index from window.dayCursorById
  function currentDayIndex(){ const id=getActiveId(); return (window.dayCursorById && window.dayCursorById.get(id)) ?? 0; }

  function stageFromLife(l){ if (l>=80) return 'Very good (80–100%)'; if (l>=60) return 'Good (60–79%)'; if (l>=40) return 'Normal (40–59%)'; if (l>=20) return 'Bad (20–39%)'; return 'Very Bad (<20%)'; }

  // UI updates
  P.updateLifeUI = function(){
    const id = getActiveId(); if(!id) return;
    const life = P.lifeById.get(id) ?? 100.0;
    const $lifeLabel=$('lifeLabel'), $lifeFill=$('lifeFill'), $lifeStage=$('lifeStageLabel');
    if($lifeLabel) $lifeLabel.textContent = life.toFixed(1)+'%';
    if($lifeFill)  $lifeFill.style.width = Math.max(0, Math.min(100, life))+'%';
    if($lifeStage) $lifeStage.textContent = 'Vitality: '+stageFromLife(life);
  };

  function $(id){ return document.getElementById(id); }

  P.setLifeDelta = function(delta){
    const id=getActiveId(); if(!id) return; const now=P.lifeById.get(id) ?? 100.0;
    const next = Math.max(0, Math.min(100, now + (Number(delta)||0))); P.lifeById.set(id,next); P.updateLifeUI();
  };

  P.initLifeForActive = function(){
    const s = P.activeSeries(); if (!s || !s.id) return;
    if (!P.lifeById.has(s.id)) P.lifeById.set(s.id, 100.0);
    if (!P.actionsById.has(s.id)) P.actionsById.set(s.id, {});
    P.updateLifeUI();
  };

  // update irrigation UI & recommendation for current day
  P.updateIrrigationUI = function(){
    const s = P.activeSeries(); if (!s) return; const id = s.id; P.initLifeForActive();
    const i = currentDayIndex();
    const tmax = s.tmax ? s.tmax[i] : null, tmin = s.tmin ? s.tmin[i] : null;
    const T = (tmax!=null && tmin!=null) ? (tmax + tmin)/2 : (tmax ?? tmin ?? 20);
    const groot = s.groot ? s.groot[i] : null; const R = s.prcp ? s.prcp[i] : 0;
    const dayActs = P.actionsById.get(id) || {}; const I_prev = (dayActs[i-1] && dayActs[i-1].act != null) ? dayActs[i-1].act : 0;
    const rec = P.irrigation_decision(T, (groot!=null ? groot*300.0 : 50), R, I_prev);
    dayActs[i] = dayActs[i] || { rec: rec, act: null }; dayActs[i].rec = rec; P.actionsById.set(id, dayActs);
    const $recBadge=$('recBadge'), $recExplain=$('recExplain'); if($recBadge) $recBadge.textContent = rec ? 'Water (ON)' : 'Not Water (OFF)';
    if($recExplain) $recExplain.textContent = `(T≈${Number(T).toFixed(1)}°C, GWETroot≈${groot!=null?(groot*100).toFixed(0)+'%':'—'}, Rain=${Number(R).toFixed(1)}mm)`;
    const acted = (dayActs[i].act !== null && dayActs[i].act !== undefined);
    const $actionLabel=$('actionLabel'), $btnIrr=$('btnIrrigate'), $btnNo=$('btnNoIrrigate');
    if ($btnIrr && $btnNo){ $btnIrr.disabled = acted; $btnNo.disabled = acted; }
    if ($actionLabel){ $actionLabel.textContent = acted ? (dayActs[i].act ? 'Selected: Water' : 'Selected: Not Water') : 'Not Seclected'; }
    P.updateLifeUI();
  };

  // apply irrigation action for active day
  P.applyIrrigationAction = function(act){
    const s = P.activeSeries(); if (!s) return; const id = s.id; const i = currentDayIndex();
    const dayActs = P.actionsById.get(id) || {}; const rec = (dayActs[i] && dayActs[i].rec != null) ? dayActs[i].rec : 0;
    if (!(dayActs[i] && dayActs[i].act != null)){ dayActs[i] = dayActs[i] || { rec: rec, act: null }; dayActs[i].act = act; P.actionsById.set(id, dayActs);
      const delta = act ? +5 : -3; P.setLifeDelta(delta); }
    P.updateIrrigationUI();
  };

  // wire life buttons
  P.wireLifeButtons = function(){
    const $btnIrr=$('btnIrrigate'), $btnNo=$('btnNoIrrigate');
    if ($btnIrr) $btnIrr.addEventListener('click', ()=>P.applyIrrigationAction(1));
    if ($btnNo)  $btnNo.addEventListener('click',  ()=>P.applyIrrigationAction(0));
    const $btnNextDay=$('btnNextDay'), $btnPrevDay=$('btnPrevDay'), $btnDayAfter=$('btnDayAfter');
    if ($btnNextDay) $btnNextDay.addEventListener('click', ()=>setTimeout(P.updateIrrigationUI,0));
    if ($btnPrevDay) $btnPrevDay.addEventListener('click', ()=>setTimeout(P.updateIrrigationUI,0));
    if ($btnDayAfter) $btnDayAfter.addEventListener('click', ()=>{ if($btnNextDay){ $btnNextDay.click(); setTimeout(()=> $btnNextDay.click(), 0); } });
  };

})();
