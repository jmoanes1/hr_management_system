/**
 * Employee Directory - Dashboard Charts (HTML Canvas)
 */

(function () {
    'use strict';

    if (!window.chartData) return;

    const cssVar = (name, fallback) =>
        getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

    function withAlpha(hex, alpha) {
        const value = hex.replace('#', '');
        const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
        const num = parseInt(full.slice(0, 6), 16);
        if (Number.isNaN(num)) return hex;
        return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
    }

    const colors = {
        primary: cssVar('--color-primary', '#2563EB'),
        grid: cssVar('--border-color', '#E2E8F0'),
        text: cssVar('--text-muted', '#94A3B8'),
        surface: cssVar('--bg-surface', '#FFFFFF'),
        heading: cssVar('--text-primary', '#0F172A'),
        // Single-hue navy/blue ramp so charts stay inside the product palette.
        palette: ['#2563EB', '#1E40AF', '#3B82F6', '#1E293B', '#60A5FA', '#334155', '#93C5FD', '#64748B'],
        // Employment status reuses the badge semantics from the design system.
        status: {
            active: cssVar('--color-success', '#16A34A'),
            inactive: cssVar('--text-disabled', '#CBD5E1'),
            on_leave: cssVar('--color-info', '#2563EB'),
            terminated: cssVar('--color-danger', '#DC2626'),
        },
    };

    function statusColor(item, index) {
        return colors.status[item.employment_status] || colors.palette[index % colors.palette.length];
    }

    // getBoundingClientRect() includes the card's padding, which made the canvas
    // wider than the space it is drawn in.
    function contentWidth(canvas) {
        const parent = canvas.parentElement;
        if (!parent) return 0;
        const cs = getComputedStyle(parent);
        return Math.max(
            parent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
            0
        );
    }

    function drawBarChart(canvasId, labels, values) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const W = contentWidth(canvas);
        const H = 280;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.scale(dpr, dpr);

        if (!labels.length) {
            ctx.clearRect(0, 0, W, H);
            ctx.fillStyle = colors.text;
            ctx.font = '14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No department data available', W / 2, H / 2);
            return;
        }
        const padding = { top: 20, right: 20, bottom: 60, left: 50 };
        const chartW = W - padding.left - padding.right;
        const chartH = H - padding.top - padding.bottom;
        const maxVal = Math.max(...values, 1);
        const barWidth = chartW / values.length * 0.6;
        const gap = chartW / values.length * 0.4;

        ctx.clearRect(0, 0, W, H);

        // Grid lines
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (chartH / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(W - padding.right, y);
            ctx.stroke();
        }

        // Bars
        values.forEach((val, i) => {
            const barH = (val / maxVal) * chartH;
            const x = padding.left + i * (barWidth + gap) + gap / 2;
            const y = padding.top + chartH - barH;

            ctx.fillStyle = colors.primary;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(x, y, barWidth, barH, [5, 5, 0, 0]);
            } else {
                ctx.rect(x, y, barWidth, barH);
            }
            ctx.fill();

            ctx.fillStyle = colors.text;
            ctx.font = '600 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            if (val > 0) ctx.fillText(val, x + barWidth / 2, y - 6);

            ctx.save();
            ctx.translate(x + barWidth / 2, H - padding.bottom + 12);
            ctx.rotate(-0.35);
            ctx.textAlign = 'right';
            ctx.font = '10px Inter, sans-serif';
            ctx.fillText(labels[i].substring(0, 14), 0, 0);
            ctx.restore();
        });
    }

    function drawLineChart(canvasId, labels, values) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const W = contentWidth(canvas);
        const H = 260;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.scale(dpr, dpr);

        const padding = { top: 20, right: 20, bottom: 50, left: 50 };
        const chartW = W - padding.left - padding.right;
        const chartH = H - padding.top - padding.bottom;

        if (!values.length) {
            ctx.fillStyle = colors.text;
            ctx.font = '14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No hiring data available', W / 2, H / 2);
            return;
        }

        const maxVal = Math.max(...values, 1);
        ctx.clearRect(0, 0, W, H);

        // Grid
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (chartH / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(W - padding.right, y);
            ctx.stroke();
        }

        // Area fill under line
        const points = values.map((val, i) => ({
            x: padding.left + (i / Math.max(values.length - 1, 1)) * chartW,
            y: padding.top + chartH - (val / maxVal) * chartH,
        }));

        if (points.length > 1) {
            const areaGrad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
            areaGrad.addColorStop(0, withAlpha(colors.primary, 0.14));
            areaGrad.addColorStop(1, withAlpha(colors.primary, 0));
            ctx.fillStyle = areaGrad;
            ctx.beginPath();
            ctx.moveTo(points[0].x, padding.top + chartH);
            points.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
            ctx.closePath();
            ctx.fill();
        }

        // Line
        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        points.forEach((p, i) => {
            i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        // Points & labels
        const labelStep = Math.ceil(points.length / Math.max(Math.floor(chartW / 52), 1));
        points.forEach((p, i) => {
            ctx.fillStyle = colors.surface;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = colors.primary;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
            ctx.fill();

            if (i % labelStep !== 0 && i !== points.length - 1) return;
            ctx.fillStyle = colors.text;
            ctx.font = '500 10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText((labels[i] || '').split(' ')[0], p.x, H - padding.bottom + 16);
        });
    }

    const STATUS_LABELS = {
        active: 'Active', inactive: 'Inactive',
        on_leave: 'On Leave', terminated: 'Terminated'
    };

    function statusKey(item) {
        return Object.prototype.hasOwnProperty.call(STATUS_LABELS, item.employment_status)
            ? item.employment_status
            : 'other';
    }

    function buildStatusLegend(data) {
        const legendEl = document.getElementById('statusLegend');
        if (!legendEl) return;
        legendEl.innerHTML = data.map((item) => {
            const key = statusKey(item);
            return `
            <div class="dash-legend-item">
                <span class="dash-legend-left">
                    <span class="dash-legend-dot dash-legend-dot--${key}"></span>
                    ${STATUS_LABELS[item.employment_status] || item.employment_status}
                </span>
                <span class="dash-legend-count">${item.count}</span>
            </div>
        `;
        }).join('');
    }

    function drawDoughnutChart(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        if (!data.length) {
            const ctx = canvas.getContext('2d');
            const W = contentWidth(canvas);
            canvas.width = W;
            canvas.height = 220;
            canvas.style.width = W + 'px';
            ctx.fillStyle = colors.text;
            ctx.font = '14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No status data', W / 2, 110);
            buildStatusLegend([]);
            return;
        }

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const W = contentWidth(canvas);
        const H = 220;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.scale(dpr, dpr);

        const cx = W / 2;
        const cy = H / 2 - 10;
        const radius = 72;
        const innerRadius = 50;
        const total = data.reduce((sum, d) => sum + d.count, 0) || 1;

        ctx.clearRect(0, 0, W, H);

        let startAngle = -Math.PI / 2;
        data.forEach((item, i) => {
            const sliceAngle = (item.count / total) * Math.PI * 2;
            ctx.fillStyle = statusColor(item, i);
            ctx.beginPath();
            ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
            ctx.arc(cx, cy, innerRadius, startAngle + sliceAngle, startAngle, true);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = colors.surface;
            ctx.lineWidth = 2;
            ctx.stroke();
            startAngle += sliceAngle;
        });

        ctx.fillStyle = colors.heading;
        ctx.font = '700 22px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(total, cx, cy + 4);
        ctx.font = '11px Inter, sans-serif';
        ctx.fillStyle = colors.text;
        ctx.fillText('Total', cx, cy + 20);

        buildStatusLegend(data);
    }

    document.addEventListener('DOMContentLoaded', () => {
        const dept = window.chartData.dept || [];
        drawBarChart(
            'deptChart',
            dept.map(d => d.name),
            dept.map(d => d.emp_count)
        );

        const hire = window.chartData.hire || [];
        drawLineChart(
            'hireChart',
            hire.map(h => h.month),
            hire.map(h => h.count)
        );

        drawDoughnutChart('statusChart', window.chartData.status || []);

        window.addEventListener('resize', () => {
            drawBarChart('deptChart', dept.map(d => d.name), dept.map(d => d.emp_count));
            drawLineChart('hireChart', hire.map(h => h.month), hire.map(h => h.count));
            drawDoughnutChart('statusChart', window.chartData.status || []);
        });
    });
})();
