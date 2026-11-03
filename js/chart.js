import { rupiah } from "./ui.js";

let chart = null;
const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

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
export function destroyChart() { if (chart) { chart.destroy(); chart = null; } }
