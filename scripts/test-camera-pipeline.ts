/**
 * End-to-end test suite for RTSP Camera Streaming Pipeline & go2rtc Proxy
 */
import assert from 'node:assert';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fork } from 'node:child_process';

const MOCK_GO2RTC_PORT = 51984;
const TEST_SERVER_PORT = 56799;

console.log('🧪 Starting Camera Streaming Pipeline & go2rtc Proxy Verification Suite...\n');

async function startMockGo2Rtc() {
  const registeredStreams = new Map<string, string>();

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '', `http://localhost:${MOCK_GO2RTC_PORT}`);
    const pathname = url.pathname;

    // Stream registration endpoint
    if (pathname === '/api/streams') {
      if (req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(Object.fromEntries(registeredStreams)));
      }
      if (req.method === 'PUT' || req.method === 'POST') {
        const name = url.searchParams.get('name') || '';
        const src = url.searchParams.get('src') || '';
        registeredStreams.set(name, src);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true }));
      }
    }

    // WebRTC WHEP signaling endpoint
    if (pathname === '/api/webrtc') {
      const src = url.searchParams.get('src') || '';
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        if (!body.includes('v=0') && !body.includes('offer')) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          return res.end('Invalid SDP offer');
        }
        // Return mock SDP answer
        const mockSdpAnswer = `v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=go2rtc\r\nt=0 0\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\nc=IN IP4 127.0.0.1\r\na=recvonly\r\na=mid:0\r\na=rtpmap:96 H264/90000\r\n`;
        res.writeHead(200, { 'Content-Type': 'application/sdp' });
        return res.end(mockSdpAnswer);
      });
      return;
    }

    // HLS Playlist endpoint
    if (pathname === '/api/stream.m3u8') {
      const src = url.searchParams.get('src') || '';
      const playlist = `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:2\n#EXT-X-MEDIA-SEQUENCE:1\n#EXTINF:2.000,\nstream.ts?id=1\n#EXT-X-ENDLIST\n`;
      res.writeHead(200, { 'Content-Type': 'application/vnd.apple.mpegurl' });
      return res.end(playlist);
    }

    // HLS Media Segment endpoint
    if (pathname === '/api/stream.ts') {
      const tsHeader = Buffer.alloc(188, 0x47); // 188-byte MPEG-TS sync packet
      res.writeHead(200, { 'Content-Type': 'video/MP2T' });
      return res.end(tsHeader);
    }

    res.writeHead(404);
    res.end('Not Found');
  });

  await new Promise<void>((resolve) => server.listen(MOCK_GO2RTC_PORT, '127.0.0.1', resolve));
  return {
    server,
    registeredStreams
  };
}

async function runCameraPipelineTests() {
  const scratchDir = path.join(process.cwd(), 'scratch', `test-camera-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
  fs.mkdirSync(scratchDir, { recursive: true });

  const mockGo2Rtc = await startMockGo2Rtc();
  console.log(`[Phase 1] Mock go2rtc sidecar listening on port ${MOCK_GO2RTC_PORT}...`);

  // Boot HAD Server
  console.log(`[Phase 2] Booting HAD server on port ${TEST_SERVER_PORT}...`);
  const serverProcess = fork('dist/server.cjs', [], {
    env: {
      ...process.env,
      PORT: String(TEST_SERVER_PORT),
      DATA_DIR: scratchDir,
      GO2RTC_URL: `http://127.0.0.1:${MOCK_GO2RTC_PORT}`,
      ALLOW_MOCK_TOKENS: 'true',
      NODE_ENV: 'production'
    },
    stdio: 'pipe'
  });

  try {
    serverProcess.stderr?.on('data', (d) => {
      console.error('SERVER STDERR:', d.toString());
    });

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Server boot timeout')), 8000);
      serverProcess.stdout?.on('data', (d) => {
        if (d.toString().includes('HAD - Home Assistant Dashboard') || d.toString().includes(String(TEST_SERVER_PORT))) {
          clearTimeout(timer);
          resolve();
        }
      });
    });

    const request = (options: http.RequestOptions, postData?: string): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: string; buffer: Buffer }> => {
      return new Promise((resolve, reject) => {
        const req = http.request({
          hostname: '127.0.0.1',
          port: TEST_SERVER_PORT,
          ...options
        }, (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
          res.on('end', () => {
            const buffer = Buffer.concat(chunks);
            resolve({
              statusCode: res.statusCode || 0,
              headers: res.headers,
              body: buffer.toString('utf-8'),
              buffer
            });
          });
        });
        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
      });
    };

    console.log('\n--- 1. Testing Camera Status & go2rtc Ping ---');
    const statusRes = await request({
      path: '/api/cameras/status',
      method: 'GET',
      headers: { Authorization: 'Bearer test_mock_token' }
    });
    assert.strictEqual(statusRes.statusCode, 200);
    const statusData = JSON.parse(statusRes.body);
    assert.strictEqual(statusData.go2rtcOnline, true);
    console.log('✓ go2rtc sidecar health check verified online');

    console.log('\n--- 2. Saving RTSP Camera Source to Persistent Config ---');
    const savePayload = JSON.stringify({
      cameras: {
        sources: {
          'camera.driveway': {
            id: 'camera.driveway',
            name: 'Driveway IP Camera',
            rtspUrl: 'rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mp4',
            liveType: 'auto'
          }
        }
      }
    });

    const saveRes = await request({
      path: '/api/config',
      method: 'POST',
      headers: {
        Authorization: 'Bearer test_mock_token',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(savePayload)
      }
    }, savePayload);

    assert.strictEqual(saveRes.statusCode, 200);
    const savedConfig = JSON.parse(saveRes.body);
    assert(savedConfig.config?.cameras?.sources?.['camera.driveway'], 'RTSP camera source should be saved in config');
    assert.strictEqual(savedConfig.config.cameras.sources['camera.driveway'].name, 'Driveway IP Camera');
    console.log('✓ RTSP camera source persisted to backend configuration');

    console.log('\n--- 3. Testing WebRTC Signaling & Auth Protection ---');
    // 3a. Unauthenticated request must return 401
    const unauthWebRtc = await request({
      path: '/api/cameras/camera.driveway/webrtc',
      method: 'POST'
    });
    assert.strictEqual(unauthWebRtc.statusCode, 401, 'WebRTC proxy must require authentication');
    console.log('✓ WebRTC endpoint rejected unauthenticated request with 401');

    // 3b. Request for unconfigured camera must return 404
    const notFoundWebRtc = await request({
      path: '/api/cameras/camera.unconfigured/webrtc',
      method: 'POST',
      headers: {
        Authorization: 'Bearer test_mock_token',
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({ sdp: 'v=0\r\no=...' }));
    assert.strictEqual(notFoundWebRtc.statusCode, 404, 'Unconfigured camera must return 404');
    console.log('✓ Unconfigured camera correctly returned 404 (triggers snapshot fallback)');

    // 3c. Valid WebRTC SDP offer negotiation
    const clientOffer = `v=0\r\no=- 12345 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=sendrecv\r\n`;
    const webrtcRes = await request({
      path: '/api/cameras/camera.driveway/webrtc',
      method: 'POST',
      headers: {
        Authorization: 'Bearer test_mock_token',
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({ sdp: clientOffer, type: 'offer' }));

    assert.strictEqual(webrtcRes.statusCode, 200);
    const webrtcData = JSON.parse(webrtcRes.body);
    assert.strictEqual(webrtcData.type, 'answer');
    assert(webrtcData.sdp && webrtcData.sdp.includes('v=0'), 'SDP answer should be returned');
    assert(mockGo2Rtc.registeredStreams.has('camera_driveway'), 'go2rtc should have registered the camera stream');
    console.log('✓ WebRTC offer/answer signaling exchange negotiated successfully');

    console.log('\n--- 4. Testing HLS Fallback Stream & Media Segments ---');
    // 4a. Unauthenticated HLS request must return 401
    const unauthHls = await request({
      path: '/api/cameras/camera.driveway/hls/stream.m3u8',
      method: 'GET'
    });
    assert.strictEqual(unauthHls.statusCode, 401, 'HLS proxy must require authentication');
    console.log('✓ HLS endpoint rejected unauthenticated request with 401');

    // 4b. Authenticated HLS playlist fetch
    const hlsRes = await request({
      path: '/api/cameras/camera.driveway/hls/stream.m3u8',
      method: 'GET',
      headers: { Authorization: 'Bearer test_mock_token' }
    });
    assert.strictEqual(hlsRes.statusCode, 200);
    assert(hlsRes.headers['content-type']?.includes('mpegurl'), 'Content-Type should be mpegurl');
    assert(hlsRes.body.includes('#EXTM3U'), 'HLS playlist should start with #EXTM3U');
    console.log('✓ HLS .m3u8 playlist delivered with correct headers');

    // 4c. HLS MPEG-TS segment fetch
    const segmentRes = await request({
      path: '/api/cameras/camera.driveway/hls/stream.ts?id=1',
      method: 'GET',
      headers: { Authorization: 'Bearer test_mock_token' }
    });
    assert.strictEqual(segmentRes.statusCode, 200);
    assert.strictEqual(segmentRes.headers['content-type'], 'video/MP2T');
    assert.strictEqual(segmentRes.buffer.length, 188);
    assert.strictEqual(segmentRes.buffer[0], 0x47, 'Valid MPEG-TS sync byte 0x47');
    console.log('✓ HLS media segment delivered binary MPEG-TS payload');

    console.log('\n--- 5. Fallback Verification for Snapshot-Only Cameras ---');
    // Confirm cameras without RTSP stream return 404 on streaming routes, keeping frontend in snapshot mode
    const snapshotOnlyWebRtc = await request({
      path: '/api/cameras/camera.porch_snapshot/webrtc',
      method: 'POST',
      headers: {
        Authorization: 'Bearer test_mock_token',
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({ sdp: 'v=0' }));
    assert.strictEqual(snapshotOnlyWebRtc.statusCode, 404);

    const snapshotOnlyHls = await request({
      path: '/api/cameras/camera.porch_snapshot/hls/stream.m3u8',
      method: 'GET',
      headers: { Authorization: 'Bearer test_mock_token' }
    });
    assert.strictEqual(snapshotOnlyHls.statusCode, 404);
    console.log('\n--- 6. Testing RTSP Camera Deletion & No-Resurrection ---');
    // 6a. Delete via DELETE /api/cameras/:cameraId
    const delRes = await request({
      path: '/api/cameras/camera.driveway',
      method: 'DELETE',
      headers: { Authorization: 'Bearer test_mock_token' }
    });
    assert.strictEqual(delRes.statusCode, 200, 'DELETE /api/cameras/:cameraId should return 200');
    console.log('✓ Camera deletion endpoint returned 200');

    // 6b. Verify camera is now gone from persistent config
    const verifyDelRes = await request({
      path: '/api/config',
      method: 'GET',
      headers: { Authorization: 'Bearer test_mock_token' }
    });
    const verifyDelData = JSON.parse(verifyDelRes.body);
    assert(!verifyDelData.config?.cameras?.sources?.['camera.driveway'], 'Deleted camera must not exist in config.json');
    console.log('✓ Deleted camera verified removed from persistent config');

    // 6c. Verify deleting via POST /api/config with empty/updated sources does not resurrect
    // First re-add a camera
    await request({
      path: '/api/config',
      method: 'POST',
      headers: {
        Authorization: 'Bearer test_mock_token',
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({
      config: {
        cameras: {
          sources: {
            'camera.test_readd': { id: 'camera.test_readd', rtspUrl: 'rtsp://127.0.0.1/test' }
          }
        }
      }
    }));

    // Now update with empty sources {}
    const updateEmptyRes = await request({
      path: '/api/config',
      method: 'POST',
      headers: {
        Authorization: 'Bearer test_mock_token',
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({
      config: {
        cameras: {
          sources: {}
        }
      }
    }));
    assert.strictEqual(updateEmptyRes.statusCode, 200);
    const updateEmptyData = JSON.parse(updateEmptyRes.body);
    assert(!updateEmptyData.config?.cameras?.sources?.['camera.test_readd'], 'Updated sources {} must not resurrect deleted camera');
    console.log('✓ Updating sources map wholesale-replaces dictionary without resurrecting deleted keys');

    // 6d. Verify streaming endpoints for deleted camera now return 404
    const deletedWebRtc = await request({
      path: '/api/cameras/camera.driveway/webrtc',
      method: 'POST',
      headers: {
        Authorization: 'Bearer test_mock_token',
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({ sdp: 'v=0' }));
    assert.strictEqual(deletedWebRtc.statusCode, 404, 'Streaming routes must return 404 after camera deletion');
    console.log('✓ Streaming route returns 404 for deleted camera, falling back to snapshot cleanly');

    console.log('\n🎉 ALL CAMERA STREAMING PIPELINE & GO2RTC TESTS PASSED!\n');
  } finally {
    serverProcess.kill('SIGTERM');
    mockGo2Rtc.server.close();
  }
}

runCameraPipelineTests().catch((err) => {
  console.error('Camera pipeline test failed:', err);
  process.exit(1);
});
