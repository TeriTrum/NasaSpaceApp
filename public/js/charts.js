// js/charts.js
(function(){
  const P = window.POWER = window.POWER || {};

  P.initCharts = function(){
    const c1 = document.getElementById('chart').getContext('2d');
    const c2 = document.getElementById('chart2').getContext('2d');

    P.charts = {};
    P.charts.chart = new Chart(c1, {
      type:'line',
      data:{ labels:[], datasets:[
        { label:'Tmax (°C)', data:[], yAxisID:'y1' },
        { label:'Tmin (°C)', data:[], yAxisID:'y1' },
        { label:'Precipitation (mm/day)', data:[], yAxisID:'y2' }
      ]},
      options:{ responsive:true, interaction:{mode:'index',intersect:false}, stacked:false, spanGaps:true,
        plugins:{ legend:{position:'top'} },
        scales:{ 
          y1:{type:'linear',position:'left',title:{display:true,text:'°C'}},
          y2:{type:'linear',position:'right',grid:{drawOnChartArea:false},title:{display:true,text:'mm/ngày'}},
          // SỬA LỖI 1: Thêm trục X để có thể điều khiển
          x: {
            ticks: {
                autoSkip: true, // Tự động bỏ qua các nhãn nếu quá dày
                maxTicksLimit: 10 // Giới hạn số lượng nhãn ngày (theo ý bạn)
            }
          }
        }
      }
    });

    P.charts.chart2 = new Chart(c2, {
      type:'line',
      data:{ labels:[], datasets:[
        { label:'RH2M (%)', data:[], yAxisID:'y3' },
        { label:'GWETTOP (%)', data:[], yAxisID:'y3' },
        { label:'GWETROOT (%)', data:[], yAxisID:'y3' }
      ]},
      options:{ responsive:true, interaction:{mode:'index',intersect:false}, stacked:false, spanGaps:true,
        plugins:{ legend:{position:'top'} },
        scales:{ 
          y3:{type:'linear',position:'left',suggestedMin:0,suggestedMax:100,title:{display:true,text:'%'}},
          // SỬA LỖI 1: Thêm trục X để có thể điều khiển
          x: {
            ticks: {
                autoSkip: true,
                maxTicksLimit: 10
            }
          }
        }
      }
    });

    /**
     * Cập nhật biểu đồ tới index i của site s
     * s: site object có { dates, series, irr_mm }
     */
    P.updateChartsToIndex = function(s, i){
      // SỬA LỖI 2: Logic "Cửa sổ trượt" (10 ngày) bằng cách cắt mảng (slice)
      const WINDOW_SIZE = 10; // Chỉ hiển thị 10 ngày
      if (!s) return;
      
      const current_day_index = i; // Ngày hiện tại (ví dụ: 100)
      
      // Tính toán điểm bắt đầu và kết thúc để CẮT mảng
      // end_slice là ngày hiện tại + 1
      const end_slice = Math.min(current_day_index + 1, s.dates.length);
      // start_slice là (ngày hiện tại + 1) - 10
      const start_slice = Math.max(0, end_slice - WINDOW_SIZE);

      // Cắt mảng labels và data
      const dlab = s.dates.slice(start_slice, end_slice).map(x=> x.slice(4,6)+'/'+x.slice(6,8));
      
      // Cập nhật Chart 1
      P.charts.chart.data.labels = dlab;
      P.charts.chart.data.datasets[0].data = s.series.tmax.slice(start_slice, end_slice);
      P.charts.chart.data.datasets[1].data = s.series.tmin.slice(start_slice, end_slice);
      P.charts.chart.data.datasets[2].data = s.series.prec.slice(start_slice, end_slice).map((prec, idx) => (prec ?? 0)); // Chỉ mưa tự nhiên
      
      // Không cần set min/max nữa
      P.charts.chart.update();

      // Cập nhật Chart 2
      P.charts.chart2.data.labels = dlab;
      P.charts.chart2.data.datasets[0].data = s.series.rh.slice(start_slice, end_slice);
      P.charts.chart2.data.datasets[1].data = s.series.gtop.slice(start_slice, end_slice).map(v=> v==null? null : v*100);
      P.charts.chart2.data.datasets[2].data = s.series.groot.slice(start_slice, end_slice).map(v=> v==null? null : v*100);
      
      // Không cần set min/max nữa
      P.charts.chart2.update();
    };
  };

})();