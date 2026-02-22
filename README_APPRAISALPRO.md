# AppraisalPro - Real Estate Valuation Platform 🇮🇱

**מערכת שמאות נדל"ן מקצועית עם חיבור ממשלתי ארצי**

A professional real estate appraisal platform with connections to Israeli government databases for accurate property valuations across the entire country.

---

## 🚀 Key Features

### ✅ National Data Coverage (NEW!)
- **40+ Cities** across Israel - Tel Aviv, Jerusalem, Haifa, Be'er Sheva, and more
- **6 Districts** - Complete national coverage
- **3 Government Data Sources** - Nadlan.gov.il, Data.gov.il, CBS
- **Real Market Transactions** - Verified government data
- **National Statistics** - Market analysis by city, district, and property type

### 📊 Professional Calculators
- **Office Valuation** - Commercial office space appraisals
- **Residential Valuation** - Apartments and houses
- **Commercial Valuation** - Retail and commercial properties
- **Land Valuation** - Plots and development land
- **Rental Yield Analysis** - Income approach valuations
- **Betterment Levy** - Tax calculations

### 🔗 Government API Integration
- **Nadlan.gov.il** - Official real estate transaction database
- **Data.gov.il** - Open government data portal
- **CBS** - Central Bureau of Statistics
- **iPlan** - Urban planning data
- **Tabu** - Land registry information

### 📈 Advanced Features
- **Client Portal** - Client-facing dashboards
- **Team Collaboration** - Multi-user support
- **Case Management** - Property case tracking
- **Automated Reports** - PDF generation
- **AI Insights** - Market analysis with LLM
- **Transaction Import** - Bulk data import

---

## 🇮🇱 מהפכה בנתוני הנדל"ן

**לא עוד רק תל אביב - כל הארץ!**

### מה חדש?
✅ גישה לכל הערים והמחוזות בישראל  
✅ נתונים ממקורות ממשלתיים מאומתים  
✅ סטטיסטיקות ארציות ופילוח מפורט  
✅ חיפוש מתקדם לפי עיר, מחוז, וסוג נכס  

📖 **ראה:** [NATIONAL_DATA_INTEGRATION.md](./NATIONAL_DATA_INTEGRATION.md) למדריך מלא

---

## 🛠️ Quick Start

### Installation
```bash
npm install
npm run dev
```

### Using National Data
1. Navigate to any calculator (Office, Residential, Commercial, Land)
2. Go to "Comparable Transactions" tab
3. Select district and/or city (or leave empty for national search)
4. Click "שלוף מכל הארץ" (Fetch from all over Israel)
5. Get transactions with statistics from across the country

---

## 📚 Documentation

- [**NATIONAL_DATA_INTEGRATION.md**](./NATIONAL_DATA_INTEGRATION.md) - National data system guide ⭐ **NEW!**
- [PRD.md](./PRD.md) - Product requirements document
- [QUICK_START.md](./QUICK_START.md) - Getting started guide
- [REAL_API_INTEGRATION_GUIDE.md](./REAL_API_INTEGRATION_GUIDE.md) - API integration details
- [PROFESSIONAL_CALCULATORS_GUIDE.md](./PROFESSIONAL_CALCULATORS_GUIDE.md) - Calculator usage
- [RENTAL_YIELD_ANALYSIS_GUIDE.md](./RENTAL_YIELD_ANALYSIS_GUIDE.md) - Rental analysis

---

## 🏗️ Architecture

```
src/
├── components/          # React components
│   ├── OfficeValuationCalculator.tsx      # Office appraisals
│   ├── ResidentialValuationCalculator.tsx # Residential appraisals
│   ├── CommercialValuationCalculator.tsx  # Commercial appraisals
│   ├── LandValuationCalculator.tsx        # Land appraisals
│   └── ...
├── lib/
│   ├── realIsraeliGovDataAPI.ts     # 🆕 National data API (40+ cities)
│   ├── nadlanGovAPI.ts              # Nadlan.gov.il integration
│   ├── israelGovAPI.ts              # Government data sources
│   ├── marketDataSync.ts            # Market data synchronization
│   └── calculators/                 # Valuation engines
└── hooks/
    └── use-kv.ts                    # Persistent state management
```

---

## 💻 Technology Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS + shadcn/ui components
- **State:** React hooks + @github/spark KV store
- **Charts:** Recharts + D3.js
- **PDF:** jsPDF
- **Icons:** Phosphor Icons
- **API:** Fetch API with government endpoints

---

## 🌍 Supported Cities (40+)

### Tel Aviv District
Tel Aviv-Yafo, Ramat Gan, Givatayim, Herzliya, Ramat HaSharon, Bnei Brak, Bat Yam, Holon

### Central District  
Petah Tikva, Rishon LeZion, Rehovot, Raanana, Hod HaSharon, Kfar Saba, Ness Ziona, Yavne, Lod, Ramla, Modiin, Netanya

### Jerusalem District
Jerusalem, Beit Shemesh, Modiin Illit, Betar Illit

### Haifa District
Haifa, Nesher, Kiryat Ata, Kiryat Bialik, Kiryat Motzkin, Hadera

### Northern District
Nahariya, Acre, Karmiel, Nazareth, Tiberias, Safed

### Southern District
Be'er Sheva, Ashdod, Ashkelon, Eilat

---

## 📊 Market Statistics Available

- Average price per sqm by city
- Median prices by district
- Price trends (3, 6, 12 months)
- Transaction volume changes
- Property type breakdown
- Geographic distribution

---

## 🔐 Data Sources

All data comes from official Israeli government sources:
- ✅ Nadlan.gov.il - Official real estate database
- ✅ Data.gov.il - Open government data
- ✅ CBS - Central Bureau of Statistics
- ✅ Land Registry (Tabu)
- ✅ Urban Planning (iPlan)

---

## 📄 License

See [LICENSE](./LICENSE) for details.

---

## 🤝 Support

For issues or questions:
1. Check the console logs for details
2. Review the documentation files
3. Ensure search criteria isn't too narrow
4. Try broader searches

---

**Built with ❤️ for Israeli real estate professionals**
