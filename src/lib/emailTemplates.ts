import { TrendReport } from './transactionTrends'

export interface EmailTemplate {
  subject: string
  htmlBody: string
  textBody: string
}

export function generateTrendReportEmail(
  report: TrendReport,
  customMessage?: string,
  includeInsights: boolean = true,
  _includeCharts: boolean = true,
  includeAlerts: boolean = true
): EmailTemplate {
  const { metrics, previousPeriodMetrics, insights, alerts, marketSummary, period } = report

  const priceChange = previousPeriodMetrics.avgPrice > 0
    ? ((metrics.avgPrice - previousPeriodMetrics.avgPrice) / previousPeriodMetrics.avgPrice) * 100
    : 0

  const volumeChange = previousPeriodMetrics.totalTransactions > 0
    ? ((metrics.totalTransactions - previousPeriodMetrics.totalTransactions) / previousPeriodMetrics.totalTransactions) * 100
    : 0

  const subject = `דוח מגמות שוק ${period === 'weekly' ? 'שבועי' : 'חודשי'} - ${new Date(report.endDate).toLocaleDateString('he-IL')}`

  const htmlBody = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      font-size: 32px;
      margin-bottom: 10px;
      font-weight: 700;
    }
    .header p {
      font-size: 16px;
      opacity: 0.9;
    }
    .badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      margin-top: 15px;
      background: rgba(255,255,255,0.2);
      backdrop-filter: blur(10px);
    }
    .content {
      padding: 30px;
    }
    .custom-message {
      background: #f8f9fa;
      border-right: 4px solid #667eea;
      padding: 20px;
      margin-bottom: 30px;
      border-radius: 8px;
    }
    .alert-box {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
    }
    .alert-critical {
      background: #f8d7da;
      border-color: #dc3545;
    }
    .alert-box strong {
      display: block;
      margin-bottom: 5px;
      color: #856404;
    }
    .alert-critical strong {
      color: #721c24;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }
    .stat-card {
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      padding: 20px;
      border-radius: 12px;
      text-align: center;
    }
    .stat-card .label {
      font-size: 14px;
      color: #666;
      margin-bottom: 8px;
    }
    .stat-card .value {
      font-size: 28px;
      font-weight: 700;
      color: #333;
      margin-bottom: 5px;
    }
    .stat-card .change {
      font-size: 14px;
      font-weight: 600;
    }
    .change.positive {
      color: #28a745;
    }
    .change.negative {
      color: #dc3545;
    }
    .section {
      margin: 30px 0;
    }
    .section h2 {
      font-size: 22px;
      color: #333;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #667eea;
    }
    .summary-box {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      white-space: pre-wrap;
      font-size: 15px;
      line-height: 1.8;
    }
    .neighborhood-list {
      list-style: none;
    }
    .neighborhood-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      margin-bottom: 10px;
      background: #f8f9fa;
      border-radius: 8px;
      border-right: 4px solid #667eea;
    }
    .neighborhood-item .rank {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: #667eea;
      color: white;
      border-radius: 50%;
      font-weight: 700;
      margin-left: 15px;
    }
    .insight-card {
      background: #fff;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 15px;
    }
    .insight-card.opportunity {
      border-right: 4px solid #28a745;
      background: #f1f9f3;
    }
    .insight-card.warning {
      border-right: 4px solid #ffc107;
      background: #fff9e6;
    }
    .insight-card.trend {
      border-right: 4px solid #667eea;
      background: #f0f3ff;
    }
    .insight-card h3 {
      font-size: 18px;
      margin-bottom: 10px;
      color: #333;
    }
    .insight-card p {
      margin-bottom: 10px;
      color: #666;
    }
    .insight-card .recommendation {
      background: white;
      padding: 15px;
      border-radius: 6px;
      margin-top: 10px;
      border: 1px solid #dee2e6;
    }
    .hotspot-grid {
      display: grid;
      gap: 10px;
    }
    .hotspot-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
    }
    .footer {
      background: #f8f9fa;
      padding: 30px;
      text-align: center;
      color: #666;
      font-size: 14px;
    }
    .footer p {
      margin-bottom: 10px;
    }
    @media (max-width: 600px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }
      .header h1 {
        font-size: 24px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>דוח מגמות שוק ${period === 'weekly' ? 'שבועי' : 'חודשי'}</h1>
      <p>${new Date(report.startDate).toLocaleDateString('he-IL')} - ${new Date(report.endDate).toLocaleDateString('he-IL')}</p>
      <div class="badge">
        ${metrics.marketTemperature === 'heating' ? '🔥 שוק מתחמם' : metrics.marketTemperature === 'cooling' ? '❄️ שוק מתקרר' : '📊 שוק יציב'}
      </div>
    </div>

    <div class="content">
      ${customMessage ? `
      <div class="custom-message">
        <p>${customMessage}</p>
      </div>
      ` : ''}

      ${includeAlerts && alerts.length > 0 ? `
      <div class="section">
        <h2>⚠️ התראות חשובות</h2>
        ${alerts.map(alert => `
          <div class="alert-box ${alert.severity === 'critical' ? 'alert-critical' : ''}">
            <strong>${alert.message}</strong>
            ${alert.area ? `<p>אזור: ${alert.area}</p>` : ''}
            <p>שינוי: ${alert.change > 0 ? '+' : ''}${alert.change.toFixed(1)}%</p>
          </div>
        `).join('')}
      </div>
      ` : ''}

      <div class="section">
        <h2>📊 סיכום תקופה</h2>
        <div class="summary-box">${marketSummary}</div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="label">מחיר ממוצע</div>
          <div class="value">₪${metrics.avgPrice.toLocaleString('he-IL')}</div>
          ${priceChange !== 0 ? `
            <div class="change ${priceChange > 0 ? 'positive' : 'negative'}">
              ${priceChange > 0 ? '↗' : '↘'} ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(1)}%
            </div>
          ` : ''}
        </div>

        <div class="stat-card">
          <div class="label">מחיר למ"ר</div>
          <div class="value">₪${metrics.avgPricePerSqm.toLocaleString('he-IL')}</div>
          <div class="label" style="margin-top: 5px;">חציון: ₪${metrics.medianPricePerSqm.toLocaleString('he-IL')}</div>
        </div>

        <div class="stat-card">
          <div class="label">נפח עסקאות</div>
          <div class="value">${metrics.totalTransactions}</div>
          ${volumeChange !== 0 ? `
            <div class="change ${volumeChange > 0 ? 'positive' : 'negative'}">
              ${volumeChange > 0 ? '↗' : '↘'} ${volumeChange > 0 ? '+' : ''}${volumeChange.toFixed(1)}%
            </div>
          ` : ''}
        </div>
      </div>

      ${metrics.topNeighborhoods.length > 0 ? `
      <div class="section">
        <h2>🔥 אזורים פעילים</h2>
        <ul class="neighborhood-list">
          ${metrics.topNeighborhoods.map((n, i) => `
            <li class="neighborhood-item">
              <div style="display: flex; align-items: center;">
                <span class="rank">${i + 1}</span>
                <div>
                  <strong>${n.neighborhood}</strong>
                  <div style="font-size: 14px; color: #666;">${n.transactions} עסקאות</div>
                </div>
              </div>
              <div style="text-align: left;">
                <strong>₪${n.avgPrice.toLocaleString('he-IL')}</strong>
                <div style="font-size: 14px; color: #666;">₪${n.avgPricePerSqm.toLocaleString('he-IL')}/מ"ר</div>
              </div>
            </li>
          `).join('')}
        </ul>
      </div>
      ` : ''}

      ${includeInsights && insights.length > 0 ? `
      <div class="section">
        <h2>💡 תובנות AI</h2>
        ${insights.map(insight => `
          <div class="insight-card ${insight.type}">
            <h3>${insight.title}</h3>
            <p>${insight.description}</p>
            <p><strong>השפעה:</strong> ${insight.impact}</p>
            <div class="recommendation">
              <strong>המלצה:</strong> ${insight.recommendation}
            </div>
            ${insight.affectedArea ? `<p style="margin-top: 10px; font-size: 14px; color: #666;">אזור מושפע: ${insight.affectedArea}</p>` : ''}
          </div>
        `).join('')}
      </div>
      ` : ''}

      ${metrics.hotspots.length > 0 ? `
      <div class="section">
        <h2>📍 נקודות חמות בשוק</h2>
        <div class="hotspot-grid">
          ${metrics.hotspots.map(h => `
            <div class="hotspot-item">
              <div>
                <strong>${h.neighborhood}, ${h.city}</strong>
                <div style="font-size: 14px; color: #666;">${h.transactions} עסקאות • ${h.activity === 'high' ? '🔥 פעילות גבוהה' : '📊 פעילות בינונית'}</div>
              </div>
              <div style="text-align: left;">
                <strong>₪${h.avgPrice.toLocaleString('he-IL')}</strong>
                <div style="font-size: 14px; ${h.priceChange > 0 ? 'color: #28a745;' : 'color: #dc3545;'}">
                  ${h.priceChange > 0 ? '+' : ''}${h.priceChange.toFixed(1)}%
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <div class="section" style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px;">
        <div style="font-size: 14px; color: #666; margin-bottom: 8px;">רמת ביטחון בנתונים</div>
        <div style="font-size: 32px; font-weight: 700; color: #667eea;">${(metrics.confidence * 100).toFixed(0)}%</div>
        <div style="width: 100%; max-width: 300px; height: 8px; background: #e9ecef; border-radius: 4px; margin: 15px auto;">
          <div style="width: ${metrics.confidence * 100}%; height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 4px;"></div>
        </div>
      </div>
    </div>

    <div class="footer">
      <p><strong>דוח זה נוצר אוטומטית</strong></p>
      <p>${new Date(report.generatedAt).toLocaleString('he-IL')}</p>
      <p style="margin-top: 20px; color: #999; font-size: 12px;">
        הנתונים מבוססים על ניתוח מתקדם של שוק המקרקעין<br>
        לשאלות או הבהרות, אנא צור קשר
      </p>
    </div>
  </div>
</body>
</html>
  `

  const textBody = `
דוח מגמות שוק ${period === 'weekly' ? 'שבועי' : 'חודשי'}
${new Date(report.startDate).toLocaleDateString('he-IL')} - ${new Date(report.endDate).toLocaleDateString('he-IL')}

${customMessage ? `${customMessage}\n\n` : ''}

${marketSummary}

===================
סטטיסטיקות מרכזיות
===================

מחיר ממוצע: ₪${metrics.avgPrice.toLocaleString('he-IL')} ${priceChange !== 0 ? `(${priceChange > 0 ? '+' : ''}${priceChange.toFixed(1)}%)` : ''}
מחיר למ"ר: ₪${metrics.avgPricePerSqm.toLocaleString('he-IL')}
נפח עסקאות: ${metrics.totalTransactions} ${volumeChange !== 0 ? `(${volumeChange > 0 ? '+' : ''}${volumeChange.toFixed(1)}%)` : ''}

${metrics.topNeighborhoods.length > 0 ? `
===================
אזורים פעילים
===================

${metrics.topNeighborhoods.map((n, i) => `${i + 1}. ${n.neighborhood}: ${n.transactions} עסקאות, ₪${n.avgPrice.toLocaleString('he-IL')}`).join('\n')}
` : ''}

${includeInsights && insights.length > 0 ? `
===================
תובנות
===================

${insights.map(insight => `
• ${insight.title}
  ${insight.description}
  המלצה: ${insight.recommendation}
`).join('\n')}
` : ''}

רמת ביטחון: ${(metrics.confidence * 100).toFixed(0)}%
נוצר ב: ${new Date(report.generatedAt).toLocaleString('he-IL')}
  `.trim()

  return {
    subject,
    htmlBody,
    textBody
  }
}
