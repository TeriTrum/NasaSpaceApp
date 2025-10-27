// js/main.js
(function(){
  const P = window.POWER = window.POWER || {};

  document.addEventListener('DOMContentLoaded', () => {
    // init modules
    P.initMap && P.initMap();
    P.initCharts && P.initCharts();
    P.wireLifeButtons && P.wireLifeButtons();

    // DOM helpers
    const $ = id => document.getElementById(id);

    // init lat/lon from preset
    const presetSel = $('preset');
    (function initLatLon(){
      const [lat, lon] = presetSel.value.split(',').map(Number);
      P.setLatLon && P.setLatLon(lat, lon);
    })();

    // Use preset button
    $('usePreset').addEventListener('click', ()=>{
      const [lat, lon] = presetSel.value.split(',').map(Number);
      P.setLatLon && P.setLatLon(lat, lon);
      if (P.map) P.map.setView([lat, lon], 7);
    });

    // btnAdd
    const btnAdd = $('btnAdd');
    btnAdd && btnAdd.addEventListener('click', ()=>{
      P.addSiteFromForm && P.addSiteFromForm();
    });

    // btnDelete
    $('btnDelete').addEventListener('click', ()=> P.deleteSelectedSite && P.deleteSelectedSite());

    // CSV export
    $('btnCSV').addEventListener('click', ()=> P.exportCSVSelected && P.exportCSVSelected());

    // stage/day controls
    $('btnPrevStage').addEventListener('click', ()=> P.prevStageSelected && P.prevStageSelected());
    $('btnNextStage').addEventListener('click', ()=> P.nextStageSelected && P.nextStageSelected());
    $('btnPrevDay').addEventListener('click', ()=> P.prevDaySelected && P.prevDaySelected());
    $('btnNextDay').addEventListener('click', ()=> P.nextDaySelected && P.nextDaySelected());
    $('btnToSow').addEventListener('click', ()=> P.gotoSowDaySelected && P.gotoSowDaySelected());

    // sync selector change -> open popup + update charts
    ['selSiteForDay','selSiteForStage','gotoSel'].forEach(id=>{
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', ()=>{
        const s = (P.sites || []).find(x => x.id === el.value);
        if (!s) return;
        window.activePointId = s.id;
        if (!window.dayCursorById) window.dayCursorById = new Map();
        window.dayCursorById.set(s.id, s.dayCursor ?? 0);
        // open popup and update charts
        if (s.marker) s.marker.openPopup();
        P.updateChartsToIndex && P.updateChartsToIndex(s, s.dayCursor ?? 0);
        P.updateIrrigationUI && setTimeout(P.updateIrrigationUI,0);
      });
    });

    // fit map on load/resize handled in map.js already (P.fitMapToCSV)
  });

})();
