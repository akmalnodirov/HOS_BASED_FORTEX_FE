# New ELD App

Vue 3 + TypeScript + Vite loyihasi.

## Texnologiyalar

- **Vue 3** - Progressive JavaScript framework
- **TypeScript** - Type safety uchun
- **Vite** - Tez build tool
- **Pinia** - State management
- **Vue Router** - Routing
- **Axios** - HTTP requests
- **Tailwind CSS v4** - Styling
- **shadcn-vue** - UI komponentlar
- **ESLint** - Code quality
- **Prettier** - Code formatting

## Loyihani ishga tushirish

### Dependencylarni o'rnatish

```bash
pnpm install
```

### Development server

```bash
pnpm dev
```

### Production build

```bash
pnpm build
```

### Build natijasini ko'rish

```bash
pnpm preview
```

### Linting

```bash
pnpm lint
pnpm lint:fix
```

### Formatting

```bash
pnpm format
```

## Loyiha strukturasi

```
src/
├── api/           # API konfiguratsiyasi (axios)
├── components/    # Vue komponentlar
│   └── ui/        # shadcn-vue UI komponentlar
├── lib/           # Utility funksiyalar
├── router/        # Vue Router konfiguratsiyasi
├── stores/        # Pinia store'lar
├── views/         # Sahifalar
├── App.vue        # Asosiy component
├── main.ts        # Entry point
└── style.css      # Global CSS (Tailwind)
```

## Muhim fayllar

- `vite.config.ts` - Vite konfiguratsiyasi
- `tailwind.config.js` - Tailwind CSS konfiguratsiyasi
- `postcss.config.js` - PostCSS konfiguratsiyasi
- `eslint.config.js` - ESLint konfiguratsiyasi
- `.prettierrc` - Prettier konfiguratsiyasi
- `components.json` - shadcn-vue konfiguratsiyasi
- `.env.example` - Environment variables namunasi

## shadcn-vue komponentlarni qo'shish

shadcn-vue komponentlarini qo'shish uchun:

```bash
pnpm dlx shadcn-vue@latest add button
```

## Environment Variables

`.env` fayl yarating va quyidagilarni qo'shing:

```
VITE_API_BASE_URL=https://api.example.com
```