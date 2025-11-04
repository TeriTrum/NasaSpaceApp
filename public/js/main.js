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

    // stage/day controls (ĐÃ DỌN DẸP)
    $('btnPrevDay').addEventListener('click', ()=> P.prevDaySelected && P.prevDaySelected());
    $('btnNextDay').addEventListener('click', ()=> P.nextDaySelected && P.nextDaySelected());

    // sync selector change -> open popup + update charts (ĐÃ SỬA LỖI HOÀN CHỈNH)
    ['selSiteForDay','gotoSel'].forEach(id=>{
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', ()=>{
        const s = (P.sites || []).find(x => x.id === el.value) || (P.sites && P.sites[0]);
        if (!s) return;
        window.activePointId = s.id;
        if (!window.dayCursorById) window.dayCursorById = new Map();
        window.dayCursorById.set(s.id, s.dayCursor ?? 0);
        
        // --- SỬA LỖI THỜI GIAN ---
        // 1. Tính toán khuyến nghị TRƯỚC
        if (typeof P.updateIrrigationUI === 'function') {
          P.updateIrrigationUI();
        }
        
        // 2. Cập nhật nội dung HTML của popup VỚI KHUYẾN NGHỊ MỚI
        if (s.marker && typeof P.popupHTMLAtIndex === 'function') {
          s.marker.setPopupContent(P.popupHTMLAtIndex(s, s.dayCursor ?? 0));
        }
        
        // 3. Mở popup và cập nhật charts SAU
        if (s.marker) s.marker.openPopup(); // Bây giờ popup sẽ hiển thị đúng
        P.updateChartsToIndex && P.updateChartsToIndex(s, s.dayCursor ?? 0);
        // --- KẾT THÚC SỬA LỖI ---
      });
    });

    // fit map on load/resize handled in map.js already (P.fitMapToCSV)
  });

})();

