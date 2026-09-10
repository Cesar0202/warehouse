# warehouse

Sistema de Homologación de Pedidos Técnicos, Control de Inventario y Normalización de Jergas Industriales con IA (Google Gemini).

## 🚀 Características
- **Normalización de Jergas:** Procesa texto plano desde WhatsApp/correo y homologa términos coloquiales contra el catálogo maestro de inventario.
- **Agente IA (Gemini):** Descifra automáticamente modismos no registrados y sugiere códigos oficiales del catálogo.
- **Catálogo & Control de Stock:** Búsqueda difusa (Fuzzy search), edición en vivo de existencias y ubicaciones de almacén.
- **Diccionario de Alias:** Gestión de equivalencias y modismos de campo con importación/exportación JSON.
- **Exportación Personalizada:** Descarga a Excel (.xlsx) y CSV con columnas, cabeceras y filtros configurables.
- **Impresión de Vales:** Formato limpio en blanco y negro optimizado para despacho en almacén.

## 🛠️ Tecnologías
- React 18 + TypeScript + Vite
- Tailwind CSS (Diseño Formal Monocromático)
- Fuse.js (Búsqueda difusa)
- SheetJS (xlsx)
- Google Gemini API

## 💻 Instalación y Uso

1. Clonar el repositorio:
```bash
git clone https://github.com/Cesar0202/warehouse.git
cd warehouse
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno (`.env`):
```env
VITE_GEMINI_API_KEY=tu_clave_de_gemini
```

4. Iniciar servidor de desarrollo:
```bash
npm run dev
```
