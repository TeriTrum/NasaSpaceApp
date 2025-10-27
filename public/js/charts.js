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
        scales:{ y1:{type:'linear',position:'left',title:{display:true,text:'°C'}},
                 y2:{type:'linear',position:'right',grid:{drawOnChartArea:false},title:{display:true,text:'mm/ngày'}} }
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
        scales:{ y3:{type:'linear',position:'left',suggestedMin:0,suggestedMax:100,title:{display:true,text:'%'}} }
      }
    });

    /**
     * Cập nhật biểu đồ tới index i của site s
     * s: site object có { dates, series, irr_mm }
     */
    P.updateChartsToIndex = function(s, i){
      if (!s) return;
      const end = Math.min(i+1, s.dates.length);
      const dlab = s.dates.slice(0,end).map(x=> x.slice(4,6)+'/'+x.slice(6,8));
      P.charts.chart.data.labels = dlab;
      const effRain = s.dates.slice(0,end).map((_,idx)=> (s.series.prec[idx] ?? 0) + (s.irr_mm[idx] || 0));
      P.charts.chart.data.datasets[0].data = s.series.tmax.slice(0,end);
      P.charts.chart.data.datasets[1].data = s.series.tmin.slice(0,end);
      P.charts.chart.data.datasets[2].data = effRain;
      P.charts.chart.update();

      P.charts.chart2.data.labels = dlab;
      P.charts.chart2.data.datasets[0].data = s.series.rh.slice(0,end);
      P.charts.chart2.data.datasets[1].data = s.series.gtop.slice(0,end).map(v=> v==null? null : v*100);
      P.charts.chart2.data.datasets[2].data = s.series.groot.slice(0,end).map(v=> v==null? null : v*100);
      P.charts.chart2.update();
    };
  };

})();
