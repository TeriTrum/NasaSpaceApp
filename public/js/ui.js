// js/ui.js
(function(){
  const P = window.POWER = window.POWER || {};

  // state: sites array
  P.sites = P.sites || [];

  const $ = (id) => document.getElementById(id);

  // Update selectors (Đã dọn dẹp 'forStage')
  P.updateSiteSelectors = function(){
    const goto = $('gotoSel'), forDay = $('selSiteForDay');
    if (!goto || !forDay) return;
    goto.innerHTML=''; forDay.innerHTML='';
    for (const s of P.sites){
      const label = `${s.name} (${s.crop})`;
      for (const sel of [goto, forDay]){
        const o = document.createElement('option'); o.value = s.id; o.textContent = label; sel.appendChild(o);
      }
    }
    $('btnCSV').disabled = P.sites.length === 0;
  };

  // map navigation (ĐÃ SỬA LỖI THỜI GIAN)
  const gotoBtn = $('btnGoto');
  if (gotoBtn) gotoBtn.addEventListener('click', ()=>{
    const id = $('gotoSel').value;
    const s = P.sites.find(x=> x.id === id);
    if (!s) return;
    if (P.map) P.map.setView([s.lat, s.lon], 9, {animate:true});
    
    // --- SỬA LỖI RACE CONDITION ---
    // 1. Đặt site này là active và tính toán khuyến nghị
    window.activePointId = s.id;
    if (!window.dayCursorById) window.dayCursorById = new Map();
    window.dayCursorById.set(s.id, s.dayCursor ?? 0);
    if (typeof P.updateIrrigationUI === 'function') {
      P.updateIrrigationUI();
    }
    
    // 2. Cập nhật nội dung popup VỚI KHUYẾN NGHỊ MỚI
    if (s.marker && typeof P.popupHTMLAtIndex === 'function') {
      s.marker.setPopupContent(P.popupHTMLAtIndex(s, s.dayCursor ?? 0));
    }
    
    // 3. Mở popup
    if (s.marker) s.marker.openPopup();
    // --- KẾT THÚC SỬA LỖI ---
  });

  // labels (Đã dọn dẹp 'stageStepLabel')
  P.setStageLabel = function(s){
    // Đã xóa nội dung vì 'stageStepLabel' không còn tồn tại
  };

  P.setDayLabel = function(s, i){
    if (!s) { $('dayStepLabel').textContent='—'; return; }
    const stage = P.stageFromCumGDD(s.cumGDD[i]||0, s.crop);
    $('dayStepLabel').textContent = `Day: ${P.fmtDate(s.dates[i])} • ${stage.emoji} ${stage.name}`;
  };

  // Marker icon HTML based on stage + flags
  P.divIcon = function(stage, flags){
    const stress = flags.waterlog ? '🌊' : flags.irrigate ? '💧' : flags.wilt ? '🥀' : flags.dim ? '☁️' : '✅';
    const html = `<div style="width:40px;height:40px;border-radius:12px;background:#0b162c;border:2px solid #2b3f6b;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.4)"><div style="font-size:20px;line-height:18px">${stage.emoji}</div><div style="font-size:11px;color:#cbd5e1">${stress}</div></div>`;
    return L.divIcon({ html, className:'', iconSize:[40,40], iconAnchor:[20,20], popupAnchor:[0,-20] });
  };

  // stress flags (simple heuristics reused)
  P.stressFlags = function(vars, prev){
    const flags = { wilt:false, waterlog:false, heat:false, dim:false, irrigate:false };
    if (vars.groot!=null && (vars.groot*100) < 35) flags.wilt = true;
    if (vars.gtop!=null  && (vars.gtop*100)  < 25) flags.wilt = true;
    flags.irrigate = !!flags.wilt;
    if ((vars.rad||99) < 8) flags.dim=true;
    if (prev && prev.gtop!=null && vars.gtop!=null && (vars.gtop - prev.gtop) > 0.20 && (vars.groot||0)>0.75) flags.waterlog=true;
    return flags;
  };

  // Popup content for site at index i (Logic này ĐÃ ĐÚNG)
  P.popupHTMLAtIndex = function(s, i){
    const stage = P.stageFromCumGDD(s.cumGDD[i]||0, s.crop);
    const effRain = (s.series.prec[i] ?? 0) + (s.irr_mm[i] || 0);
    const flags = P.stressFlags({tmax:s.series.tmax[i], rad:s.series.rad[i], groot:s.series.groot[i], gtop:s.series.gtop[i]}, i>0? {gtop:s.series.gtop[i-1]}:null);
    
    // Lấy khuyến nghị đã được TÍNH TOÁN TRƯỚC
    const actions = (P.actionsById && P.actionsById.get(s.id)) || {};
    const dayAction = actions[i] || {};
    const rec = dayAction.rec; // Đây là khuyến nghị: 0, 1, hoặc undefined

    // Tạo chuỗi gợi ý dựa trên MÔ HÌNH
    let sugg = 'No irrigation required'; // <-- GIÁ TRỊ MẶC ĐỊNH
    if (rec === 1) {
      sugg = '💧 Water (Lack of moisture)';
    }

    // Vẫn giữ lại cảnh báo 'waterlog' (quan trọng)
    if (flags.waterlog) {
      sugg = '🌊 not Water (Waterlogged)';
    }
    
    const currentCode = stage.code;
    const entered = s.stageTL.filter(x=> x.code===currentCode).slice(-1)[0] || s.stageTL[0];
    const cfg = P.cropConfig(s.crop).stage;
    const ord = P.cropConfig(s.crop).order;
    const idxCode = ord.indexOf(currentCode);
    let nextStr = '— (Ripe)';
    if (currentCode!=='R8' && idxCode>=0){
      const nextCode = ord[idxCode+1]; const nextThr = cfg[nextCode]; const remain = Math.max(0, nextThr - (s.cumGDD[i]||0));
      const seg = s.gdd.slice(Math.max(0,i-6), i+1).filter(v=>v>0); const recent = seg.length? seg.reduce((a,b)=>a+b,0)/seg.length : null;
      const etaDays = (recent && recent>0) ? Math.ceil(remain/recent) : null;
      const pct = (nextThr>0) ? Math.min(100, Math.max(0, (s.cumGDD[i]/nextThr)*100)).toFixed(1) : '100';
      nextStr = `To ${nextCode}: Left ≈ <b>${remain.toFixed(0)}</b> GDD (${pct}% to the mark) ${etaDays? '• ~'+etaDays+' day':''}`;
    }
    const irr = s.irr_mm[i] || 0;
    const addIrrTag = irr>0 ? `<span style="display:inline-block;padding:2px 8px;border:1px solid #203052;border-radius:999px;background:#0b2a24;margin-left:6px">Đã tưới ${irr.toFixed(0)} mm</span>` : "";
    return `<b>${s.name}</b> • ${s.crop.toUpperCase()}<br/>
      Stage: ${stage.emoji} <b>${stage.name}</b> ${addIrrTag}<br/>
      <div class='small'>At this stage: <b>${P.fmtDate(entered.date)}</b> (cumGDD≈${(entered.cum||0).toFixed(0)})</div>
      <div class='small'>${nextStr}</div>
      <div class='muted'>(${P.fmtDate(s.dates[i])})</div>`;
  };

  // Apply stage cursor (ĐÃ SỬA LỖI THỜI GIAN)
  P.applyStageCursor = function(s){
    const i = s.stageTL[s.stageCursor].index;
    s.dayCursor = i;
    const stage = P.stageFromCumGDD(s.cumGDD[i]||0, s.crop);
    const flags = P.stressFlags({tmax:s.series.tmax[i], rad:s.series.rad[i], groot:s.series.groot[i], gtop:s.series.gtop[i]}, i>0? {gtop:s.series.gtop[i-1]}:null);
    s.marker.setIcon(P.divIcon(stage, flags));

    // --- SỬA LỖI: Chạy tính toán TRƯỚC KHI tạo popup
    if (typeof P.updateIrrigationUI === 'function') {
      P.updateIrrigationUI();
    }
    
    s.marker.setPopupContent(P.popupHTMLAtIndex(s, i));
    s.marker.openPopup();
    P.map.setView([s.lat, s.lon], 9, {animate:true});
    P.updateChartsToIndex(s, i);
    P.setStageLabel(s);
    P.setDayLabel(s, i);
    window.activePointId = s.id;
    if (!window.dayCursorById) window.dayCursorById = new Map();
    window.dayCursorById.set(s.id, s.dayCursor ?? 0);
  };
  
  // Apply day cursor (ĐÃ SỬA LỖI THỜI GIAN)
  P.applyDayCursor = function(s){
    const i = s.dayCursor;
    const stage = P.stageFromCumGDD(s.cumGDD[i]||0, s.crop);
    const flags = P.stressFlags({tmax:s.series.tmax[i], rad:s.series.rad[i], groot:s.series.groot[i], gtop:s.series.gtop[i]}, i>0? {gtop:s.series.gtop[i-1]}:null);
    s.marker.setIcon(P.divIcon(stage, flags));

    // --- SỬA LỖI: Chạy tính toán TRƯỚC KHI tạo popup
    if (typeof P.updateIrrigationUI === 'function') {
      P.updateIrrigationUI();
    } 
    
    s.marker.setPopupContent(P.popupHTMLAtIndex(s, i));
    s.marker.openPopup();
    P.updateChartsToIndex(s, i);
    P.setDayLabel(s, i);
    for (let k=0;k<s.stageTL.length;k++){ if (i >= s.stageTL[k].index) s.stageCursor = k; }
    P.setStageLabel(s);
    window.activePointId = s.id;
    if (!window.dayCursorById) window.dayCursorById = new Map();
    window.dayCursorById.set(s.id, s.dayCursor ?? 0);
  };

  // find sow index
  P.sowIndex = function(s){
    for (let i=0;i<s.dates.length;i++) if (s.dates[i] >= s.sowStr) return i;
    return 0;
  };

  // add site (ĐÃ SỬA LỖI THỜI GIAN, 's is not defined', VÀ 'gTtop')
  P.addSiteFromForm = async function(){
    const name = $('siteName').value.trim() || `Point ${P.sites.length+1}`;
    const crop = $('crop').value;
    const lat = parseFloat($('lat').value), lon = parseFloat($('lon').value);
    const startISO = $('start').value;
    const endISO = $('end').value;
    const sowISO = $('sow').value || startISO;

    if (!isFinite(lat)||!isFinite(lon)) { alert('No coordinates yet. Click map or use sample point.'); return; }
    if (!startISO || !endISO) { alert('Please select a date range (start/end).'); return; }
    if (startISO > endISO) { alert('The start date must be before the end date.'); return; }

    const btn = $('btnAdd'); btn.disabled = true; const oldTxt = btn.textContent; btn.textContent = 'Loading…';
    try {
      const data = await P.fetchPOWER(lat, lon, startISO, endISO);
      const p = data?.properties?.parameter || {};
      const fillMap = P.fillMapFrom(data);
      const tmaxObj = P.cleanSeries(p.T2M_MAX||{}, { fillValue: fillMap['T2M_MAX'] });
      const tminObj = P.cleanSeries(p.T2M_MIN||{}, { fillValue: fillMap['T2M_MIN'] });
      const precObj = P.cleanSeries(p.PRECTOTCORR||{}, { fillValue: fillMap['PRECTOTCORR'] });
      const radObj  = P.cleanSeries(p.ALLSKY_SFC_SW_DWN||{}, { fillValue: fillMap['ALLSKY_SFC_SW_DWN'] });
      const rhObj   = P.cleanSeries(p.RH2M||{}, { fillValue: fillMap['RH2M'] });
      const gtopObj = P.cleanSeries(p.GWETTOP||{}, { fillValue: fillMap['GWETTOP'] });
      const grootObj= P.cleanSeries(p.GWETROOT||{}, { fillValue: fillMap['GWETROOT'] });

      const dates = Object.keys({...tmaxObj, ...tminObj, ...precObj, ...radObj, ...rhObj, ...gtopObj, ...grootObj}).sort();
      if (dates.length===0){ alert('There is no valid data for the period.'); return; }

      const series = {
        tmax: dates.map(d=> tmaxObj[d] ?? null),
        tmin: dates.map(d=> tminObj[d] ?? null),
        prec: dates.map(d=> precObj[d] ?? null),
        rad : dates.map(d=> radObj[d]  ?? null),
        rh  : dates.map(d=> rhObj[d]   ?? null),
        gtop: dates.map(d=> gtopObj[d] ?? null),
        groot:dates.map(d=> grootObj[d]?? null),
      };

      const base = P.cropConfig(crop).base;
      const sowStr = (sowISO || startISO).replace(/-/g,'');
      const gddCalc = P.calculateGDDSeries(dates, series, base, sowStr);
      const gdd = gddCalc.gdd;
      const cumGDD = gddCalc.cumGDD;
      const tl = P.stageTimeline(dates, cumGDD, crop);

      // SỬA LỖI "s is not defined": Phải là 'dates.length'
      let dayStart = 0; for (let i=0;i<dates.length;i++){ if (dates[i] >= sowStr){ dayStart = i; break; } }
      let stageCur = 0; for (let k=0;k<tl.length;k++){ if (dayStart >= tl[k].index) stageCur = k; }

      const stage = P.stageFromCumGDD(cumGDD[dayStart]||0, crop);
      // SỬA LỖI TYPO "gTtop":
      const flags = P.stressFlags({tmax: series.tmax[dayStart], rad: series.rad[dayStart], groot: series.groot[dayStart], gtop: series.gtop[dayStart]}, dayStart>0? {gtop: series.gtop[dayStart-1]}:null); 

      const site = {
        id: 'site_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
        name, crop, lat, lon,
        dates, series, gdd, cumGDD,
        stageTL: tl, stageCursor: stageCur, dayCursor: dayStart,
        irr_mm: new Array(dates.length).fill(0),
        sowISO, sowStr
      };

      const m = L.marker([lat, lon], { icon: P.divIcon(stage, flags) }).addTo(P.map);
      site.marker = m;
      
      // --- SỬA LỖI: Chạy tính toán TRƯỚC KHI tạo popup
      window.activePointId = site.id; 
      if (!window.dayCursorById) window.dayCursorById = new Map();
      window.dayCursorById.set(site.id, site.dayCursor ?? dayStart);
      if (typeof P.updateIrrigationUI === 'function') {
        P.updateIrrigationUI();
      }
      
      m.bindPopup(P.popupHTMLAtIndex(site, dayStart));

      P.sites.push(site);
      P.updateSiteSelectors();
      $('selSiteForDay').value = site.id;
      $('gotoSel').value = site.id;
      $('btnCSV').disabled = false;
      m.openPopup(); P.updateChartsToIndex(site, dayStart);
      P.map.setView([lat,lon], 9, {animate:true});
      P.setStageLabel(site);
      P.setDayLabel(site, dayStart);
      
      P.fitMapToCSV && setTimeout(P.fitMapToCSV, 0);
    } catch(e) { console.error(e); alert('Error retrieving data: '+e.message); }
    finally { btn.disabled=false; btn.textContent=oldTxt; }
  };

  // delete selected site (Đã dọn dẹp 'stageStepLabel')
  P.deleteSelectedSite = function(){
    const id = $('gotoSel').value || (P.sites[0] && P.sites[0].id);
    if (!id){ alert('No points to delete.'); return; }
    const idx = P.sites.findIndex(x=> x.id===id);
    if (idx<0) { alert('No points found to delete.'); return; }
    const s = P.sites[idx];
    if (s.marker){ P.map.removeLayer(s.marker); }
    P.sites.splice(idx,1);
    P.updateSiteSelectors();
    if (P.sites.length>0){
      const s0 = P.sites[0];
      $('selSiteForDay').value = s0.id;
      $('gotoSel').value = s0.id;
      s0.dayCursor = s0.dayCursor ?? P.sowIndex(s0);
      P.applyDayCursor(s0);
      P.map.setView([s0.lat, s0.lon], 9, {animate:true});
    } else {
      P.charts && P.charts.chart && (P.charts.chart.data.labels = [], P.charts.chart.data.datasets.forEach(ds=> ds.data=[]), P.charts.chart.update());
      P.charts && P.charts.chart2 && (P.charts.chart2.data.labels = [], P.charts.chart2.data.datasets.forEach(ds=> ds.data=[]), P.charts.chart2.update());
      $('dayStepLabel').textContent='—';
    }
    P.fitMapToCSV && setTimeout(P.fitMapToCSV,0);
  };

  // export CSV for selected site (ĐÃ SỬA LỖI TYPO)
  P.exportCSVSelected = function(){
    const id = $('selSiteForDay').value || (P.sites[0] && P.sites[0].id);
    const s = P.sites.find(x=> x.id===id);
    if (!s) { alert('No points to show.'); return; }
    let csv = 'date,Tmax_C,Tmin_C,RH2M_percent,GWETTOP_frac,GWETROOT_frac,ALLSKY_MJ_m2_day,RAIN_plus_IRR_mm_day,GDD_base,CumGDD,Stage,Irrigation_mm\n';
    for (let i=0;i<s.dates.length;i++){
      // SỬA LỖI 1 & 2: 
      const st = P.stageFromCumGDD(s.cumGDD[i]||0, s.crop);
      // SỬA LỖI 3: 
      const effRain = (s.series.prec[i]??0) + (s.irr_mm[i]||0); 
      // SỬA LỖI 4: (s.cumGGDD -> s.cumGDD)
      const row = [s.dates[i], s.series.tmax[i]??'', s.series.tmin[i]??'', s.series.rh[i]??'', s.series.gtop[i]??'', s.series.groot[i]??'', s.series.rad[i]??'', effRain, s.gdd[i]??'', s.cumGDD[i]??'', st.code, s.irr_mm[i]||0];
      csv += row.join(',') + '\n';
    }
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${(s.name||'site').replace(/\s+/g,'_')}_power.csv`; a.click(); URL.revokeObjectURL(url);
  };

  // Stage/day controls (Đã dọn dẹp)
  P.prevStageSelected = function(){
    // Đã xóa
  };
  P.nextStageSelected = function(){
    // Đã xóa
  };
  P.prevDaySelected = function(){
    const s = P.sites.find(x=> x.id === $('selSiteForDay').value); if(!s) return;
    s.dayCursor = Math.max(0, s.dayCursor-1); P.applyDayCursor(s);
  };
  P.nextDaySelected = function(){
    const s = P.sites.find(x=> x.id === $('selSiteForDay').value); if(!s) return;
    s.dayCursor = Math.min(s.dates.length-1, s.dayCursor+1); P.applyDayCursor(s);
  };
  P.gotoSowDaySelected = function(){
    // Đã xóa
  };

  // wire selector change (Đã dọn dẹp 'selSiteForStage')
  ['selSiteForDay','gotoSel'].forEach(id=>{
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', ()=>{
      const s = (P.sites || []).find(x=> x.id === el.value) || (P.sites && P.sites[0]);
      if (!s) return;
      window.activePointId = s.id;
      if (!window.dayCursorById) window.dayCursorById = new Map();
      window.dayCursorById.set(s.id, s.dayCursor ?? 0);
    });
  });

})();

