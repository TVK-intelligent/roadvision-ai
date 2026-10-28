import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import https from 'node:https'
import dns from 'node:dns'

// Plugin chuyển tiếp OpenStreetMap Nominatim thông qua DNS Google/Cloudflare (8.8.8.8, 1.1.1.1)
// giúp khắc phục 100% lỗi DNS ERR_NAME_NOT_RESOLVED do nhà mạng VN chặn tên miền .org
function osmProxyPlugin(): Plugin {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch {
    // Bỏ qua nếu môi trường không cho phép setServers
  }

  const agent = new https.Agent({
    lookup: (hostname, options, callback) => {
      const cb = typeof options === 'function' ? options : callback;
      const opts = typeof options === 'object' ? options : {};
      dns.resolve(hostname, (err, addrs) => {
        if (err || !addrs || addrs.length === 0) {
          dns.lookup(hostname, opts, cb);
        } else if (opts.all) {
          cb(null, addrs.map((a) => ({ address: a, family: 4 })));
        } else {
          cb(null, addrs[0], 4);
        }
      });
    },
  });

  return {
    name: 'osm-proxy-plugin',
    configureServer(server) {
      server.middlewares.use('/api/osm/reverse', (req, res) => {
        const url = new URL(req.url || '', 'http://localhost:5173');
        const lat = url.searchParams.get('lat');
        const lon = url.searchParams.get('lon');
        if (!lat || !lon) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing lat or lon parameter' }));
          return;
        }

        const targetUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
        const osmReq = https.get(
          targetUrl,
          {
            agent,
            headers: {
              'User-Agent': 'RoadVision-PMS/1.0 (contact@roadcare.gov.vn)',
              'Accept-Language': 'vi',
            },
          },
          (osmRes) => {
            res.statusCode = osmRes.statusCode || 200;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            osmRes.pipe(res);
          }
        );

        osmReq.on('error', (err) => {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        });
      });

      server.middlewares.use('/api/osm/search', (req, res) => {
        const url = new URL(req.url || '', 'http://localhost:5173');
        const q = url.searchParams.get('q');
        if (!q) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing q parameter' }));
          return;
        }

        const targetUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;
        const osmReq = https.get(
          targetUrl,
          {
            agent,
            headers: {
              'User-Agent': 'RoadVision-PMS/1.0 (contact@roadcare.gov.vn)',
              'Accept-Language': 'vi',
            },
          },
          (osmRes) => {
            res.statusCode = osmRes.statusCode || 200;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            osmRes.pipe(res);
          }
        );

        osmReq.on('error', (err) => {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), osmProxyPlugin()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
})
