import { rupiah } from "./ui.js";

let chart = null;
let pieChart = null;
const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

const PIE_COLORS = ["#A87A52", "#C99A6B", "#8A6B4F", "#D9B48A", "#7C5A3C", "#B08A64", "#9E7A57", "#C2A27E"];

export function renderMonthChart(canvas, labels, income, expense) {
  if (chart) chart.destroy();
  const ink = css("--muted"), grid = css("--line");
  chart = new window.Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Pemasukan", data: income, backgroundColor: css("--primary"), borderColor: css("--chart-edge"), borderWidth: 1.5, borderRadius: 6 },
        { label: "Pengeluaran", data: expense, backgroundColor: css("--chart-2"), borderRadius: 6 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: ink, font: { family: "Nunito" } } },
        tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${rupiah(c.parsed.y)}` } }
      },
      scales: {
        x: { ticks: { color: ink }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: ink, callback: (v) => new Intl.NumberFormat("id-ID", { notation: "compact" }).format(v) }, grid: { color: grid } }
      }
    }
  });
}

export function renderPieChart(canvas, labels, values) {
  if (pieChart) pieChart.destroy();
  const ink = css("--muted"), paper = css("--paper");
  const dark = document.documentElement.dataset.theme === "dark";
  const palette = dark
    ? ["#7C5A3C", "#9E7A57", "#C99A6B", "#8A6B4F", "#D9B48A", "#B08A64", "#6B4A3A", "#A87A52"]
    : PIE_COLORS;
  const total = values.reduce((a, v) => a + v, 0);
  pieChart = new window.Chart(canvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: labels.map((_, i) => palette[i % palette.length]),
        borderColor: paper,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: "55%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: ink, font: { family: "Nunito" }, boxWidth: 14, padding: 10 }
        },
        tooltip: {
          callbacks: {
            label: (c) => {
              const v = c.parsed;
              const pct = total ? ((v / total) * 100).toFixed(1) : "0.0";
              return `${c.label}: ${rupiah(v)} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

export function destroyChart() {
  if (chart) { chart.destroy(); chart = null; }
  if (pieChart) { pieChart.destroy(); pieChart = null; }
}