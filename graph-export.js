const GraphExport = {
    exportGraphAsSVG: function(moodData, filename) {
        try {
            const svgElement = document.querySelector('.mood-graph svg');
            if (!svgElement) {
                showNotification('Graph not found', 'error');
                return false;
            }

            const svgString = new XMLSerializer().serializeToString(svgElement);
            const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename || `melo-mood-graph-${new Date().toISOString().split('T')[0]}.svg`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            return true;
        } catch (error) {
            console.error('SVG Export Error:', error);
            return false;
        }
    },

    exportGraphAsPNG: function(moodData, filename) {
        try {
            const canvas = this.createCanvasFromMoodData(moodData);
            canvas.toBlob((blob) => {
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', filename || `melo-mood-graph-${new Date().toISOString().split('T')[0]}.png`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            });
            return true;
        } catch (error) {
            console.error('PNG Export Error:', error);
            return false;
        }
    },

    createCanvasFromMoodData: function(moodData) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 1200;
        canvas.height = 600;

        ctx.fillStyle = '#0d1117';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#c4b5fd';
        ctx.textAlign = 'center';
        ctx.fillText('Melo - Mood Tracking Graph', canvas.width / 2, 40);

        if (!moodData || moodData.length < 2) {
            ctx.font = '16px Arial';
            ctx.fillStyle = '#9ca3af';
            ctx.fillText('Insufficient data for graph', canvas.width / 2, canvas.height / 2);
            return canvas;
        }

        const padding = 80;
        const graphWidth = canvas.width - 2 * padding;
        const graphHeight = canvas.height - 2 * padding - 60;

        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, canvas.height - padding);
        ctx.lineTo(canvas.width - padding, canvas.height - padding);
        ctx.stroke();

        const xScale = graphWidth / (moodData.length - 1);
        const yScale = graphHeight / 4;

        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 3;
        ctx.beginPath();

        moodData.forEach((data, index) => {
            const x = padding + (index * xScale);
            const y = canvas.height - padding - ((data.score - 1) * yScale);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        moodData.forEach((data, index) => {
            const x = padding + (index * xScale);
            const y = canvas.height - padding - ((data.score - 1) * yScale);

            ctx.fillStyle = '#a78bfa';
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fill();

            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fill();
        });

        for (let i = 1; i <= 5; i++) {
            const y = canvas.height - padding - ((i - 1) * yScale);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(padding - 10, y);
            ctx.lineTo(canvas.width - padding, y);
            ctx.stroke();

            ctx.fillStyle = '#9ca3af';
            ctx.font = '12px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(i === 1 ? '😞' : i === 2 ? '😕' : i === 3 ? '😐' : i === 4 ? '🙂' : '😄', padding - 30, y + 5);
        }

        ctx.fillStyle = '#d1d5db';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Date Range: ' + moodData.length + ' days', canvas.width / 2, canvas.height - 20);

        return canvas;
    },

    exportGraphWithAnalysis: function(moodData, stats, filename) {
        try {
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Melo Mood Analysis Report</title>
                    <style>
                        body { 
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            background: linear-gradient(135deg, #0d1117 0%, #161b22 100%);
                            color: #e0e0e0;
                            margin: 0;
                            padding: 20px;
                        }
                        .container { 
                            max-width: 900px; 
                            margin: 0 auto; 
                            background: #1e232c;
                            padding: 30px;
                            border-radius: 12px;
                            box-shadow: 0 20px 50px rgba(0,0,0,0.3);
                            border-left: 4px solid #8b5cf6;
                        }
                        h1 { 
                            color: #c4b5fd;
                            text-align: center;
                            margin-top: 0;
                        }
                        .stats-grid {
                            display: grid;
                            grid-template-columns: repeat(2, 1fr);
                            gap: 20px;
                            margin: 30px 0;
                        }
                        .stat-card {
                            background: rgba(139, 92, 246, 0.1);
                            padding: 15px;
                            border-radius: 8px;
                            border: 1px solid rgba(139, 92, 246, 0.3);
                        }
                        .stat-label {
                            font-size: 12px;
                            color: #9ca3af;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                        }
                        .stat-value {
                            font-size: 28px;
                            color: #c4b5fd;
                            font-weight: bold;
                            margin-top: 8px;
                        }
                        .insights {
                            background: rgba(100, 116, 139, 0.2);
                            padding: 20px;
                            border-radius: 8px;
                            margin: 20px 0;
                            line-height: 1.6;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 30px;
                            padding-top: 20px;
                            border-top: 1px solid rgba(255, 255, 255, 0.1);
                            font-size: 12px;
                            color: #6b7280;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>🧠 Melo Mood Analysis Report</h1>
                        
                        <div class="stats-grid">
                            <div class="stat-card">
                                <div class="stat-label">Total Entries</div>
                                <div class="stat-value">${stats.totalEntries}</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">Average Mood</div>
                                <div class="stat-value">${stats.averageMood}/5</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">Last 7 Days</div>
                                <div class="stat-value">${stats.last7Days}</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">Most Common Mood</div>
                                <div class="stat-value">${stats.mostCommonMood}</div>
                            </div>
                        </div>

                        <div class="insights">
                            <h3 style="color: #c4b5fd; margin-top: 0;">Key Insights</h3>
                            <ul style="margin: 10px 0; padding-left: 20px;">
                                <li>Tracking period: ${moodData.length} days</li>
                                <li>Average mood score: ${stats.averageMood}/5 (${stats.moodLabel})</li>
                                <li>Most frequent mood: ${stats.mostCommonMood}</li>
                                <li>Entries in last 7 days: ${stats.last7Days}</li>
                            </ul>
                        </div>

                        <div class="footer">
                            <p>Generated by Melo on ${new Date().toLocaleString()}</p>
                            <p>Your mental wellness companion 💜</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename || `melo-mood-report-${new Date().toISOString().split('T')[0]}.html`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            return true;
        } catch (error) {
            console.error('HTML Export Error:', error);
            return false;
        }
    }
};
