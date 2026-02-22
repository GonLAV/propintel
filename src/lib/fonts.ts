export interface FontOption {
  value: string
  name: string
  family: string
  description: string
  category: 'serif' | 'sans-serif' | 'monospace'
}

export const professionalFonts: FontOption[] = [
  {
    value: 'Merriweather',
    name: 'Merriweather',
    family: '"Merriweather", Georgia, serif',
    description: 'Professional • Highly Readable • Editorial',
    category: 'serif'
  },
  {
    value: 'Playfair Display',
    name: 'Playfair Display',
    family: '"Playfair Display", Georgia, serif',
    description: 'Luxurious • Distinctive • High-Contrast',
    category: 'serif'
  },
  {
    value: 'Lora',
    name: 'Lora',
    family: '"Lora", Georgia, serif',
    description: 'Contemporary • Calligraphic • Balanced',
    category: 'serif'
  },
  {
    value: 'EB Garamond',
    name: 'EB Garamond',
    family: '"EB Garamond", Garamond, serif',
    description: 'Classic • Scholarly • Renaissance',
    category: 'serif'
  },
  {
    value: 'Crimson Text',
    name: 'Crimson Text',
    family: '"Crimson Text", Georgia, serif',
    description: 'Book-style • Academic • Traditional',
    category: 'serif'
  },
  {
    value: 'Libre Baskerville',
    name: 'Libre Baskerville',
    family: '"Libre Baskerville", Georgia, serif',
    description: 'Refined • Crisp • Text-optimized',
    category: 'serif'
  },
  {
    value: 'Source Serif 4',
    name: 'Source Serif 4',
    family: '"Source Serif 4", Georgia, serif',
    description: 'Modern • Versatile • Adobe',
    category: 'serif'
  },
  {
    value: 'IBM Plex Serif',
    name: 'IBM Plex Serif',
    family: '"IBM Plex Serif", Georgia, serif',
    description: 'Corporate • Technical • Precise',
    category: 'serif'
  },
  {
    value: 'Roboto Slab',
    name: 'Roboto Slab',
    family: '"Roboto Slab", Georgia, serif',
    description: 'Friendly • Geometric • Contemporary',
    category: 'serif'
  },
  {
    value: 'PT Serif',
    name: 'PT Serif',
    family: '"PT Serif", Georgia, serif',
    description: 'Universal • Neutral • Multi-purpose',
    category: 'serif'
  },
  {
    value: 'Bitter',
    name: 'Bitter',
    family: '"Bitter", Georgia, serif',
    description: 'Strong • Readable • Screen-optimized',
    category: 'serif'
  },
  {
    value: 'Cormorant',
    name: 'Cormorant',
    family: '"Cormorant", Georgia, serif',
    description: 'Display • Elegant • High-Fashion',
    category: 'serif'
  },
  {
    value: 'Inter',
    name: 'Inter',
    family: '"Inter", -apple-system, sans-serif',
    description: 'UI-optimized • Tech • Highly Legible',
    category: 'sans-serif'
  },
  {
    value: 'Source Sans 3',
    name: 'Source Sans 3',
    family: '"Source Sans 3", Arial, sans-serif',
    description: 'Clean • Humanist • Adobe',
    category: 'sans-serif'
  },
  {
    value: 'IBM Plex Sans',
    name: 'IBM Plex Sans',
    family: '"IBM Plex Sans", Arial, sans-serif',
    description: 'Institutional • Neutral • Corporate',
    category: 'sans-serif'
  },
  {
    value: 'Fira Sans',
    name: 'Fira Sans',
    family: '"Fira Sans", Arial, sans-serif',
    description: 'Mozilla • Open • Functional',
    category: 'sans-serif'
  },
  {
    value: 'Work Sans',
    name: 'Work Sans',
    family: '"Work Sans", Arial, sans-serif',
    description: 'Workhorse • Versatile • Minimal',
    category: 'sans-serif'
  },
  {
    value: 'Nunito Sans',
    name: 'Nunito Sans',
    family: '"Nunito Sans", Arial, sans-serif',
    description: 'Rounded • Friendly • Approachable',
    category: 'sans-serif'
  },
  {
    value: 'Montserrat',
    name: 'Montserrat',
    family: '"Montserrat", Arial, sans-serif',
    description: 'Geometric • Urban • Bold',
    category: 'sans-serif'
  },
  {
    value: 'Open Sans',
    name: 'Open Sans',
    family: '"Open Sans", Arial, sans-serif',
    description: 'Neutral • Humanist • Universal',
    category: 'sans-serif'
  },
  {
    value: 'Raleway',
    name: 'Raleway',
    family: '"Raleway", Arial, sans-serif',
    description: 'Elegant • Thin • Sophisticated',
    category: 'sans-serif'
  },
  {
    value: 'PT Sans',
    name: 'PT Sans',
    family: '"PT Sans", Arial, sans-serif',
    description: 'Neutral • Clear • Multi-purpose',
    category: 'sans-serif'
  },
  {
    value: 'Karla',
    name: 'Karla',
    family: '"Karla", Arial, sans-serif',
    description: 'Grotesque • Simple • Readable',
    category: 'sans-serif'
  },
  {
    value: 'Helvetica',
    name: 'Helvetica',
    family: 'Helvetica, Arial, sans-serif',
    description: 'Classic • Professional • Clean',
    category: 'sans-serif'
  },
  {
    value: 'Arial',
    name: 'Arial',
    family: 'Arial, sans-serif',
    description: 'Universal • Simple • Readable',
    category: 'sans-serif'
  },
  {
    value: 'Verdana',
    name: 'Verdana',
    family: 'Verdana, sans-serif',
    description: 'Screen-optimized • Clear • Modern',
    category: 'sans-serif'
  },
  {
    value: 'Trebuchet',
    name: 'Trebuchet MS',
    family: 'Trebuchet MS, sans-serif',
    description: 'Friendly • Contemporary • Rounded',
    category: 'sans-serif'
  },
  {
    value: 'Calibri',
    name: 'Calibri',
    family: 'Calibri, sans-serif',
    description: 'Modern • Office • Approachable',
    category: 'sans-serif'
  },
  {
    value: 'Times',
    name: 'Times New Roman',
    family: 'Times New Roman, Times, serif',
    description: 'Traditional • Formal • Legal',
    category: 'serif'
  },
  {
    value: 'Georgia',
    name: 'Georgia',
    family: 'Georgia, serif',
    description: 'Elegant • Readable • Scholarly',
    category: 'serif'
  },
  {
    value: 'Cambria',
    name: 'Cambria',
    family: 'Cambria, serif',
    description: 'Robust • Authoritative • Professional',
    category: 'serif'
  },
  {
    value: 'Book Antiqua',
    name: 'Book Antiqua',
    family: 'Book Antiqua, serif',
    description: 'Vintage • Distinguished • Formal',
    category: 'serif'
  },
  {
    value: 'Palatino',
    name: 'Palatino',
    family: 'Palatino, serif',
    description: 'Elegant • Classic • Refined',
    category: 'serif'
  },
  {
    value: 'Garamond',
    name: 'Garamond',
    family: 'Garamond, serif',
    description: 'Graceful • Literary • Timeless',
    category: 'serif'
  },
  {
    value: 'JetBrains Mono',
    name: 'JetBrains Mono',
    family: '"JetBrains Mono", "Courier New", monospace',
    description: 'Developer • Code • Monospace',
    category: 'monospace'
  },
  {
    value: 'Courier',
    name: 'Courier New',
    family: 'Courier New, Courier, monospace',
    description: 'Monospace • Technical • Precise',
    category: 'monospace'
  }
]

export const getFontsByCategory = () => {
  return {
    'Google Fonts - Serif': professionalFonts.filter(f => 
      f.category === 'serif' && 
      !['Times', 'Georgia', 'Cambria', 'Book Antiqua', 'Palatino', 'Garamond'].includes(f.value)
    ),
    'Google Fonts - Sans Serif': professionalFonts.filter(f => 
      f.category === 'sans-serif' && 
      !['Helvetica', 'Arial', 'Verdana', 'Trebuchet', 'Calibri'].includes(f.value)
    ),
    'System Fonts - Serif': professionalFonts.filter(f => 
      f.category === 'serif' && 
      ['Times', 'Georgia', 'Cambria', 'Book Antiqua', 'Palatino', 'Garamond'].includes(f.value)
    ),
    'System Fonts - Sans Serif': professionalFonts.filter(f => 
      f.category === 'sans-serif' && 
      ['Helvetica', 'Arial', 'Verdana', 'Trebuchet', 'Calibri'].includes(f.value)
    ),
    'Monospace': professionalFonts.filter(f => f.category === 'monospace')
  }
}

export const getFontFamily = (fontValue: string): string => {
  const font = professionalFonts.find(f => f.value === fontValue)
  return font ? font.family : fontValue
}
