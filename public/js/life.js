// js/life.js
(function(){
  const P = window.POWER = window.POWER || {};

  // simple helper
  function clip(x,a=0,b=1){ return Math.max(a, Math.min(b, x)); }

  /**
   * CẬP NHẬT: Đây là MÔ HÌNH ĐỘNG từ tệp .docx của bạn
   * Nó chấp nhận 'wg' (hệ số nhạy nước) làm tham số
   */
  P.irrigation_decision = function(T, S, R, wg, I_prev=0){
    // Các hằng số Percentile (Đã sửa qS5, qS95 để khớp với GWETROOT 0-1)
    const qT5=-11.7681, qT95=16.8419, qS5=0.0, qS95=1.0, qR5=1.8792, qR95=2.8035, eps=1e-8;
    
    // Các tham số mô hình vật lý từ .docx
    const alpha=0.40, kappa=0.50, a=0.80, b=0.10, c=0.10;
    const R_stop=2.5989;

    // Các tham số ngưỡng động từ .docx
    const theta_min=0.35, theta_max=0.75, h=0.1;

    // Bước 1: Chuẩn hóa
    const Tn=clip((T-qT5)/(qT95-qT5+eps),0,1);
    const Sn=clip((S-qS5)/(qS95-qS5+eps),0,1); // S (GWETROOT) đã là 0-1
    const Rn=clip((R-qR5)/(qR95-qR5+eps),0,1);

    // Bước 2: Tính W (Độ sẵn có nước)
    // 'a' (0.8) là trọng số của Độ ẩm đất (Sn)
    // 'b' (0.1) là trọng số của Lợi ích mưa (B)
    const E=alpha*Tn*(1-Sn);
    const B=1-Math.exp(-kappa*Rn);
    const W=clip(a*Sn+b*B-c*E,0,1); // W bây giờ chủ yếu phụ thuộc vào Sn

    // Bước 3: Tính ngưỡng động (PHẦN QUAN TRỌNG NHẤT)
    const theta_on = theta_min + (theta_max - theta_min) * wg;
    const theta_off = Math.min(1, theta_on + h);
    
    // Bước 4: Ra quyết định
    let I; 
    if(R >= R_stop) I=0; // Dừng tưới nếu mưa TỰ NHIÊN quá lớn
    else if(W < theta_on) I=1; 
    else if(W > theta_off) I=0; 
    else I=I_prev; 

    return I;
  };

  // life maps
  P.lifeById = new Map();
  P.actionsById = new Map(); // { id: { dayIdx: { rec, act } } }

  /**
   * CẬP NHẬT: Trả về thêm 'cumGDD', 'crop', và 'irr_mm'
   */
  P.activeSeries = function(){
    try{
      const sel = document.getElementById('selSiteForDay');
      const id = (sel && sel.value) || (P.sites && P.sites[0] && P.sites[0].id);
      const s = (P.sites || []).find(x => x.id === id);
      if (!s) return null;
      return { 
        id:s.id, tmax:s.series.tmax, tmin:s.series.tmin, 
        prcp:s.series.prec, rh:s.series.rh, gtop:s.series.gtop, 
        groot:s.series.groot, 
        cumGDD: s.cumGDD,  
        crop: s.crop,
        irr_mm: s.irr_mm 
      };
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

    if (life <= 0) {
      if($lifeLabel) $lifeLabel.textContent = '0%';
      if($lifeFill)  $lifeFill.style.width = '0%';
      if($lifeStage) $lifeStage.textContent = 'Vitality: withered 🥀';
    } else {
      if($lifeLabel) $lifeLabel.textContent = life.toFixed(1)+'%';
      if($lifeFill)  $lifeFill.style.width = Math.max(0, Math.min(100, life))+'%';
      if($lifeStage) $lifeStage.textContent = 'Vitality: '+stageFromLife(life);
    }
  };

  function $(id){ return document.getElementById(id); }

  /**
   * CẬP NHẬT: Kiểm tra "chết" và tự động xóa
   * @returns {boolean} - Trả về true nếu cây chết, ngược lại false.
   */
  P.setLifeDelta = function(delta){
    const id=getActiveId(); if(!id) return false; 
    const now=P.lifeById.get(id) ?? 100.0;
    const next = Math.max(0, Math.min(100, now + (Number(delta)||0))); 
    P.lifeById.set(id,next); 

    if (next <= 0) {
      P.updateLifeUI(); 
      const gotoSel = $('gotoSel');
      if (gotoSel) {
        gotoSel.value = id;
      }
      if (typeof P.deleteSelectedSite === 'function') {
        P.deleteSelectedSite();
      }
      return true; // Báo hiệu cây đã chết
    }
    P.updateLifeUI(); // Cập nhật UI nếu cây còn sống
    return false; // Cây còn sống
  };

  P.initLifeForActive = function(){
    const s = P.activeSeries(); if (!s || !s.id) return;
    if (!P.lifeById.has(s.id)) P.lifeById.set(s.id, 100.0);
    if (!P.actionsById.has(s.id)) P.actionsById.set(s.id, {});
    P.updateLifeUI();
  };

  /**
   * CẬP NHẬT: Biến 'R' (mưa) giờ CHỈ LÀ mưa tự nhiên
   */
  P.updateIrrigationUI = function(){
    const s = P.activeSeries(); if (!s) return; const id = s.id; P.initLifeForActive();
    const i = currentDayIndex();
    
    // Lấy dữ liệu thô
    const tmax = s.tmax ? s.tmax[i] : null, tmin = s.tmin ? s.tmin[i] : null;
    const T = (tmax!=null && tmin!=null) ? (tmax + tmin)/2 : (tmax ?? tmin ?? 20);
    
    // 'groot' bây giờ là DỮ LIỆU ĐÃ ĐƯỢC MÔ PHỎNG (bị ghi đè)
    const groot = s.groot ? s.groot[i] : null; 
    const S_input = (groot != null ? groot : 0.5); // S (0-1)
    
    // R (Mưa) = CHỈ LÀ MƯA TỰ NHIÊN
    const R_rain = s.prcp ? s.prcp[i] : 0;
    const R = R_rain; // <--- SỬA LỖI LOGIC
    
    const dayActs = P.actionsById.get(id) || {}; 
    const I_prev = (dayActs[i-1] && dayActs[i-1].act != null) ? dayActs[i-1].act : 0;
    
    // Tính 'wg' động
    const stage = P.stageFromCumGDD(s.cumGDD[i] || 0, s.crop);
    const wg = stage.wg; // Lấy wg từ crops.js

    // Chạy mô hình động
    const rec = P.irrigation_decision(T, S_input, R, wg, I_prev);
    
    // Cập nhật UI (Logic này đã đúng từ trước)
    dayActs[i] = dayActs[i] || { rec: rec, act: null }; 
    dayActs[i].rec = rec; 
    P.actionsById.set(id, dayActs);
    
    const $recBadge=$('recBadge'), $recExplain=$('recExplain'); 
    if($recBadge) $recBadge.textContent = rec ? 'Water (ON)' : 'Not Water (OFF)';
    // Cập nhật giải thích: Chỉ hiển thị mưa tự nhiên (R)
    if($recExplain) $recExplain.textContent = `(T≈${Number(T).toFixed(1)}°C, GWETroot≈${groot!=null?(groot*100).toFixed(0)+'%':'—'}, Rain=${Number(R).toFixed(1)}mm)`;
    
    const acted = (dayActs[i].act !== null && dayActs[i].act !== undefined);
    const $actionLabel=$('actionLabel'), $btnIrr=$('btnIrrigate'), $btnNo=$('btnNoIrrigate'); 
    
    if ($btnIrr && $btnNo){ 
      $btnIrr.disabled = acted; 
      $btnNo.disabled = acted; 
    }
    if ($actionLabel){ $actionLabel.textContent = acted ? (dayActs[i].act ? 'Selected: Water' : 'Selected: Not Water') : 'Not Seclected'; }
    
    // Vô hiệu hóa/Kích hoạt nút Next Day (Logic đã đúng từ trước)
    const $btnNextDay = $('btnNextDay');
    if ($btnNextDay) {
        $btnNextDay.disabled = !acted;
    }

    P.updateLifeUI();
  };

  /**
   * CẬP NHẬT: Sửa lỗi 'id is not defined' VÀ Sửa lỗi vòng lặp
   */
  P.applyIrrigationAction = function(act){
    // const IRRIGATION_AMOUNT_MM = 10; // Không cần nữa
    
    const activeId = getActiveId(); // <-- Biến đúng
    const s_full = (P.sites || []).find(x => x.id === activeId); // Lấy site đầy đủ
    if (!s_full) return; // Không tìm thấy site, dừng lại

    const i = currentDayIndex();
    
    // --- SỬA LỖI Ở ĐÂY ---
    const dayActs = P.actionsById.get(activeId) || {}; // Sử dụng activeId
    const rec = (dayActs[i] && dayActs[i].rec != null) ? dayActs[i].rec : 0;
    
    if (!(dayActs[i] && dayActs[i].act != null)){ 
      dayActs[i] = dayActs[i] || { rec: rec, act: null }; 
      dayActs[i].act = act; 
      P.actionsById.set(activeId, dayActs); // Sử dụng activeId
      // --- KẾT THÚC SỬA LỖI ---

      // --- SỬA LỖI VÒNG LẶP (LOGIC MỚI) ---
      // Mô phỏng hiệu ứng tưới nước CHỈ LÊN ĐỘ ẨM ĐẤT
      if (act === 1) {
        // s_full.irr_mm[i] = IRRIGATION_AMOUNT_MM; // Bỏ
        
        // GHI ĐÈ DỮ LIỆU NASA: Coi như đất ẩm
        if (s_full.series && s_full.series.groot) {
          s_full.series.groot[i] = 0.95; // Ẩm 95% hôm nay
          if (i + 1 < s_full.series.groot.length) {
            // Đặt độ ẩm ngày mai cao hơn một chút so với mốc 0.35 (wilt)
            // nhưng vẫn đủ thấp để có thể cần tưới
            const original_next_day = s_full.series.groot[i+1] || 0.3;
            s_full.series.groot[i+1] = Math.max(original_next_day, 0.70); // Ẩm 70% vào ngày mai
          }
        }
      } else {
        // s_full.irr_mm[i] = 0; // Bỏ
        // Không ghi đè 'groot', để cho đất khô tự nhiên (theo dữ liệu NASA)
      }
      // --- KẾT THÚC SỬA LỖI VÒNG LẶP ---
      
      // LOGIC VITALITY
      let delta = 0;
      if (act === rec) {
        delta = (act === 1) ? 3 : 1; 
      } else {
        delta = (act === 1) ? -3 : -5; 
      }
      
      const isDead = P.setLifeDelta(delta); 
      if (isDead) {
        return; 
      }
    }

    // Kích hoạt lại nút "Next Day"
    const $btnNextDay = $('btnNextDay');
    if ($btnNextDay) {
        $btnNextDay.disabled = false;
    }

    // Chạy lại UI để nó tính toán lại 'rec' với độ ẩm đất MỚI
    P.updateIrrigationUI();
  };

  // wire life buttons
  P.wireLifeButtons = function(){
    const $btnIrr=$('btnIrrigate'), $btnNo=$('btnNoIrrigate');
    if ($btnIrr) $btnIrr.addEventListener('click', ()=>P.applyIrrigationAction(1));
    if ($btnNo)  $btnNo.addEventListener('click',  ()=>P.applyIrrigationAction(0));
    
    const $btnNextDay=$('btnNextDay'), $btnPrevDay=$('btnPrevDay'); 
    
    // Cập nhật UI khi nhấn Next/Prev
    if ($btnNextDay) $btnNextDay.addEventListener('click', ()=>setTimeout(P.updateIrrigationUI,0));
    if ($btnPrevDay) $btnPrevDay.addEventListener('click', ()=>setTimeout(P.updateIrrigationUI,0));
  };

})();

