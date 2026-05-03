<div style="display: flex; align-items: center; gap: 20px">
    <img width="50" src="./public/logo.svg" alt="logo">
    <h2>React Template</h2>
</div>

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white&style=for-the-badge)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white&style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white&style=for-the-badge)
![Redux Toolkit](https://img.shields.io/badge/Redux%20Toolkit-%20-764ABC?logo=redux&logoColor=white&style=for-the-badge)
![i18next](https://img.shields.io/badge/i18next-🌍-26A69A?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

A base template for quickly starting a new project with **React 19**, **TypeScript**, and **Vite**.  
The template already includes routing, state management, localization, and ready-to-use UI components.  

---

## Tech Stack
- **React 19**
- **Vite 6**
- **TypeScript 5**
- **Redux Toolkit**
- **i18next** (localization)
- **React Router DOM**
- **React Hot Toast** (notifications)
- **SCSS modules**
- **ESLint + TS ESLint + plugins**

<p>
  <a href="docs/README_ESLINT.md">
    <img src="https://img.shields.io/badge/ESLint_Config-README-blue?style=for-the-badge&logo=eslint" alt="ESLint Config Documentation"/>
  </a>
</p>

---

## Ready-to-use Components
<p>
  <a href="docs/README_UI.md">
    <img
      src="https://img.shields.io/badge/UI_Docs-README-red?style=for-the-badge&logo=storybook"
      alt="UI Components Documentation"
    />
  </a>
</p>

---

## Architecture
### The project is built using the **Feature-Sliced Design (FSD)** methodology with an adapted structure:

[![App](https://img.shields.io/badge/App-0A66C2?style=for-the-badge)](src/app/README.md) 
— entry point, application initialization (routing, store, providers, configs).

[![Pages](https://img.shields.io/badge/Pages-0A66C2?style=for-the-badge)](src/pages/README.md) 
— pages (routes), assemble the UI from `widgets`, `features`, and `entities`.

[![Widgets](https://img.shields.io/badge/Widgets-0A66C2?style=for-the-badge)](src/widgets/README.md) 
— large UI blocks, composite interface elements (e.g., `Navbar`, `Sidebar`).

[![Features](https://img.shields.io/badge/Features-0A66C2?style=for-the-badge)](src/features/README.md) 
— user scenarios, complete features with logic and UI (e.g., login).

[![Entities](https://img.shields.io/badge/Entities-0A66C2?style=for-the-badge)](src/entities/README.md) 
— business entities: data, slice, types, simple UI (e.g., `User`, `Product`, `Question`).

[![Shared](https://img.shields.io/badge/Shared-0A66C2?style=for-the-badge)](src/shared/README.md) 
— reusable resources: UI components, utilities, styles, constants, types, hooks.

### Node.js - `v22+`

![mainPage-en.png](docs/assets/mainPage-en.png)

---
# RU Version

Базовый шаблон для быстрого старта нового проекта на **React 19** с поддержкой **TypeScript** и **Vite**.  
Шаблон уже включает роутинг, стейт-менеджмент, локализацию и готовые UI-компоненты.  

---

## Стек технологий
- **React 19**
- **Vite 6**
- **TypeScript 5**
- **Redux Toolkit**
- **i18next** (локализация)
- **React Router DOM**
- **React Hot Toast** (уведомления)
- **SCSS-модули**
- **ESLint + TS ESLint + плагины**

<p>
  <a href="docs/README_ESLINT.md">
    <img src="https://img.shields.io/badge/ESLint_Config-README-blue?style=for-the-badge&logo=eslint" alt="ESLint Config Documentation"/>
  </a>
</p>

---

<p>
  <a href="docs/README_UI.md">
    <img
      src="https://img.shields.io/badge/UI_Документация-README-red?style=for-the-badge&logo=storybook"
      alt="UI Components Documentation"
    />
  </a>
</p>

---

## Архитектура
### Проект построен по методологии Feature-Sliced Design (FSD) с адаптированной структурой:


[![App](https://img.shields.io/badge/App-0A66C2?style=for-the-badge)](src/app/README.md) 
— точка входа, инициализация приложения (роутинг, стор, провайдеры, конфиги).

[![Pages](https://img.shields.io/badge/Pages-0A66C2?style=for-the-badge)](src/pages/README.md) 
— страницы (роуты), собирают UI из `widgets`, `features` и `entities`.

[![Widgets](https://img.shields.io/badge/Widgets-0A66C2?style=for-the-badge)](src/widgets/README.md) 
— крупные UI-блоки, составные элементы интерфейса (например, `Navbar`, `Sidebar`).

[![Features](https://img.shields.io/badge/Features-0A66C2?style=for-the-badge)](src/features/README.md) 
— пользовательские сценарии, готовые фичи с логикой и UI (например, авторизация).

[![Entities](https://img.shields.io/badge/Entities-0A66C2?style=for-the-badge)](src/entities/README.md) 
— бизнес-сущности: данные, slice, типы, простые UI-компоненты (например, `User`, `Product`, `Question`).

[![Shared](https://img.shields.io/badge/Shared-0A66C2?style=for-the-badge)](src/shared/README.md) 
— переиспользуемые ресурсы: UI-компоненты, утилиты, стили, константы, типы, хуки.

---

### Node.js - `v22+`

![mainPage-ru.png](docs/assets/mainPage-ru.png)