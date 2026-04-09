# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Data Source Architecture

The frontend uses a service contract so screens do not import mock files directly.

- Service contract: `src/app/services/contracts.ts`
- Runtime selector: `src/app/services/index.ts`
- Mock adapter: `src/app/services/adapters/mockDataService.ts`
- HTTP adapter: `src/app/services/adapters/http/httpDataService.ts`
- HTTP helper: `src/app/services/adapters/http/httpClient.ts`

Pages should import `dataService` from `src/app/services` and call methods from there.
This keeps UI code stable while backend APIs evolve.

## Environment Switch

Use `.env.example` as the reference:

- `VITE_DATA_SOURCE=mock` uses local mock APIs in `src/app/api`.
- `VITE_DATA_SOURCE=api` uses backend HTTP calls.
- `VITE_API_BASE_URL` sets backend origin for `api` mode.

## Backend Endpoint Contract (Current)

These are the HTTP adapter defaults and can be changed in one place if backend routes differ.

- `POST /auth/login` with body `{ email, password }`
- `GET /calendar/events?year=YYYY&monthIndex=0-11&month=1-12`
- `GET /calendar/day-timeline?date=YYYY-MM-DD`
- `GET /calendar/day-hints?date=YYYY-MM-DD&startTime=HH:MM&endTime=HH:MM&durationMinutes=N`
- `POST /calendar/day-events` with body `{ date, title, startTime, endTime?, description?, status? }`
- `PATCH /calendar/day-events/:eventId` with body `{ date, ...partialUpdates }`
- `DELETE /calendar/day-events/:eventId?date=YYYY-MM-DD`

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
