// js/map.js
(function(){
  const P = window.POWER = window.POWER || {};

  P.initMap = function(){
    // const boundsNA = L.latLngBounds([[5, -168], [83, -52]]); // Đã xóa giới hạn Bắc Mỹ

    // SỬA LỖI: Xóa 'maxBounds' và 'maxBoundsViscosity' để cho phép di chuyển tự do
    const map = L.map('map', { 
      worldCopyJump:true, 
      // maxBounds: boundsNA.pad(0.05), // <-- ĐÃ XÓA
      // maxBoundsViscosity: 1.0       // <-- ĐÃ XÓA
    });
    
    const osm  = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
    const esri = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Tiles &copy; Esri' });
    L.control.layers({'OSM': osm, 'Esri Imagery': esri}, {}, {position:'topleft'}).addTo(map);
    L.control.scale({ metric:true, imperial:false }).addTo(map);
    
    // SỬA LỖI: Đặt chế độ xem ban đầu là toàn thế giới (thay vì Việt Nam hay Bắc Mỹ)
    map.setView([20, 0], 2); // Tọa độ (20, 0) với mức zoom 2 (thu nhỏ)
    
    P.map = map;

    // set lat/lon inputs
    P.setLatLon = function(lat, lon){
      const latEl = document.getElementById('lat'), lonEl = document.getElementById('lon');
      if (latEl) latEl.value = Number(lat).toFixed(5);
      if (lonEl) lonEl.value = Number(lon).toFixed(5);
    };

    // map click => set lat/lon input
    map.on('click', (e)=> P.setLatLon(e.latlng.lat, e.latlng.lng));

    // fit map height to reach CSV button (as in gốc)
    P.fitMapToCSV = function(){
      const wrap = document.getElementById('wrap');
      const csvBtn = document.getElementById('btnCSV');
      if (!wrap || !csvBtn) return;
      const top = wrap.getBoundingClientRect().top + window.scrollY;
      const bottom = csvBtn.getBoundingClientRect().bottom + window.scrollY + 12;
      const h = Math.max(280, Math.min(1200, bottom - top));
      document.documentElement.style.setProperty('--mapH', h + 'px');
      if (P.map && P.map.invalidateSize) setTimeout(()=>P.map.invalidateSize(),0);
    };

    window.addEventListener('load', P.fitMapToCSV);
    window.addEventListener('resize', P.fitMapToCSV);

    // observe sidebar changes
    const sb = document.getElementById('sidebar');
    if (window.MutationObserver && sb){
      const obs = new MutationObserver(()=> P.fitMapToCSV());
      obs.observe(sb, { childList:true, subtree:true, attributes:true });
    }
  };

})();