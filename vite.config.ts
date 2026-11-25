import { defineConfig, loadEnv } from 'vite';

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
        server: {
            host: '0.0.0.0',
            port: 5173,
            allowedHosts,
        },
    };
});
