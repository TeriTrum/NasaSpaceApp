// js/crops.js
// Helpers: fetch POWER, clean series, crop/stage/GDD logic
(function(){
  const P = window.POWER = window.POWER || {};

  /**
   * Clean a parameter object from POWER API (object keyed by YYYYMMDD).
   * options: { dropZeros, fillValue, dropNeg }
   */
  P.cleanSeries = function(obj, options = { dropZeros:false, fillValue:undefined, dropNeg:true }){
    const out = {};
    options = options || {};
    for (const [d, val] of Object.entries(obj || {})){
      let v = Number(val);
      if (!isFinite(v)) { out[d] = null; continue; }
      if (options.fillValue !== undefined && Number(v) === Number(options.fillValue)) { out[d] = null; continue; }
      if (options.dropNeg && v < 0) { out[d] = null; continue; }
      if (options.dropZeros && v === 0) { out[d] = null; continue; }
      out[d] = v;
    }
    return out;
  };

  /**
   * Fetch daily POWER data for a point
   * Returns parsed JSON from NASA POWER API (properties.parameter)
   */
  P.fetchPOWER = async function(lat, lon, startISO, endISO){
    const todayISO = new Date().toISOString().slice(0,10);
    if (endISO > todayISO) endISO = todayISO;
    const start = startISO.replace(/-/g,'');
    const end = endISO.replace(/-/g,'');
    const params = 'T2M_MIN,T2M_MAX,PRECTOTCORR,ALLSKY_SFC_SW_DWN,RH2M,GWETTOP,GWETROOT';
    const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=${params}&community=AG&latitude=${lat}&longitude=${lon}&start=${start}&end=${end}&format=JSON`;
    const r = await fetch(url);
    if (!r.ok) throw new Error('POWER API error: ' + r.status);
    return r.json();
  };

  /**
   * Extract fillValue map from POWER response (for each parameter)
   */
  P.fillMapFrom = function(data){
    const info = data?.properties?.parameterInformation || data?.parameters || {};
    const map = {};
    for (const k of Object.keys(info)){
      const fv = info[k]?.fillValue;
      if (fv !== undefined) map[k] = Number(fv);
    }
    return map;
  };

  /**
   * Crop configuration for GDD thresholds and base temp
   * CẬP NHẬT: Đã thêm 'wg' (Hệ số nhạy nước)
   */
  P.cropConfig = function(crop){
    if (crop === 'soy'){
      return { 
        base:10, 
        stage:{ VE:100, V:450, R1:650, R5:900, R8:1200 }, 
        order:['VE','V','R1','R5','R8'], 
        names:{VE:'Germination',V:'Nutrition',R1:'Flowering',R5:'Accumulate particles',R8:'Ripe'},
        // (Giá trị wg ví dụ: 0.8 = cần 80% độ nhạy)
        wg:   { VE:0.3, V:0.5, R1:0.8, R5:0.7, R8:0.2 } 
      };
    }
    if (crop === 'wheat'){
      return { 
        base:0, 
        stage:{ VE:120, V:500, R1:800, R5:1200, R8:1600 }, 
        order:['VE','V','R1','R5','R8'], 
        names:{VE:'Germination',V:'Nutrition',R1:'Flowering',R5:'Accumulate particles',R8:'Ripe'},
        wg:   { VE:0.3, V:0.5, R1:0.9, R5:0.6, R8:0.2 } // Ví dụ cho lúa mì
      };
    }
    // default
    return { 
      base:10, 
      stage:{ VE:120, V:500, R1:800, R5:1200, R8:1600 }, 
      order:['VE','V','R1','R5','R8'], 
      names:{VE:'Germination',V:'Nutrition',R1:'Flowering',R5:'Accumulate particles',R8:'Ripe'},
      wg:   { VE:0.3, V:0.5, R1:0.8, R5:0.7, R8:0.2 } // Mặc định dùng 'soy'
    };
  };

  /**
   * CẬP NHẬT: Trả về cả 'wg'
   */
  P.stageFromCumGDD = function(cum, crop){
    const cfg = P.cropConfig(crop); // Tải config một lần
    if (cum < cfg.stage.VE) return { code:'VE', name:cfg.names.VE, emoji:'🌱', wg: cfg.wg.VE };
    if (cum < cfg.stage.V)  return { code:'V',  name:cfg.names.V,  emoji:'🌿', wg: cfg.wg.V  };
    if (cum < cfg.stage.R1) return { code:'R1', name:cfg.names.R1, emoji:(crop==='wheat'?'🌾':'🌸'), wg: cfg.wg.R1 };
    if (cum < cfg.stage.R5) return { code:'R5', name:cfg.names.R5, emoji:(crop==='wheat'?'🌾':'🫘'), wg: cfg.wg.R5 };
    return { code:'R8', name:cfg.names.R8, emoji:'🌽', wg: cfg.wg.R8 };
  };

  P.stageTimeline = function(dates, cum, crop){
    const tl = []; let last = null;
    for (let i=0;i<dates.length;i++){
      const st = P.stageFromCumGDD(cum[i]||0, crop).code;
      if (st !== last) { tl.push({ index:i, date:dates[i], code:st, cum:cum[i]||0 }); last = st; }
    }
    return tl;
  };

  P.fmtDate = function(s){
    if (!String(s)) return s;
    return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
  };

  /**
   * Compute daily GDD (and cumulative GDD) given dates and series
   * series must contain tmax,tmin arrays aligned with dates
   */
  P.calculateGDDSeries = function(dates, series, base, sowStr){
    const gdd = [];
    const cumGDD = [];
    let cum = 0;
    for (let i=0;i<dates.length;i++){
      const d = dates[i];
      if (d < sowStr) { gdd.push(0); cumGDD.push(0); continue; }
      const tmax = series.tmax[i], tmin = series.tmin[i];
      if (tmax == null || tmin == null) { gdd.push(0); cumGDD.push(cum); continue; }
      const add = Math.max(0, ((tmax + tmin) / 2) - base);
      gdd.push(add);
      cum += add;
      cumGDD.push(cum);
    }
    return { gdd, cumGDD };
  };

})();
