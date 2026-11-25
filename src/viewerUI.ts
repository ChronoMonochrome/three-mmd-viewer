import * as THREE from 'three';
import {
  BREAST_SPRING_PRESETS,
  PRESET_DESCRIPTIONS,
  type BreastSpringPresetName,
} from './config';
import { createObjectTreeNode } from './modelTree';
import { DEFAULT_LIGHTING_SETTINGS, type LightingSettings } from './lighting';
import {
  DEFAULT_MATERIAL_COMPATIBILITY_SETTINGS,
  type MaterialCompatibilitySettings,
} from './materialCompatibility';
import { installViewerStyles } from './viewerStyles';

export interface ViewerUICallbacks {
  onPresetChange: (preset: BreastSpringPresetName) => void;
  onSpringEnabledChange: (enabled: boolean) => void;
  onFpsCounterChange: (enabled: boolean) => void;
  onModelChange: (path: string | null) => void;
  onAnimationChange: (selection: string | null | 'none') => void;
  onLightingChange: (settings: LightingSettings) => void;
  onOutlineEnabledChange: (enabled: boolean) => void;
  onMaterialCompatibilityChange: (settings: MaterialCompatibilitySettings) => void;
}

export interface ViewerUIOptions {
  initialSpringEnabled: boolean;
  initialFpsEnabled: boolean;
  initialPreset: BreastSpringPresetName;
  initialLighting: LightingSettings;
  initialMaterialCompatibility: MaterialCompatibilitySettings;
  initialOutlineEnabled: boolean;
  outlineAvailable: boolean;
}

export interface ViewerUIController {
  setModel: (mesh: THREE.SkinnedMesh) => void;
  setFPS: (fps: number) => void;
  setFpsCounterEnabled: (enabled: boolean) => void;
  setAssetOptions: (models: string[], animations: string[]) => void;
  setAssetStatus: (message: string) => void;
}

function createRangeControl(
  labelText: string,
  min: number,
  max: number,
  step: number,
  initialValue: number,
  onChange: (value: number) => void,
): HTMLElement {
  const wrapper = document.createElement('label');
  wrapper.className = 'mmd-range-control';

  const topRow = document.createElement('span');
  topRow.className = 'mmd-range-heading';

  const label = document.createElement('span');
  label.textContent = labelText;

  const valueText = document.createElement('output');
  valueText.textContent = initialValue.toFixed(2);
  topRow.append(label, valueText);

  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(initialValue);
  input.addEventListener('input', () => {
    const value = Number(input.value);
    valueText.textContent = value.toFixed(2);
    onChange(value);
  });

  wrapper.append(topRow, input);
  return wrapper;
}

function createCheckbox(
  text: string,
  checked: boolean,
  onChange: (enabled: boolean) => void,
): HTMLLabelElement {
  const label = document.createElement('label');
  label.className = 'mmd-check-row';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = checked;
  checkbox.addEventListener('change', () => onChange(checkbox.checked));

  const caption = document.createElement('span');
  caption.textContent = text;
  label.append(checkbox, caption);
  return label;
}

export function createViewerUI(
  callbacks: ViewerUICallbacks,
  options: ViewerUIOptions,
): ViewerUIController {
  installViewerStyles();

  let isCollapsed = true;
  let lightingSettings: LightingSettings = { ...options.initialLighting };
  let materialSettings: MaterialCompatibilitySettings = {
    ...options.initialMaterialCompatibility,
  };

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
  subtitle.textContent = 'Настройки модели и отображения';
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

  const assetsSection = document.createElement('section');
  assetsSection.className = 'mmd-section';

  const assetsTitle = document.createElement('h2');
  assetsTitle.className = 'mmd-section-title';
  assetsTitle.textContent = 'Модель и анимация';

  const modelLabel = document.createElement('label');
  modelLabel.className = 'mmd-field-label';
  modelLabel.textContent = 'Модель PMX';

  const modelSelect = document.createElement('select');
  const defaultModelOption = document.createElement('option');
  defaultModelOption.value = '';
  defaultModelOption.textContent = 'По умолчанию (/models/model.pmx)';
  modelSelect.append(defaultModelOption);

  const animationLabel = document.createElement('label');
  animationLabel.className = 'mmd-field-label';
  animationLabel.textContent = 'Анимация VMD';

  const animationSelect = document.createElement('select');
  const defaultAnimationOption = document.createElement('option');
  defaultAnimationOption.value = '';
  defaultAnimationOption.textContent = 'По умолчанию (/animations/run.vmd)';
  const noAnimationOption = document.createElement('option');
  noAnimationOption.value = 'none';
  noAnimationOption.textContent = 'Без анимации';
  animationSelect.append(defaultAnimationOption, noAnimationOption);

  const assetStatus = document.createElement('div');
  assetStatus.className = 'mmd-active-preset';
  assetStatus.textContent = 'Поиск PMX и VMD в папке public…';

  modelSelect.addEventListener('change', () => {
    callbacks.onModelChange(modelSelect.value || null);
  });
  animationSelect.addEventListener('change', () => {
    const selection = animationSelect.value === 'none'
      ? 'none'
      : animationSelect.value || null;
    callbacks.onAnimationChange(selection);
  });

  assetsSection.append(
    assetsTitle,
    modelLabel,
    modelSelect,
    animationLabel,
    animationSelect,
    assetStatus,
  );

  const physicsSection = document.createElement('section');
  physicsSection.className = 'mmd-section';

  const physicsTitle = document.createElement('h2');
  physicsTitle.className = 'mmd-section-title';
  physicsTitle.textContent = 'Физика груди';

  const springCheckbox = createCheckbox(
    'Дополнительная пружина',
    options.initialSpringEnabled,
    callbacks.onSpringEnabledChange,
  );

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

  presetSelect.addEventListener('change', () => {
    const preset = presetSelect.value as BreastSpringPresetName;
    if (!(preset in BREAST_SPRING_PRESETS)) return;

    activePresetText.textContent = `Активный пресет: ${preset}`;
    callbacks.onPresetChange(preset);
  });

  physicsSection.append(
    physicsTitle,
    springCheckbox,
    presetLabel,
    presetSelect,
    activePresetText,
  );

  const visualSection = document.createElement('section');
  visualSection.className = 'mmd-section';

  const visualTitle = document.createElement('h2');
  visualTitle.className = 'mmd-section-title';
  visualTitle.textContent = 'Изображение и освещение';

  const lightingHelp = document.createElement('p');
  lightingHelp.className = 'mmd-tree-help';
  lightingHelp.textContent =
    'Подними заполняющий свет, если кожа слишком тёмная. Снижай основной и верхний свет, если материалы пересвечены.';

  const updateLighting = (key: keyof LightingSettings, value: number): void => {
    lightingSettings = { ...lightingSettings, [key]: value };
    callbacks.onLightingChange({ ...lightingSettings });
  };

  const hemisphereControl = createRangeControl(
    'Верхний / окружающий свет', 0, 2, 0.05,
    lightingSettings.hemisphereIntensity,
    (value) => updateLighting('hemisphereIntensity', value),
  );
  const directionalControl = createRangeControl(
    'Направленный свет', 0, 2, 0.05,
    lightingSettings.directionalIntensity,
    (value) => updateLighting('directionalIntensity', value),
  );
  const ambientFillControl = createRangeControl(
    'Заполнение теней', 0, 1.5, 0.05,
    lightingSettings.ambientFillIntensity,
    (value) => updateLighting('ambientFillIntensity', value),
  );

  const outlineCheckbox = createCheckbox(
    'Контуры MMD',
    options.initialOutlineEnabled && options.outlineAvailable,
    callbacks.onOutlineEnabledChange,
  );
  const outlineInput = outlineCheckbox.querySelector('input');
  if (outlineInput && !options.outlineAvailable) outlineInput.disabled = true;

  const outlineStatus = document.createElement('p');
  outlineStatus.className = 'mmd-tree-help';
  outlineStatus.textContent = options.outlineAvailable
    ? 'Используются контуры, заданные в PMX.'
    : 'Контуры недоступны: установленная версия @takahirox/three-mmd не экспортирует MMDOutlineEffect.';

  const forceDoubleSidedCheckbox = createCheckbox(
    'Двусторонние поверхности',
    materialSettings.forceDoubleSided,
    (enabled) => {
      materialSettings = { ...materialSettings, forceDoubleSided: enabled };
      callbacks.onMaterialCompatibilityChange({ ...materialSettings });
    },
  );

  const forceOutlinesCheckbox = createCheckbox(
    'Принудительные контуры для всех материалов',
    materialSettings.forceOutlines,
    (enabled) => {
      materialSettings = { ...materialSettings, forceOutlines: enabled };
      callbacks.onMaterialCompatibilityChange({ ...materialSettings });
    },
  );

  const outlineThicknessControl = createRangeControl(
    'Масштаб толщины контуров', 0.25, 3, 0.05,
    materialSettings.outlineThicknessScale,
    (value) => {
      materialSettings = { ...materialSettings, outlineThicknessScale: value };
      callbacks.onMaterialCompatibilityChange({ ...materialSettings });
    },
  );

  if (!options.outlineAvailable) {
    const forceOutlinesInput = forceOutlinesCheckbox.querySelector('input');
    const thicknessInput = outlineThicknessControl.querySelector('input');
    if (forceOutlinesInput) forceOutlinesInput.disabled = true;
    if (thicknessInput) thicknessInput.disabled = true;
  }

  visualSection.append(
    visualTitle,
    lightingHelp,
    hemisphereControl,
    directionalControl,
    ambientFillControl,
    outlineCheckbox,
    outlineStatus,
    forceDoubleSidedCheckbox,
    forceOutlinesCheckbox,
    outlineThicknessControl,
  );

  const settingsSection = document.createElement('section');
  settingsSection.className = 'mmd-section';

  const settingsTitle = document.createElement('h2');
  settingsTitle.className = 'mmd-section-title';
  settingsTitle.textContent = 'Настройки';

  const fpsCounter = document.createElement('div');
  fpsCounter.id = 'mmd-fps-counter';
  fpsCounter.textContent = 'FPS: --';
  fpsCounter.style.display = options.initialFpsEnabled ? '' : 'none';

  const fpsCheckbox = createCheckbox(
    'Счётчик FPS',
    options.initialFpsEnabled,
    (enabled) => {
      fpsCounter.style.display = enabled ? '' : 'none';
      callbacks.onFpsCounterChange(enabled);
    },
  );

  settingsSection.append(settingsTitle, fpsCheckbox);

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
  content.append(assetsSection, physicsSection, visualSection, settingsSection, treeSection);
  panel.append(header, content);
  syncCollapsedState();
  document.body.append(panel, fpsCounter);

  function setFpsCounterEnabled(enabled: boolean): void {
    const fpsInput = fpsCheckbox.querySelector('input');
    if (fpsInput) fpsInput.checked = enabled;
    fpsCounter.style.display = enabled ? '' : 'none';
  }

  function setAssetOptions(models: string[], animations: string[]): void {
    const currentModel = modelSelect.value;
    const currentAnimation = animationSelect.value;

    modelSelect.replaceChildren(defaultModelOption);
    for (const path of models) {
      const option = document.createElement('option');
      option.value = path;
      option.textContent = path;
      modelSelect.append(option);
    }

    animationSelect.replaceChildren(defaultAnimationOption, noAnimationOption);
    for (const path of animations) {
      const option = document.createElement('option');
      option.value = path;
      option.textContent = path;
      animationSelect.append(option);
    }

    modelSelect.value = models.includes(currentModel) ? currentModel : '';
    animationSelect.value = currentAnimation === 'none' || animations.includes(currentAnimation)
      ? currentAnimation
      : '';
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
      if (Number.isFinite(fps)) fpsCounter.textContent = `FPS: ${Math.round(fps)}`;
    },

    setFpsCounterEnabled,
    setAssetOptions,
    setAssetStatus(message: string): void {
      assetStatus.textContent = message;
    },
  };
}
