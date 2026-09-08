import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { Brain, Loader2, TrendingUp, AlertTriangle, CheckCircle, Lightbulb } from "lucide-react";

export default function PropertyAnalyzer({ property }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const analyzeProperty = async () => {
    setAnalyzing(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `נתח נכס מקרקעין בישראל:

כתובת: ${property.address}, ${property.city}
סוג: ${property.property_type}
חדרים: ${property.rooms || 'לא צוין'}
שטח: ${property.area_sqm} מ"ר
קומה: ${property.floor}/${property.total_floors}
שנת בנייה: ${property.year_built || 'לא ידוע'}
מעלית: ${property.elevator ? 'כן' : 'לא'}

${property.estimated_value ? `שווי מוערך: ₪${property.estimated_value.toLocaleString()}` : ''}
${property.last_sale_price ? `מחיר מכירה אחרון: ₪${property.last_sale_price.toLocaleString()} ב-${property.last_sale_date}` : ''}

בצע ניתוח מקיף הכולל:
1. נקודות חוזק של הנכס
2. נקודות חולשה
3. הזדמנויות (שיפוץ, שינוי ייעוד, פוטנציאל)
4. סיכונים והערות חשובות
5. המלצות לשמאי

תשובה מקצועית בעברית, מבוססת שוק ישראלי.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            strengths: {
              type: "array",
              items: { type: "string" }
            },
            weaknesses: {
              type: "array",
              items: { type: "string" }
            },
            opportunities: {
              type: "array",
              items: { type: "string" }
            },
            risks: {
              type: "array",
              items: { type: "string" }
            },
            recommendations: {
              type: "array",
              items: { type: "string" }
            },
            overall_assessment: {
              type: "string"
            },
            market_position: {
              type: "string",
              enum: ["below_market", "market_average", "above_market", "premium"]
            }
          }
        }
      });

      setAnalysis(response);
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const marketPositionConfig = {
    below_market: { label: 'מתחת לשוק', color: 'bg-red-100 text-red-800' },
    market_average: { label: 'ממוצע שוק', color: 'bg-blue-100 text-blue-800' },
    above_market: { label: 'מעל ממוצע', color: 'bg-green-100 text-green-800' },
    premium: { label: 'פרמיום', color: 'bg-purple-100 text-purple-800' }
  };

  return (
    <Card className="border-2 border-violet-200">
      <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-violet-600" />
            ניתוח AI מתקדם
          </CardTitle>
          {!analysis && (
            <Button
              onClick={analyzeProperty}
              disabled={analyzing}
              size="sm"
              className="bg-violet-600 hover:bg-violet-700"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  מנתח...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  נתח נכס
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        {!analysis && !analyzing && (
          <div className="text-center py-8">
            <Brain className="w-12 h-12 mx-auto mb-3 text-violet-300" />
            <p className="text-sm text-slate-600 mb-2">קבל ניתוח מקצועי מבוסס AI</p>
            <p className="text-xs text-slate-500">
              ניתוח SWOT, המלצות והערכת מיקום בשוק
            </p>
          </div>
        )}

        {analyzing && (
          <div className="text-center py-12">
            <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-violet-600" />
            <p className="text-sm text-slate-700 font-medium">מנתח את הנכס...</p>
          </div>
        )}

        {analysis && (
          <div className="space-y-4">
            {/* Market Position */}
            {analysis.market_position && (
              <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg p-4 border border-violet-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">מיקום בשוק</span>
                  <Badge className={marketPositionConfig[analysis.market_position].color}>
                    {marketPositionConfig[analysis.market_position].label}
                  </Badge>
                </div>
              </div>
            )}

            {/* Overall Assessment */}
            {analysis.overall_assessment && (
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-sm text-slate-700 leading-relaxed">
                  {analysis.overall_assessment}
                </p>
              </div>
            )}

            {/* Strengths */}
            {analysis.strengths && analysis.strengths.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  נקודות חוזק
                </h4>
                <div className="space-y-1.5">
                  {analysis.strengths.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm bg-green-50 rounded-lg p-2 border border-green-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                      <span className="text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weaknesses */}
            {analysis.weaknesses && analysis.weaknesses.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  נקודות חולשה
                </h4>
                <div className="space-y-1.5">
                  {analysis.weaknesses.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm bg-red-50 rounded-lg p-2 border border-red-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                      <span className="text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Opportunities */}
            {analysis.opportunities && analysis.opportunities.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  הזדמנויות
                </h4>
                <div className="space-y-1.5">
                  {analysis.opportunities.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm bg-blue-50 rounded-lg p-2 border border-blue-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                      <span className="text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risks */}
            {analysis.risks && analysis.risks.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  סיכונים
                </h4>
                <div className="space-y-1.5">
                  {analysis.risks.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm bg-amber-50 rounded-lg p-2 border border-amber-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                      <span className="text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-purple-600" />
                  המלצות
                </h4>
                <div className="space-y-1.5">
                  {analysis.recommendations.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm bg-purple-50 rounded-lg p-2 border border-purple-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
                      <span className="text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-200">
              <Button
                onClick={() => setAnalysis(null)}
                variant="outline"
                size="sm"
                className="w-full"
              >
                נתח מחדש
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}