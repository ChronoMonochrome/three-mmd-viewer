import * as THREE from 'three';

function createTreeLeaf(
  label: string,
  checked: boolean,
  onChange: (visible: boolean) => void,
): HTMLElement {
  const row = document.createElement('label');
  row.className = 'mmd-tree-leaf';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = checked;
  checkbox.addEventListener('change', () => onChange(checkbox.checked));

  const text = document.createElement('span');
  text.className = 'mmd-tree-label';
  text.textContent = label;

  row.append(checkbox, text);
  return row;
}

function createTreeGroup(label: string, children: HTMLElement[]): HTMLElement {
  const details = document.createElement('details');
  details.className = 'mmd-tree-group';
  details.open = true;

  const summary = document.createElement('summary');
  const text = document.createElement('span');
  text.className = 'mmd-tree-label';
  text.textContent = label;
  summary.append(text);

  const childContainer = document.createElement('div');
  childContainer.className = 'mmd-tree-children';
  childContainer.append(...children);

  details.append(summary, childContainer);
  return details;
}

export function createObjectTreeNode(
  object: THREE.Object3D,
  fallbackLabel: string,
): HTMLElement | null {
  if ((object as THREE.Bone).isBone) return null;

  const label = object.name.trim() || fallbackLabel;
  const children: HTMLElement[] = [];
  const meshObject = object as THREE.Mesh;

  if (meshObject.isMesh && meshObject.material) {
    const materials = Array.isArray(meshObject.material)
      ? meshObject.material
      : [meshObject.material];

    const materialRows = materials.map((material, index) => {
      const materialLabel = material.name.trim() || `Материал ${index + 1}`;
      return createTreeLeaf(materialLabel, material.visible, (visible) => {
        material.visible = visible;
      });
    });

    if (materialRows.length > 0) {
      children.push(createTreeGroup(`Материалы / детали (${materials.length})`, materialRows));
    }
  }

  object.children.forEach((child, index) => {
    const childNode = createObjectTreeNode(child, `${child.type} ${index + 1}`);
    if (childNode) children.push(childNode);
  });

  const details = document.createElement('details');
  details.open = true;

  const summary = document.createElement('summary');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = object.visible;
  checkbox.addEventListener('click', (event) => event.stopPropagation());
  checkbox.addEventListener('change', () => {
    object.visible = checkbox.checked;
  });

  const text = document.createElement('span');
  text.className = 'mmd-tree-label';
  text.textContent = label;
  summary.append(checkbox, text);

  const childContainer = document.createElement('div');
  childContainer.className = 'mmd-tree-children';
  childContainer.append(...children);

  details.append(summary, childContainer);
  return details;
}
