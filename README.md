# MMD Viewer

A lightweight web-based MMD (MikuMikuDance) viewer built with Three.js, Vite, and TypeScript, paired with Python utilities for PMX inspection and local/tunneled development.

## Overview

The viewer loads `.pmx` models and `.vmd` animations in the browser, supports optional `ammo.js` physics integration, provides a collapsible UI panel (collapsed by default) for toggling visibility of model parts/materials and physics settings, and includes helper scripts for inspecting PMX structures and exposing the dev server over `ngrok`.

## Assets (Models & Animations)

Files inside `public/` are served from the site root (`/`):

* **Models (`.pmx`):** Place your `.pmx` file in `public/models/model.pmx`) along with any referenced texture folders (`Textures/`, `Toon/`, etc.).
* **Animations (`.vmd`):** Place your `.vmd` file in `public/animations/run.vmd`).

To use another file, move it into `public/` and update the path passed to `loader.load` or `loader.loadAnimation` in `src/main.ts`.

## Project Structure

- `index.html` — Vite entry page.
- `src/main.ts` — scene, renderer, model loading, animation loop, and UI wiring.
- `src/config.ts` — feature flags, spring presets, and preset labels.
- `src/breastSpring.ts` — breast spring controller and non-accumulating pose handling.
- `src/ammo.ts` — Ammo.js loader.
- `src/lighting.ts` — reduced-intensity scene lighting.
- `src/viewerUI.ts` — collapsible settings panel and FPS control.
- `src/viewerStyles.ts` — viewer panel and FPS counter styles.
- `src/modelTree.ts` — model object/material visibility tree.

## Getting Started

### Web App

```bash
npm install
npm run dev
