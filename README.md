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

* `src/main.ts` & `src/index.html` — Main TypeScript entry point, Three.js scene/renderer setup, animation loop, and collapsible viewer UI
* `public/` — Static assets including `.pmx` models, `.vmd` animations, textures, and `ammo` runtime files
* `inspect_pmx_physics.py` & `PMX-Scripting-Tools/` — Python utilities for inspecting and editing PMX files
* `run_server.py` — Starts the Vite dev server and manages an `ngrok` tunnel using settings from `.env`
* `vite.config.ts` & `tsconfig.json` — Vite and TypeScript configuration

## Getting Started

### Web App

```bash
npm install
npm run dev
