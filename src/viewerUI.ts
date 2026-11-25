import * as THREE from 'three';
import {
  BREAST_SPRING_PRESETS,
  PRESET_DESCRIPTIONS,
  type BreastSpringPresetName,
} from './config';
import { createObjectTreeNode } from './modelTree';
import { installViewerStyles } from './viewerStyles';

export interface ViewerUICallbacks {
  onPresetChange: (preset: BreastSpringPresetName) => void;
  onSpringEnabledChange: (enabled: boolean) => void;
  onFpsCounterChange: (enabled: boolean) => void;
}

export interface ViewerUIOptions {
  initialSpringEnabled: boolean;
  initialFpsEnabled: boolean;
  initialPreset: BreastSpringPresetName;
}

export interface ViewerUIController {
  setModel: (mesh: THREE.SkinnedMesh) => void;
  setFPS: (fps: number) => void;
  setFpsCounterEnabled: (enabled: boolean) => void;
}

export function createViewerUI(
  callbacks: ViewerUICallbacks,
  options: ViewerUIOptions,
): ViewerUIController {
  installViewerStyles();

  let isCollapsed = true;

  const panel = document.createElement('aside');
  panel.id = 'mmd-viewer-panel';

  const header = document.createElement('header');
  header.className = 'mmd-panel-header';

  const titleWrap = document.createElement('div');
  const title = document.createElement('h1');
  title.className = 'mmd-panel-title';
  title.textContent = 'MMD Viewer';

  const subtitle = document.createElement('div');
  subtitle.className = 'mmd-panel-subtitle';
  subtitle.textContent = 'Настройки модели и физики';
  titleWrap.append(title, subtitle);

  const toggleButton = document.createElement('button');
  toggleButton.type = 'button';
  toggleButton.className = 'mmd-panel-toggle';

  header.append(titleWrap, toggleButton);

  const content = document.createElement('div');
  content.className = 'mmd-panel-content';

  const syncCollapsedState = (): void => {
    panel.classList.toggle('is-collapsed', isCollapsed);
    content.style.display = isCollapsed ? 'none' : '';
    toggleButton.textContent = isCollapsed ? 'Развернуть' : 'Свернуть';
    toggleButton.setAttribute('aria-expanded', String(!isCollapsed));
  };

  toggleButton.addEventListener('click', () => {
    isCollapsed = !isCollapsed;
    syncCollapsedState();
  });

  const physicsSection = document.createElement('section');
  physicsSection.className = 'mmd-section';

  const physicsTitle = document.createElement('h2');
  physicsTitle.className = 'mmd-section-title';
  physicsTitle.textContent = 'Физика груди';

  const springLabel = document.createElement('label');
  springLabel.className = 'mmd-check-row';

  const springCheckbox = document.createElement('input');
  springCheckbox.type = 'checkbox';
  springCheckbox.checked = options.initialSpringEnabled;

  const springText = document.createElement('span');
  springText.textContent = 'Дополнительная пружина';
  springLabel.append(springCheckbox, springText);

  const presetLabel = document.createElement('label');
  presetLabel.className = 'mmd-field-label';
  presetLabel.textContent = 'Интенсивность';

  const presetSelect = document.createElement('select');
  (Object.keys(BREAST_SPRING_PRESETS) as BreastSpringPresetName[]).forEach((preset) => {
    const option = document.createElement('option');
    option.value = preset;
    option.textContent = `${preset} · ${PRESET_DESCRIPTIONS[preset]}`;
    option.selected = preset === options.initialPreset;
    presetSelect.append(option);
  });

  const activePresetText = document.createElement('div');
  activePresetText.className = 'mmd-active-preset';
  activePresetText.textContent = `Активный пресет: ${options.initialPreset}`;

  springCheckbox.addEventListener('change', () => {
    callbacks.onSpringEnabledChange(springCheckbox.checked);
  });

  presetSelect.addEventListener('change', () => {
    const preset = presetSelect.value as BreastSpringPresetName;
    if (!(preset in BREAST_SPRING_PRESETS)) return;

    activePresetText.textContent = `Активный пресет: ${preset}`;
    callbacks.onPresetChange(preset);
  });

  physicsSection.append(
    physicsTitle,
    springLabel,
    presetLabel,
    presetSelect,
    activePresetText,
  );

  const settingsSection = document.createElement('section');
  settingsSection.className = 'mmd-section';

  const settingsTitle = document.createElement('h2');
  settingsTitle.className = 'mmd-section-title';
  settingsTitle.textContent = 'Настройки';

  const fpsLabel = document.createElement('label');
  fpsLabel.className = 'mmd-check-row';

  const fpsCheckbox = document.createElement('input');
  fpsCheckbox.type = 'checkbox';
  fpsCheckbox.checked = options.initialFpsEnabled;

  const fpsText = document.createElement('span');
  fpsText.textContent = 'Счётчик FPS';
  fpsLabel.append(fpsCheckbox, fpsText);
  settingsSection.append(settingsTitle, fpsLabel);

  const fpsCounter = document.createElement('div');
  fpsCounter.id = 'mmd-fps-counter';
  fpsCounter.textContent = 'FPS: --';
  fpsCounter.style.display = options.initialFpsEnabled ? '' : 'none';

  fpsCheckbox.addEventListener('change', () => {
    const enabled = fpsCheckbox.checked;
    setFpsCounterEnabled(enabled);
    callbacks.onFpsCounterChange(enabled);
  });

  const treeSection = document.createElement('section');
  treeSection.className = 'mmd-section';

  const treeTitle = document.createElement('h2');
  treeTitle.className = 'mmd-section-title';
  treeTitle.textContent = 'Дерево модели';

  const treeHelp = document.createElement('p');
  treeHelp.className = 'mmd-tree-help';
  treeHelp.textContent =
    'Отключай объекты целиком или отдельные материалы. В PMX материалы часто соответствуют отдельным деталям модели.';

  const treeContainer = document.createElement('div');
  treeContainer.className = 'mmd-tree';

  const loadingText = document.createElement('div');
  loadingText.className = 'mmd-tree-empty';
  loadingText.textContent = 'Ожидание загрузки модели…';
  treeContainer.append(loadingText);

  treeSection.append(treeTitle, treeHelp, treeContainer);
  content.append(physicsSection, settingsSection, treeSection);
  panel.append(header, content);
  syncCollapsedState();

  document.body.append(panel, fpsCounter);

  function setFpsCounterEnabled(enabled: boolean): void {
    fpsCheckbox.checked = enabled;
    fpsCounter.style.display = enabled ? '' : 'none';
  }

  return {
    setModel(mesh: THREE.SkinnedMesh): void {
      treeContainer.replaceChildren();
      const root = createObjectTreeNode(
        mesh,
        mesh.isSkinnedMesh ? 'Модель (SkinnedMesh)' : 'Модель',
      );

      if (root) {
        treeContainer.append(root);
      } else {
        const empty = document.createElement('div');
        empty.className = 'mmd-tree-empty';
        empty.textContent = 'Не удалось построить дерево объектов модели.';
        treeContainer.append(empty);
      }
    },

    setFPS(fps: number): void {
      if (Number.isFinite(fps)) {
        fpsCounter.textContent = `FPS: ${Math.round(fps)}`;
      }
    },

    setFpsCounterEnabled,
  };
}
