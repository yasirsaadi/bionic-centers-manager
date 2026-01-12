## Packages
recharts | For financial visualization charts
date-fns | For date formatting (Arabic locale needed)
framer-motion | For smooth page transitions and UI animations

## Notes
Tailwind Config - extend fontFamily:
fontFamily: {
  display: ["'Almarai'", "sans-serif"],
  body: ["'Tajawal'", "sans-serif"],
}
File uploads use standard FormData to /api/documents
RTL support is mandatory - all layouts must be dir="rtl"
