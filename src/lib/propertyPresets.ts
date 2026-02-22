import { PropertyType, PropertyCondition } from './types'

export interface PropertyTypePreset {
  id: string
  type: PropertyType
  name: string
  nameHe: string
  description: string
  descriptionHe: string
  icon: string
  typicalSizeRange: {
    min: number
    max: number
  }
  typicalRooms: {
    min: number
    max: number
  }
  baseCondition: PropertyCondition
}

export interface AreaPriceRange {
  areaId: string
  areaName: string
  areaNameHe: string
  city: string
  neighborhood?: string
  priceRanges: {
    [key in PropertyType]?: {
      pricePerSqmMin: number
      pricePerSqmMax: number
      pricePerSqmAvg: number
      trend: 'rising' | 'stable' | 'declining'
      trendPercent: number
      lastUpdated: string
      sampleSize: number
    }
  }
}

export const PROPERTY_TYPE_PRESETS: PropertyTypePreset[] = [
  {
    id: 'apartment',
    type: 'apartment',
    name: 'Apartment',
    nameHe: 'דירה',
    description: 'Standard residential apartment in a multi-unit building',
    descriptionHe: 'דירת מגורים סטנדרטית בבניין רב יחידות',
    icon: '🏢',
    typicalSizeRange: { min: 50, max: 150 },
    typicalRooms: { min: 2, max: 5 },
    baseCondition: 'good'
  },
  {
    id: 'penthouse',
    type: 'penthouse',
    name: 'Penthouse',
    nameHe: 'פנטהאוז',
    description: 'Luxury top-floor apartment with terraces',
    descriptionHe: 'דירת יוקרה בקומה עליונה עם מרפסות',
    icon: '🏙️',
    typicalSizeRange: { min: 120, max: 300 },
    typicalRooms: { min: 4, max: 7 },
    baseCondition: 'excellent'
  },
  {
    id: 'garden-apartment',
    type: 'garden-apartment',
    name: 'Garden Apartment',
    nameHe: 'דירת גן',
    description: 'Ground floor apartment with private garden',
    descriptionHe: 'דירה בקומת קרקע עם גינה פרטית',
    icon: '🌳',
    typicalSizeRange: { min: 80, max: 180 },
    typicalRooms: { min: 3, max: 6 },
    baseCondition: 'good'
  },
  {
    id: 'duplex',
    type: 'duplex',
    name: 'Duplex',
    nameHe: 'דופלקס',
    description: 'Two-story apartment unit',
    descriptionHe: 'יחידת דיור דו-קומתית',
    icon: '🏘️',
    typicalSizeRange: { min: 100, max: 250 },
    typicalRooms: { min: 4, max: 7 },
    baseCondition: 'good'
  },
  {
    id: 'studio',
    type: 'studio',
    name: 'Studio',
    nameHe: 'סטודיו',
    description: 'Single-room apartment',
    descriptionHe: 'דירת חדר אחד',
    icon: '🛏️',
    typicalSizeRange: { min: 25, max: 60 },
    typicalRooms: { min: 1, max: 2 },
    baseCondition: 'good'
  },
  {
    id: 'house',
    type: 'house',
    name: 'House',
    nameHe: 'בית פרטי',
    description: 'Detached single-family house',
    descriptionHe: 'בית צמוד קרקע למשפחה אחת',
    icon: '🏡',
    typicalSizeRange: { min: 150, max: 500 },
    typicalRooms: { min: 4, max: 10 },
    baseCondition: 'good'
  },
  {
    id: 'commercial',
    type: 'commercial',
    name: 'Commercial',
    nameHe: 'מסחרי',
    description: 'Commercial property for business use',
    descriptionHe: 'נכס מסחרי לשימוש עסקי',
    icon: '🏪',
    typicalSizeRange: { min: 30, max: 1000 },
    typicalRooms: { min: 1, max: 20 },
    baseCondition: 'good'
  },
  {
    id: 'land',
    type: 'land',
    name: 'Land',
    nameHe: 'קרקע',
    description: 'Undeveloped land parcel',
    descriptionHe: 'מגרש קרקע לא מפותח',
    icon: '🌾',
    typicalSizeRange: { min: 200, max: 10000 },
    typicalRooms: { min: 0, max: 0 },
    baseCondition: 'good'
  }
]

export const AREA_PRICE_RANGES: AreaPriceRange[] = [
  {
    areaId: 'tel-aviv-center',
    areaName: 'Tel Aviv - Center',
    areaNameHe: 'תל אביב - מרכז העיר',
    city: 'תל אביב-יפו',
    neighborhood: 'מרכז העיר',
    priceRanges: {
      apartment: {
        pricePerSqmMin: 45000,
        pricePerSqmMax: 75000,
        pricePerSqmAvg: 58000,
        trend: 'rising',
        trendPercent: 4.2,
        lastUpdated: '2024-01-15',
        sampleSize: 156
      },
      penthouse: {
        pricePerSqmMin: 65000,
        pricePerSqmMax: 120000,
        pricePerSqmAvg: 85000,
        trend: 'rising',
        trendPercent: 5.8,
        lastUpdated: '2024-01-15',
        sampleSize: 42
      },
      studio: {
        pricePerSqmMin: 40000,
        pricePerSqmMax: 70000,
        pricePerSqmAvg: 52000,
        trend: 'rising',
        trendPercent: 3.5,
        lastUpdated: '2024-01-15',
        sampleSize: 89
      }
    }
  },
  {
    areaId: 'tel-aviv-north',
    areaName: 'Tel Aviv - North',
    areaNameHe: 'תל אביב - צפון',
    city: 'תל אביב-יפו',
    neighborhood: 'צפון תל אביב',
    priceRanges: {
      apartment: {
        pricePerSqmMin: 50000,
        pricePerSqmMax: 90000,
        pricePerSqmAvg: 65000,
        trend: 'rising',
        trendPercent: 5.1,
        lastUpdated: '2024-01-15',
        sampleSize: 203
      },
      penthouse: {
        pricePerSqmMin: 75000,
        pricePerSqmMax: 150000,
        pricePerSqmAvg: 98000,
        trend: 'rising',
        trendPercent: 6.5,
        lastUpdated: '2024-01-15',
        sampleSize: 67
      },
      'garden-apartment': {
        pricePerSqmMin: 55000,
        pricePerSqmMax: 95000,
        pricePerSqmAvg: 70000,
        trend: 'rising',
        trendPercent: 4.8,
        lastUpdated: '2024-01-15',
        sampleSize: 45
      }
    }
  },
  {
    areaId: 'jerusalem-center',
    areaName: 'Jerusalem - Center',
    areaNameHe: 'ירושלים - מרכז העיר',
    city: 'ירושלים',
    neighborhood: 'מרכז העיר',
    priceRanges: {
      apartment: {
        pricePerSqmMin: 28000,
        pricePerSqmMax: 48000,
        pricePerSqmAvg: 36000,
        trend: 'stable',
        trendPercent: 2.1,
        lastUpdated: '2024-01-15',
        sampleSize: 178
      },
      penthouse: {
        pricePerSqmMin: 42000,
        pricePerSqmMax: 75000,
        pricePerSqmAvg: 55000,
        trend: 'rising',
        trendPercent: 3.8,
        lastUpdated: '2024-01-15',
        sampleSize: 34
      },
      house: {
        pricePerSqmMin: 35000,
        pricePerSqmMax: 60000,
        pricePerSqmAvg: 45000,
        trend: 'rising',
        trendPercent: 4.2,
        lastUpdated: '2024-01-15',
        sampleSize: 52
      }
    }
  },
  {
    areaId: 'haifa-carmel',
    areaName: 'Haifa - Carmel',
    areaNameHe: 'חיפה - הכרמל',
    city: 'חיפה',
    neighborhood: 'הכרמל',
    priceRanges: {
      apartment: {
        pricePerSqmMin: 22000,
        pricePerSqmMax: 38000,
        pricePerSqmAvg: 28000,
        trend: 'stable',
        trendPercent: 1.8,
        lastUpdated: '2024-01-15',
        sampleSize: 142
      },
      penthouse: {
        pricePerSqmMin: 32000,
        pricePerSqmMax: 55000,
        pricePerSqmAvg: 41000,
        trend: 'rising',
        trendPercent: 2.9,
        lastUpdated: '2024-01-15',
        sampleSize: 28
      },
      'garden-apartment': {
        pricePerSqmMin: 24000,
        pricePerSqmMax: 40000,
        pricePerSqmAvg: 30000,
        trend: 'stable',
        trendPercent: 1.5,
        lastUpdated: '2024-01-15',
        sampleSize: 36
      }
    }
  },
  {
    areaId: 'beer-sheva',
    areaName: 'Beer Sheva - City Center',
    areaNameHe: 'באר שבע - מרכז העיר',
    city: 'באר שבע',
    priceRanges: {
      apartment: {
        pricePerSqmMin: 12000,
        pricePerSqmMax: 20000,
        pricePerSqmAvg: 15000,
        trend: 'rising',
        trendPercent: 3.2,
        lastUpdated: '2024-01-15',
        sampleSize: 98
      },
      house: {
        pricePerSqmMin: 14000,
        pricePerSqmMax: 24000,
        pricePerSqmAvg: 18000,
        trend: 'rising',
        trendPercent: 4.1,
        lastUpdated: '2024-01-15',
        sampleSize: 67
      },
      studio: {
        pricePerSqmMin: 10000,
        pricePerSqmMax: 18000,
        pricePerSqmAvg: 13500,
        trend: 'rising',
        trendPercent: 2.8,
        lastUpdated: '2024-01-15',
        sampleSize: 45
      }
    }
  },
  {
    areaId: 'ramat-gan',
    areaName: 'Ramat Gan',
    areaNameHe: 'רמת גן',
    city: 'רמת גן',
    priceRanges: {
      apartment: {
        pricePerSqmMin: 38000,
        pricePerSqmMax: 65000,
        pricePerSqmAvg: 48000,
        trend: 'rising',
        trendPercent: 4.5,
        lastUpdated: '2024-01-15',
        sampleSize: 187
      },
      penthouse: {
        pricePerSqmMin: 55000,
        pricePerSqmMax: 95000,
        pricePerSqmAvg: 72000,
        trend: 'rising',
        trendPercent: 5.2,
        lastUpdated: '2024-01-15',
        sampleSize: 53
      },
      duplex: {
        pricePerSqmMin: 42000,
        pricePerSqmMax: 72000,
        pricePerSqmAvg: 54000,
        trend: 'rising',
        trendPercent: 4.8,
        lastUpdated: '2024-01-15',
        sampleSize: 39
      }
    }
  },
  {
    areaId: 'netanya',
    areaName: 'Netanya - Seafront',
    areaNameHe: 'נתניה - חוף הים',
    city: 'נתניה',
    priceRanges: {
      apartment: {
        pricePerSqmMin: 24000,
        pricePerSqmMax: 42000,
        pricePerSqmAvg: 31000,
        trend: 'rising',
        trendPercent: 3.6,
        lastUpdated: '2024-01-15',
        sampleSize: 134
      },
      penthouse: {
        pricePerSqmMin: 35000,
        pricePerSqmMax: 62000,
        pricePerSqmAvg: 46000,
        trend: 'rising',
        trendPercent: 4.2,
        lastUpdated: '2024-01-15',
        sampleSize: 41
      }
    }
  },
  {
    areaId: 'herzliya-pituach',
    areaName: 'Herzliya Pituach',
    areaNameHe: 'herzliya-פיתוח',
    city: 'הרצליה',
    neighborhood: 'הרצליה פיתוח',
    priceRanges: {
      apartment: {
        pricePerSqmMin: 48000,
        pricePerSqmMax: 85000,
        pricePerSqmAvg: 62000,
        trend: 'rising',
        trendPercent: 5.5,
        lastUpdated: '2024-01-15',
        sampleSize: 112
      },
      penthouse: {
        pricePerSqmMin: 70000,
        pricePerSqmMax: 135000,
        pricePerSqmAvg: 95000,
        trend: 'rising',
        trendPercent: 6.8,
        lastUpdated: '2024-01-15',
        sampleSize: 38
      },
      house: {
        pricePerSqmMin: 55000,
        pricePerSqmMax: 95000,
        pricePerSqmAvg: 72000,
        trend: 'rising',
        trendPercent: 5.9,
        lastUpdated: '2024-01-15',
        sampleSize: 29
      }
    }
  },
  {
    areaId: 'ashdod',
    areaName: 'Ashdod - Marina',
    areaNameHe: 'אשדוד - מרינה',
    city: 'אשדוד',
    neighborhood: 'מרינה',
    priceRanges: {
      apartment: {
        pricePerSqmMin: 18000,
        pricePerSqmMax: 32000,
        pricePerSqmAvg: 23000,
        trend: 'rising',
        trendPercent: 3.8,
        lastUpdated: '2024-01-15',
        sampleSize: 156
      },
      penthouse: {
        pricePerSqmMin: 26000,
        pricePerSqmMax: 48000,
        pricePerSqmAvg: 35000,
        trend: 'rising',
        trendPercent: 4.5,
        lastUpdated: '2024-01-15',
        sampleSize: 47
      }
    }
  },
  {
    areaId: 'rehovot',
    areaName: 'Rehovot',
    areaNameHe: 'רחובות',
    city: 'רחובות',
    priceRanges: {
      apartment: {
        pricePerSqmMin: 20000,
        pricePerSqmMax: 35000,
        pricePerSqmAvg: 26000,
        trend: 'rising',
        trendPercent: 3.4,
        lastUpdated: '2024-01-15',
        sampleSize: 123
      },
      house: {
        pricePerSqmMin: 24000,
        pricePerSqmMax: 42000,
        pricePerSqmAvg: 31000,
        trend: 'rising',
        trendPercent: 4.0,
        lastUpdated: '2024-01-15',
        sampleSize: 58
      }
    }
  },
  {
    areaId: 'petah-tikva',
    areaName: 'Petah Tikva',
    areaNameHe: 'פתח תקווה',
    city: 'פתח תקווה',
    priceRanges: {
      apartment: {
        pricePerSqmMin: 28000,
        pricePerSqmMax: 48000,
        pricePerSqmAvg: 36000,
        trend: 'rising',
        trendPercent: 3.9,
        lastUpdated: '2024-01-15',
        sampleSize: 201
      },
      duplex: {
        pricePerSqmMin: 32000,
        pricePerSqmMax: 55000,
        pricePerSqmAvg: 41000,
        trend: 'rising',
        trendPercent: 4.3,
        lastUpdated: '2024-01-15',
        sampleSize: 62
      }
    }
  },
  {
    areaId: 'rishon-lezion',
    areaName: 'Rishon LeZion',
    areaNameHe: 'ראשון לציון',
    city: 'ראשון לציון',
    priceRanges: {
      apartment: {
        pricePerSqmMin: 24000,
        pricePerSqmMax: 42000,
        pricePerSqmAvg: 31000,
        trend: 'rising',
        trendPercent: 3.7,
        lastUpdated: '2024-01-15',
        sampleSize: 189
      },
      'garden-apartment': {
        pricePerSqmMin: 26000,
        pricePerSqmMax: 46000,
        pricePerSqmAvg: 34000,
        trend: 'rising',
        trendPercent: 4.1,
        lastUpdated: '2024-01-15',
        sampleSize: 71
      }
    }
  },
  {
    areaId: 'holon',
    areaName: 'Holon',
    areaNameHe: 'חולון',
    city: 'חולון',
    priceRanges: {
      apartment: {
        pricePerSqmMin: 26000,
        pricePerSqmMax: 44000,
        pricePerSqmAvg: 33000,
        trend: 'rising',
        trendPercent: 3.5,
        lastUpdated: '2024-01-15',
        sampleSize: 167
      },
      penthouse: {
        pricePerSqmMin: 38000,
        pricePerSqmMax: 65000,
        pricePerSqmAvg: 48000,
        trend: 'rising',
        trendPercent: 4.2,
        lastUpdated: '2024-01-15',
        sampleSize: 44
      }
    }
  },
  {
    areaId: 'bat-yam',
    areaName: 'Bat Yam - Seafront',
    areaNameHe: 'בת ים - חוף הים',
    city: 'בת ים',
    priceRanges: {
      apartment: {
        pricePerSqmMin: 22000,
        pricePerSqmMax: 38000,
        pricePerSqmAvg: 28000,
        trend: 'stable',
        trendPercent: 2.3,
        lastUpdated: '2024-01-15',
        sampleSize: 145
      },
      studio: {
        pricePerSqmMin: 20000,
        pricePerSqmMax: 35000,
        pricePerSqmAvg: 26000,
        trend: 'stable',
        trendPercent: 2.0,
        lastUpdated: '2024-01-15',
        sampleSize: 78
      }
    }
  },
  {
    areaId: 'kfar-saba',
    areaName: 'Kfar Saba',
    areaNameHe: 'כפר סבא',
    city: 'כפר סבא',
    priceRanges: {
      apartment: {
        pricePerSqmMin: 30000,
        pricePerSqmMax: 52000,
        pricePerSqmAvg: 39000,
        trend: 'rising',
        trendPercent: 4.1,
        lastUpdated: '2024-01-15',
        sampleSize: 134
      },
      house: {
        pricePerSqmMin: 36000,
        pricePerSqmMax: 62000,
        pricePerSqmAvg: 46000,
        trend: 'rising',
        trendPercent: 4.8,
        lastUpdated: '2024-01-15',
        sampleSize: 51
      }
    }
  },
  {
    areaId: 'raanana',
    areaName: 'Raanana',
    areaNameHe: 'רעננה',
    city: 'רעננה',
    priceRanges: {
      apartment: {
        pricePerSqmMin: 32000,
        pricePerSqmMax: 56000,
        pricePerSqmAvg: 42000,
        trend: 'rising',
        trendPercent: 4.3,
        lastUpdated: '2024-01-15',
        sampleSize: 142
      },
      house: {
        pricePerSqmMin: 38000,
        pricePerSqmMax: 68000,
        pricePerSqmAvg: 50000,
        trend: 'rising',
        trendPercent: 5.0,
        lastUpdated: '2024-01-15',
        sampleSize: 63
      }
    }
  },
  {
    areaId: 'modiin',
    areaName: 'Modiin',
    areaNameHe: 'מודיעין',
    city: 'מודיעין-מכבים-רעות',
    priceRanges: {
      apartment: {
        pricePerSqmMin: 26000,
        pricePerSqmMax: 45000,
        pricePerSqmAvg: 34000,
        trend: 'rising',
        trendPercent: 4.6,
        lastUpdated: '2024-01-15',
        sampleSize: 178
      },
      house: {
        pricePerSqmMin: 30000,
        pricePerSqmMax: 52000,
        pricePerSqmAvg: 39000,
        trend: 'rising',
        trendPercent: 5.2,
        lastUpdated: '2024-01-15',
        sampleSize: 89
      }
    }
  },
  {
    areaId: 'eilat',
    areaName: 'Eilat',
    areaNameHe: 'אילת',
    city: 'אילת',
    priceRanges: {
      apartment: {
        pricePerSqmMin: 16000,
        pricePerSqmMax: 32000,
        pricePerSqmAvg: 22000,
        trend: 'stable',
        trendPercent: 1.8,
        lastUpdated: '2024-01-15',
        sampleSize: 92
      },
      penthouse: {
        pricePerSqmMin: 24000,
        pricePerSqmMax: 48000,
        pricePerSqmAvg: 34000,
        trend: 'rising',
        trendPercent: 2.9,
        lastUpdated: '2024-01-15',
        sampleSize: 31
      }
    }
  },
  {
    areaId: 'ramla',
    areaName: 'Ramla',
    areaNameHe: 'רמלה',
    city: 'רמלה',
    priceRanges: {
      apartment: {
        pricePerSqmMin: 14000,
        pricePerSqmMax: 25000,
        pricePerSqmAvg: 18000,
        trend: 'rising',
        trendPercent: 3.1,
        lastUpdated: '2024-01-15',
        sampleSize: 108
      },
      house: {
        pricePerSqmMin: 16000,
        pricePerSqmMax: 30000,
        pricePerSqmAvg: 21000,
        trend: 'rising',
        trendPercent: 3.8,
        lastUpdated: '2024-01-15',
        sampleSize: 74
      }
    }
  },
  {
    areaId: 'lod',
    areaName: 'Lod',
    areaNameHe: 'לוד',
    city: 'לוד',
    priceRanges: {
      apartment: {
        pricePerSqmMin: 13000,
        pricePerSqmMax: 24000,
        pricePerSqmAvg: 17000,
        trend: 'rising',
        trendPercent: 3.4,
        lastUpdated: '2024-01-15',
        sampleSize: 115
      },
      house: {
        pricePerSqmMin: 15000,
        pricePerSqmMax: 28000,
        pricePerSqmAvg: 20000,
        trend: 'rising',
        trendPercent: 4.0,
        lastUpdated: '2024-01-15',
        sampleSize: 68
      }
    }
  }
]

export function getPropertyTypePreset(type: PropertyType): PropertyTypePreset | undefined {
  return PROPERTY_TYPE_PRESETS.find(preset => preset.type === type)
}

export function getAreaPriceRange(areaId: string): AreaPriceRange | undefined {
  return AREA_PRICE_RANGES.find(area => area.areaId === areaId)
}

export function getPriceRangeForProperty(
  propertyType: PropertyType,
  city: string,
  neighborhood?: string
): AreaPriceRange['priceRanges'][PropertyType] | undefined {
  const cityLower = city.toLowerCase()
  const neighborhoodLower = neighborhood?.toLowerCase()
  
  const match = AREA_PRICE_RANGES.find(area => {
    const areaCity = area.city.toLowerCase()
    const areaNeighborhood = area.neighborhood?.toLowerCase()
    
    if (neighborhoodLower && areaNeighborhood) {
      return areaCity.includes(cityLower) && areaNeighborhood.includes(neighborhoodLower)
    }
    
    return areaCity.includes(cityLower)
  })
  
  return match?.priceRanges[propertyType]
}

export function estimatePropertyValue(
  propertyType: PropertyType,
  builtArea: number,
  city: string,
  neighborhood?: string,
  _useAverage: boolean = true
): { min: number; max: number; avg: number } | null {
  const priceRange = getPriceRangeForProperty(propertyType, city, neighborhood)
  
  if (!priceRange) {
    return null
  }
  
  return {
    min: Math.round(priceRange.pricePerSqmMin * builtArea),
    max: Math.round(priceRange.pricePerSqmMax * builtArea),
    avg: Math.round(priceRange.pricePerSqmAvg * builtArea)
  }
}

export function getAllCities(): string[] {
  const cities = new Set<string>()
  AREA_PRICE_RANGES.forEach(area => cities.add(area.city))
  return Array.from(cities).sort()
}

export function getNeighborhoodsForCity(city: string): string[] {
  return AREA_PRICE_RANGES
    .filter(area => area.city === city && area.neighborhood)
    .map(area => area.neighborhood!)
    .sort()
}
