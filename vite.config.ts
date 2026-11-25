import { readdir } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';

const MANIFEST_PATH = '/mmd-assets.json';

interface PublicAssetManifest {
  models: string[];
  animations: string[];
}

async function scanPublicAssets(publicDir: string): Promise<PublicAssetManifest> {
  const models: string[] = [];
  const animations: string[] = [];

  async function visit(directory: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const absolutePath = resolve(directory, entry.name);

      if (entry.isDirectory()) {
        await visit(absolutePath);
        continue;
      }

      if (!entry.isFile()) continue;

      const extension = entry.name.slice(entry.name.lastIndexOf('.') + 1).toLowerCase();
      if (extension !== 'pmx' && extension !== 'vmd') continue;

      const relativePath = relative(publicDir, absolutePath)
      .split(sep)
      .map((segment) => encodeURIComponent(segment))
      .join('/');
      const url = `/${relativePath}`;

      if (extension === 'pmx') models.push(url);
      else animations.push(url);
    }
  }

  await visit(publicDir);
  models.sort((a, b) => a.localeCompare(b));
  animations.sort((a, b) => a.localeCompare(b));

  return { models, animations };
}

function publicMmdAssetManifest(): Plugin {
  let publicDir = '';

  return {
    name: 'public-mmd-asset-manifest',
    configResolved(config) {
      publicDir = config.publicDir;
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] !== MANIFEST_PATH) {
          next();
          return;
        }

        if (request.method !== 'GET') {
          response.statusCode = 405;
          response.end('Method Not Allowed');
          return;
        }

        void scanPublicAssets(publicDir)
        .then((manifest) => {
          response.statusCode = 200;
          response.setHeader('Content-Type', 'application/json; charset=utf-8');
          response.setHeader('Cache-Control', 'no-store');
          response.end(JSON.stringify(manifest));
        })
        .catch((error: unknown) => {
          response.statusCode = 500;
          response.setHeader('Content-Type', 'application/json; charset=utf-8');
          response.end(JSON.stringify({ error: String(error) }));
        });
      });
    },
    async generateBundle() {
      const manifest = await scanPublicAssets(publicDir);
      this.emitFile({
        type: 'asset',
        fileName: 'mmd-assets.json',
        source: JSON.stringify(manifest, null, 2),
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const allowedHosts: string[] = [];

  if (env.NGROK_PUBLIC_URL) {
    try {
      const host = new URL(
        env.NGROK_PUBLIC_URL.includes('://')
        ? env.NGROK_PUBLIC_URL
        : `https://${env.NGROK_PUBLIC_URL}`
      ).hostname;
      if (host) allowedHosts.push(host);
    } catch {
      // игнорируем некорректный URL
    }
  }

  return {
    plugins: [publicMmdAssetManifest()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts,
    },
  };
});
