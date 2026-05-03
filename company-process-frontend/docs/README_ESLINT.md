# ESLint Config

This project uses a **strict ESLint configuration** with support for **React + TypeScript + Feature-Sliced Design (FSD)**.  
The goal is a unified code style, architectural integrity, and quality control.

## Import Rules

- pages → can import from widgets, features, entities, shared.

- widgets → can import from features, entities, shared.

- features → can import from entities, shared.

- entities → can only import from shared.

- shared → can import itself (and sometimes app, if hooks need to be passed).

- app → the top layer, has access to all.

**Any other import direction will be considered an error.**

These rules are enforced via [`eslint-plugin-boundaries`](https://www.npmjs.com/package/eslint-plugin-boundaries).

---

## Used Plugins

- **[@typescript-eslint](https://typescript-eslint.io/)** → TypeScript support
- **[eslint-plugin-react](https://www.npmjs.com/package/eslint-plugin-react)** → React rules
- **[eslint-plugin-react-hooks](https://www.npmjs.com/package/eslint-plugin-react-hooks)** → hook control
- **[eslint-plugin-react-perf](https://github.com/cvazac/eslint-plugin-react-perf)** → performance optimization rules
- **[eslint-plugin-import](https://www.npmjs.com/package/eslint-plugin-import)** → import control
- **[eslint-plugin-simple-import-sort](https://www.npmjs.com/package/eslint-plugin-simple-import-sort)** → import sorting
- **[eslint-plugin-unused-imports](https://www.npmjs.com/package/eslint-plugin-unused-imports)** → removal of unused imports/variables
- **[eslint-plugin-jsx-a11y](https://www.npmjs.com/package/eslint-plugin-jsx-a11y)** → JSX accessibility
- **[eslint-plugin-optimize-regex](https://github.com/BrainMaestro/eslint-plugin-optimize-regex)** → RegExp optimization
- **[eslint-plugin-i18next](https://www.npmjs.com/package/eslint-plugin-i18next)** → control of non-localized strings
- **[eslint-plugin-boundaries](https://www.npmjs.com/package/eslint-plugin-boundaries)** → architecture control

---

## Code Style

- Quotes → `'single'`
- Semicolons → required
- Indentation → `tab`
- Maximum line length → `120` characters
- JSX → always `"double quotes"`
- React components → written as `arrow-function`
- Interfaces/classes → `PascalCase`
- Variables/functions → `camelCase` / `UPPER_CASE` (constants)

---

## Imports

- All imports are automatically sorted (`simple-import-sort`)
- Unused imports are removed (`unused-imports`)
- File extensions `.js`, `.ts`, `.tsx` should **not** be written

---

## React Rules
`react-hooks/rules-of-hooks` → hooks only in components/custom hooks

`react-hooks/exhaustive-deps` → checks useEffect dependencies

`react-perf/jsx-no-new-object-as-prop` → do not pass a new object directly as a prop

`react-perf/jsx-no-new-function-as-prop` → do not pass an anonymous function directly

---

## Localization (i18next)
`i18next/no-literal-string` → protection against non-localized strings

---

## Accessibility (A11y)
Checks via `eslint-plugin-jsx-a11y`

Some strict rules are disabled (e.g., `control-has-associated-label`)

---
# ESLint Config

Этот проект использует **строгую конфигурацию ESLint** с поддержкой **React + TypeScript + Feature-Sliced Design (FSD)**.  
Цель — единый стиль кода, архитектурная целостность и контроль качества.

## Правила импортов

- pages → можно импортировать из widgets, features, entities, shared.

- widgets → можно импортировать из features, entities, shared.

- features → можно импортировать из entities, shared.

- entities → можно импортировать только из shared.

- shared → может импортировать сам себя (и иногда app, если нужно пробросить хуки).

- app → верхний слой, доступ ко всем.

**Любое другое направление импорта будет ошибкой.**

Эти правила проверяются через [`eslint-plugin-boundaries`](https://www.npmjs.com/package/eslint-plugin-boundaries).

---

## Используемые плагины

- **[@typescript-eslint](https://typescript-eslint.io/)** → поддержка TypeScript
- **[eslint-plugin-react](https://www.npmjs.com/package/eslint-plugin-react)** → правила для React
- **[eslint-plugin-react-hooks](https://www.npmjs.com/package/eslint-plugin-react-hooks)** → контроль хуков
- **[eslint-plugin-react-perf](https://github.com/cvazac/eslint-plugin-react-perf)** → правила для оптимизации производительности
- **[eslint-plugin-import](https://www.npmjs.com/package/eslint-plugin-import)** → контроль импортов
- **[eslint-plugin-simple-import-sort](https://www.npmjs.com/package/eslint-plugin-simple-import-sort)** → сортировка импортов
- **[eslint-plugin-unused-imports](https://www.npmjs.com/package/eslint-plugin-unused-imports)** → удаление неиспользуемых импортов/переменных
- **[eslint-plugin-jsx-a11y](https://www.npmjs.com/package/eslint-plugin-jsx-a11y)** → доступность JSX
- **[eslint-plugin-optimize-regex](https://github.com/BrainMaestro/eslint-plugin-optimize-regex)** → оптимизация RegExp
- **[eslint-plugin-i18next](https://www.npmjs.com/package/eslint-plugin-i18next)** → контроль строк без локализации
- **[eslint-plugin-boundaries](https://www.npmjs.com/package/eslint-plugin-boundaries)** → контроль архитектуры

---

## Кодстайл

- Кавычки → `'single'`
- Точка с запятой → обязательна
- Отступы → `tab`
- Максимальная длина строки → `120` символов
- JSX → всегда `"double quotes"`
- React-компоненты → пишем как `arrow-function`
- Интерфейсы/классы → `PascalCase`
- Переменные/функции → `camelCase` / `UPPER_CASE` (константы)

---

## Импорты

- Все импорты сортируются автоматически (`simple-import-sort`)
- Неиспользуемые импорты удаляются (`unused-imports`)
- Расширения `.js`, `.ts`, `.tsx` писать **не нужно**  

---

## React-правила
`react-hooks/rules-of-hooks` → хуки только в компонентах/кастомных хуках

`react-hooks/exhaustive-deps` → проверка зависимостей useEffect

`react-perf/jsx-no-new-object-as-prop` → нельзя передавать новый объект напрямую в проп

`react-perf/jsx-no-new-function-as-prop` → нельзя передавать анонимную функцию

## Локализация (i18next)
`i18next/no-literal-string` → защита от строк без локализации

## Доступность (A11y)
Проверки через `eslint-plugin-jsx-a11y`

Некоторые строгие правила отключены (например, `control-has-associated-label`)

