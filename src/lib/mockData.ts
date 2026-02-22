import type { Property, Comparable, Client, MarketTrend } from './types'

export function generateMockProperties(): Property[] {
  return [
    {
      id: '1',
      clientId: 'client-1',
      status: 'in-progress',
      address: {
        street: 'רחוב הרצל 45',
        city: 'תל אביב',
        neighborhood: 'נווה צדק',
        postalCode: '6688101'
      },
      type: 'apartment',
      details: {
        builtArea: 95,
        totalArea: 110,
        rooms: 4,
        bedrooms: 3,
        bathrooms: 2,
        floor: 3,
        totalFloors: 5,
        buildYear: 2015,
        condition: 'excellent',
        parking: 1,
        storage: true,
        balcony: true,
        elevator: true,
        accessible: false
      },
      features: ['renovated', 'air-conditioning', 'security-door', 'intercom', 'sun-balcony'],
      description: 'דירה מרווחת ומעוצבת בלב נווה צדק, משופצת לפני שנתיים, עם נוף פתוח ושמש כל היום',
      photos: [],
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      valuationData: {
        estimatedValue: 4850000,
        valueRange: { min: 4650000, max: 5050000 },
        confidence: 87,
        method: 'comparable-sales',
        comparables: ['comp-1', 'comp-2', 'comp-3'],
        notes: 'שוק חזק באזור, ביקוש גבוה לדירות משופצות'
      }
    },
    {
      id: '2',
      clientId: 'client-2',
      status: 'completed',
      address: {
        street: 'דרך בן גוריון 128',
        city: 'רמת גן',
        neighborhood: 'בורסה',
        postalCode: '5265001'
      },
      type: 'penthouse',
      details: {
        builtArea: 140,
        totalArea: 200,
        rooms: 5.5,
        bedrooms: 4,
        bathrooms: 3,
        floor: 8,
        totalFloors: 8,
        buildYear: 2018,
        condition: 'new',
        parking: 2,
        storage: true,
        balcony: true,
        elevator: true,
        accessible: true
      },
      features: ['penthouse', 'roof-terrace', 'smart-home', 'premium-finishes', 'private-elevator'],
      description: 'פנטהאוז יוקרתי עם גג ענק, נוף פנורמי, גימורים ברמה הגבוהה ביותר',
      photos: [],
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      valuationData: {
        estimatedValue: 8200000,
        valueRange: { min: 7900000, max: 8500000 },
        confidence: 92,
        method: 'comparable-sales',
        comparables: ['comp-4', 'comp-5', 'comp-6'],
        notes: 'נכס ייחודי, מעט השוואות זמינות באזור'
      }
    },
    {
      id: '3',
      clientId: 'client-3',
      status: 'draft',
      address: {
        street: 'רחוב הנביאים 22',
        city: 'ירושלים',
        neighborhood: 'נחלאות',
        postalCode: '9419203'
      },
      type: 'house',
      details: {
        builtArea: 180,
        totalArea: 250,
        rooms: 6,
        bedrooms: 4,
        bathrooms: 2.5,
        floor: 1,
        totalFloors: 2,
        buildYear: 1935,
        condition: 'good',
        parking: 2,
        storage: true,
        balcony: false,
        elevator: false,
        accessible: false
      },
      features: ['historic-building', 'garden', 'original-floors', 'high-ceilings'],
      description: 'בית פרטי היסטורי בלב נחלאות, עם גינה ופוטנציאל שימור',
      photos: [],
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '4',
      clientId: 'client-1',
      status: 'sent',
      address: {
        street: 'שדרות רוטשילד 88',
        city: 'תל אביב',
        neighborhood: 'לב העיר',
        postalCode: '6688201'
      },
      type: 'apartment',
      details: {
        builtArea: 75,
        totalArea: 85,
        rooms: 3,
        bedrooms: 2,
        bathrooms: 1,
        floor: 5,
        totalFloors: 6,
        buildYear: 2020,
        condition: 'new',
        parking: 0,
        storage: false,
        balcony: true,
        elevator: true,
        accessible: true
      },
      features: ['new-building', 'air-conditioning', 'premium-lobby', 'gym'],
      description: 'דירה חדשה במגדל בוטיק ברוטשילד, עם נוף לשדרה',
      photos: [],
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      valuationData: {
        estimatedValue: 3900000,
        valueRange: { min: 3750000, max: 4050000 },
        confidence: 95,
        method: 'comparable-sales',
        comparables: ['comp-7', 'comp-8'],
        notes: 'בניין חדש, מחירים יציבים'
      }
    }
  ]
}

export function generateMockClients(): Client[] {
  return [
    {
      id: 'client-1',
      name: 'דוד כהן',
      email: 'david.cohen@example.com',
      phone: '054-1234567',
      company: 'כהן נכסים בע"מ',
      properties: ['1', '4'],
      notes: 'לקוח VIP, מעדיף תקשורת במייל',
      createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'client-2',
      name: 'שרה לוי',
      email: 'sarah.levi@example.com',
      phone: '052-9876543',
      properties: ['2'],
      notes: 'צריכה דוחות מפורטים עם כל הנתונים',
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'client-3',
      name: 'משה אברהם',
      email: 'moshe.a@example.com',
      phone: '053-5551234',
      company: 'קבוצת אברהם',
      properties: ['3'],
      notes: 'מתעניין בנכסים היסטוריים',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]
}

export function generateMockComparables(): Comparable[] {
  return [
    {
      id: 'comp-1',
      address: 'רחוב שבזי 12, תל אביב',
      type: 'apartment',
      salePrice: 4700000,
      saleDate: '2024-01-15',
      builtArea: 90,
      rooms: 4,
      floor: 2,
      distance: 0.3,
      adjustments: {
        location: 50000,
        size: 25000,
        condition: 0,
        floor: 15000,
        age: 0,
        features: 10000,
        total: 100000
      },
      adjustedPrice: 4800000,
      pricePerSqm: 52222,
      selected: true
    },
    {
      id: 'comp-2',
      address: 'רחוב עזרא 8, תל אביב',
      type: 'apartment',
      salePrice: 5100000,
      saleDate: '2023-12-20',
      builtArea: 100,
      rooms: 4,
      floor: 4,
      distance: 0.5,
      adjustments: {
        location: -30000,
        size: -50000,
        condition: -20000,
        floor: 0,
        age: 10000,
        features: 0,
        total: -90000
      },
      adjustedPrice: 5010000,
      pricePerSqm: 50100,
      selected: true
    },
    {
      id: 'comp-3',
      address: 'רחוב אילת 15, תל אביב',
      type: 'apartment',
      salePrice: 4550000,
      saleDate: '2024-02-01',
      builtArea: 92,
      rooms: 3.5,
      floor: 3,
      distance: 0.4,
      adjustments: {
        location: 80000,
        size: 15000,
        condition: 30000,
        floor: 0,
        age: 5000,
        features: 20000,
        total: 150000
      },
      adjustedPrice: 4700000,
      pricePerSqm: 51087,
      selected: true
    }
  ]
}

export function generateMockMarketTrends(): MarketTrend[] {
  const trends: MarketTrend[] = []
  const basePrice = 45000
  
  for (let i = 24; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    
    const growth = (24 - i) * 0.015
    const volatility = (Math.random() - 0.5) * 0.05
    
    trends.push({
      period: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      avgPrice: Math.round(basePrice * (1 + growth + volatility) * 100),
      avgPricePerSqm: Math.round(basePrice * (1 + growth + volatility)),
      sales: Math.floor(80 + Math.random() * 40),
      avgDaysOnMarket: Math.floor(45 + Math.random() * 30)
    })
  }
  
  return trends
}

export function generateMockReports() {
  return [
    {
      id: 'report-1',
      propertyId: '1',
      clientId: 'client-1',
      title: 'דוח שמאות מלא - רחוב הרצל 45',
      format: 'pdf' as const,
      template: 'detailed' as const,
      status: 'delivered' as const,
      sections: [
        {
          id: 'sec-1',
          title: 'תקציר מנהלים',
          content: 'הנכס הינו דירת 4 חדרים מעוצבת ומשופצת ברחוב הרצל 45, תל אביב. השווי המשוער: ₪4,850,000 בהתבסס על ניתוח השוואתי מקיף של שוק הנדל"ן באזור.',
          type: 'text' as const,
          order: 1,
          required: true,
          enabled: true
        },
        {
          id: 'sec-2',
          title: 'פרטי הנכס',
          content: 'דירת 4 חדרים, 95 מ"ר בנוי, קומה 3 מתוך 5, בנין משנת 2015 עם מעלית.',
          type: 'text' as const,
          order: 2,
          required: true,
          enabled: true
        },
        {
          id: 'sec-3',
          title: 'ניתוח שוק',
          content: 'שוק הנדל"ן בנווה צדק נמצא במגמת עלייה מתמשכת. הביקוש לדירות משופצות גבוה במיוחד.',
          type: 'text' as const,
          order: 3,
          required: true,
          enabled: true
        }
      ],
      appraiserName: 'יוסי כהן',
      appraiserLicense: 'LIC-12345',
      generatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      deliveredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      watermark: false
    },
    {
      id: 'report-2',
      propertyId: '2',
      clientId: 'client-2',
      title: 'דוח שמאות - רחוב רוטשילד 128',
      format: 'html' as const,
      template: 'standard' as const,
      status: 'completed' as const,
      sections: [
        {
          id: 'sec-1',
          title: 'תקציר מנהלים',
          content: 'פנטהאוז יוקרתי ברחוב רוטשילד 128. שווי משוער: ₪12,300,000.',
          type: 'text' as const,
          order: 1,
          required: true,
          enabled: true
        }
      ],
      appraiserName: 'יוסי כהן',
      appraiserLicense: 'LIC-12345',
      generatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      watermark: false
    }
  ]
}

export function generateMockUpdateRequests() {
  return [
    {
      id: 'req-1',
      propertyId: '1',
      clientId: 'client-1',
      reportId: 'report-1',
      title: 'עדכון שווי לאור שיפוצים חדשים',
      description: 'ביצענו שיפוצים נוספים במטבח והחלפנו את חלונות האלומיניום. אשמח לעדכון השומה המשקפת את השיפורים.',
      priority: 'medium' as const,
      status: 'in-progress' as const,
      requestedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      response: 'קיבלתי את הבקשה. אבוא לבקר בנכס בשבוע הבא כדי להעריך את השיפוצים החדשים ולעדכן את השומה בהתאם.'
    },
    {
      id: 'req-2',
      propertyId: '3',
      clientId: 'client-3',
      title: 'שאלה לגבי השוואה לנכס דומה',
      description: 'ראיתי דירה דומה ברחוב הסמוך שנמכרה במחיר גבוה יותר. האם ניתן להסביר את ההבדל?',
      priority: 'low' as const,
      status: 'pending' as const,
      requestedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]
}

