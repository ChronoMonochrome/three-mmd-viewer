export function installViewerStyles(): void {
  if (document.getElementById('mmd-viewer-ui-styles')) return;

  const style = document.createElement('style');
  style.id = 'mmd-viewer-ui-styles';
  style.textContent = `
    #mmd-viewer-panel {
      position: fixed;
      z-index: 20;
      top: 14px;
      right: 14px;
      width: min(360px, calc(100vw - 28px));
      max-height: calc(100vh - 28px);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      color: #e8edf5;
      background: rgba(20, 24, 32, 0.94);
      border: 1px solid rgba(255, 255, 255, 0.13);
      border-radius: 12px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.38);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      font: 13px/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    #mmd-viewer-panel * { box-sizing: border-box; }
    #mmd-viewer-panel.is-collapsed {
      width: auto;
    }
    #mmd-viewer-panel .mmd-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 13px 15px;
      border-bottom: 1px solid rgba(255,255,255,.10);
    }
    #mmd-viewer-panel.is-collapsed .mmd-panel-header {
      border-bottom: 0;
    }
    #mmd-viewer-panel .mmd-panel-title {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: .02em;
      white-space: nowrap;
    }
    #mmd-viewer-panel .mmd-panel-subtitle {
      color: #98a4b6;
      font-size: 11px;
      white-space: nowrap;
    }
    #mmd-viewer-panel .mmd-panel-toggle {
      cursor: pointer;
      padding: 4px 8px;
      font-size: 12px;
      color: #e8edf5;
      background: #303a49;
      border: 1px solid #4b596d;
      border-radius: 6px;
      white-space: nowrap;
    }
    #mmd-viewer-panel .mmd-panel-toggle:hover {
      background: #3a4658;
    }
    #mmd-viewer-panel .mmd-panel-content {
      overflow: auto;
      padding: 10px 12px 14px;
    }
    #mmd-viewer-panel .mmd-section {
      padding: 8px 2px 12px;
      border-bottom: 1px solid rgba(255,255,255,.10);
    }
    #mmd-viewer-panel .mmd-section:last-child { border-bottom: 0; }
    #mmd-viewer-panel .mmd-section-title {
      margin: 0 0 9px;
      color: #c9d4e4;
      font-size: 12px;
      font-weight: 700;
    }
    #mmd-viewer-panel .mmd-field-label {
      display: block;
      margin: 9px 0 5px;
      color: #aeb9c9;
      font-size: 11px;
    }
    #mmd-viewer-panel select {
      width: 100%;
      min-height: 34px;
      padding: 6px 9px;
      color: #f2f5fa;
      background: #2a313d;
      border: 1px solid #465163;
      border-radius: 7px;
      outline: none;
      font: inherit;
    }
    #mmd-viewer-panel select:focus { border-color: #7da7ff; }
    #mmd-viewer-panel .mmd-check-row {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 28px;
      color: #e2e8f1;
      cursor: pointer;
      user-select: none;
    }
    #mmd-viewer-panel input[type="checkbox"] {
      width: 15px;
      height: 15px;
      margin: 0;
      accent-color: #72a4ff;
      cursor: pointer;
      flex: 0 0 auto;
    }
    #mmd-viewer-panel .mmd-active-preset {
      margin-top: 6px;
      color: #9eacc0;
      font-size: 11px;
    }
    #mmd-viewer-panel .mmd-range-control {
      display: block;
      margin: 10px 0 12px;
      color: #dce4ef;
      font-size: 11px;
    }
    #mmd-viewer-panel .mmd-range-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 5px;
      color: #aeb9c9;
    }
    #mmd-viewer-panel .mmd-range-heading output {
      color: #e8edf5;
      font-variant-numeric: tabular-nums;
    }
    #mmd-viewer-panel input[type="range"] {
      display: block;
      width: 100%;
      height: 18px;
      margin: 0;
      accent-color: #72a4ff;
      cursor: pointer;
    }
    #mmd-viewer-panel input:disabled {
      cursor: not-allowed;
      opacity: .45;
    }
    #mmd-viewer-panel .mmd-tree-help {
      margin: 0 0 8px;
      color: #94a1b4;
      font-size: 11px;
    }
    #mmd-viewer-panel .mmd-tree {
      padding: 5px 0 0;
      color: #e0e7f0;
    }
    #mmd-viewer-panel .mmd-tree details { margin: 2px 0; }
    #mmd-viewer-panel .mmd-tree summary {
      display: flex;
      align-items: center;
      min-height: 27px;
      gap: 6px;
      padding: 3px 5px;
      border-radius: 5px;
      cursor: pointer;
      list-style: none;
    }
    #mmd-viewer-panel .mmd-tree summary::-webkit-details-marker { display: none; }
    #mmd-viewer-panel .mmd-tree summary::before {
      content: '›';
      display: inline-block;
      width: 10px;
      color: #93a2b7;
      transition: transform .12s ease;
    }
    #mmd-viewer-panel .mmd-tree details[open] > summary::before { transform: rotate(90deg); }
    #mmd-viewer-panel .mmd-tree .mmd-tree-leaf {
      display: flex;
      align-items: center;
      gap: 6px;
      min-height: 27px;
      padding: 3px 5px 3px 22px;
      border-radius: 5px;
    }
    #mmd-viewer-panel .mmd-tree summary:hover,
    #mmd-viewer-panel .mmd-tree .mmd-tree-leaf:hover { background: rgba(255,255,255,.06); }
    #mmd-viewer-panel .mmd-tree .mmd-tree-label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    #mmd-viewer-panel .mmd-tree .mmd-tree-children {
      margin-left: 13px;
      padding-left: 7px;
      border-left: 1px solid rgba(255,255,255,.12);
    }
    #mmd-viewer-panel .mmd-tree .mmd-tree-group > summary {
      color: #aebed4;
      font-size: 11px;
      font-weight: 650;
    }
    #mmd-viewer-panel .mmd-tree .mmd-tree-group > summary::before { content: '›'; }
    #mmd-viewer-panel .mmd-tree-empty {
      padding: 8px 5px;
      color: #a4afbf;
    }
    #mmd-fps-counter {
      position: fixed;
      z-index: 19;
      top: 14px;
      left: 14px;
      padding: 6px 9px;
      color: #e8edf5;
      background: rgba(20, 24, 32, 0.82);
      border: 1px solid rgba(255, 255, 255, 0.13);
      border-radius: 7px;
      font: 600 12px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-variant-numeric: tabular-nums;
      pointer-events: none;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    @media (max-width: 600px) {
      #mmd-viewer-panel {
        top: 8px;
        right: 8px;
        width: min(330px, calc(100vw - 16px));
        max-height: calc(100vh - 16px);
      }
      #mmd-fps-counter {
        top: 8px;
        left: 8px;
      }
    }
  `;
  document.head.appendChild(style);
}
