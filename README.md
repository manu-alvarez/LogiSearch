# LogiSearch AI

**Buscador logístico inteligente con IA** — Rutas nacionales e internacionales, costos, regulaciones y documentación en tiempo real.

## 🚀 Características

- **Búsqueda inteligente** — Describe tu envío en lenguaje natural y obtén análisis completo
- **Nacional e internacional** — Soporte para envíos locales, europeos y globales
- **Costos en tiempo real** — Estimaciones basadas en datos de mercado actuales
- **Comparación de carriers** — Ranking de transportistas con ratings y precios
- **Regulaciones y compliance** — Documentación requerida, normativa aplicable, riesgos
- **Calculadora de costos** — Herramienta interactiva con recargos reales (BAF, THC, seguros)
- **RFQ profesional** — Generación de solicitudes de cotización normativas (Incoterms® 2020)
- **Exportación PDF** — Descarga documentos en formato A4 profesional
- **Historial de búsquedas** — Consulta y reutiliza búsquedas anteriores

## 🛠 Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 19 + TypeScript |
| **Build** | Vite 7 |
| **UI Framework** | Material UI v7 (Material Design 3) |
| **Animations** | Framer Motion 12 |
| **IA** | Google Gemini 2.0 Flash |
| **Búsqueda web** | Tavily API |
| **Base de datos** | Supabase (PostgreSQL) |
| **PDF** | jsPDF |

## 📦 Instalación

```bash
# Clonar el repositorio
git clone <url-del-repo>
cd BUSCADOR

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus API keys
```

## ⚙️ Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
VITE_TAVILY_API_KEY=tu-tavily-key
VITE_GEMINI_API_KEY=tu-gemini-key
```

> ⚠️ **Nunca** incluyas la service key de Supabase en el frontend.

## 🚀 Desarrollo

```bash
# Servidor de desarrollo
npm run dev

# Verificar tipos
npx tsc --noEmit

# Build de producción
npm run build
```

## 📁 Estructura del Proyecto

```
src/
├── App.tsx                    # Componente principal
├── main.tsx                   # Entry point con ThemeProvider
├── theme.ts                   # Tema Material Design 3
├── index.css                  # Estilos globales mínimos
├── components/
│   ├── ResultsView.tsx        # Vista de resultados completa
│   ├── RfqDialog.tsx          # Dialog RFQ con export PDF
│   ├── SearchHistory.tsx      # Drawer de historial
│   └── CostCalculator.tsx     # Calculadora interactiva de costos
├── services/
│   ├── gemini.ts              # Servicio IA (Gemini 2.0 Flash)
│   └── tavily.ts              # Servicio de búsqueda web
├── lib/
│   └── supabase.ts            # Cliente Supabase + tipos
└── utils/
    └── pdfExport.ts           # Generación de PDF profesional
```

## 🔒 Seguridad

- API keys en variables de entorno (`import.meta.env.VITE_*`)
- Sin service keys en el frontend
- Supabase Row Level Security (RLS)
- Sin datos sensibles en el código fuente

## 📋 Normativa Soportada

- **Incoterms® 2020** (ICC)
- **Convenio CMR** (transporte terrestre)
- **Reglas de La Haya-Visby** (transporte marítimo)
- **Convenio de Montreal** (transporte aéreo)
- **ADR** (mercancías peligrosas por carretera)
- **IMDG** (mercancías peligrosas por mar)
- **Regulaciones aduaneras EU**
- **Normativa nacional de transporte**

## 📄 Licencia

Proyecto privado — Todos los derechos reservados © 2026
