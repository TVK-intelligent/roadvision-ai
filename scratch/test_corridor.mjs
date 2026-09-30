const baseUrl = 'http://localhost:8080/api/v1';

async function run() {
  // 1. Login
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@roadcare.gov.vn', password: '12345678' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('Login successful! Admin Token acquired.');

  const authHeader = { 'Authorization': `Bearer ${token}` };

  // Helper to create incident via multipart/form-data
  async function createIncident(data) {
    const fs = await import('fs');
    const imageBuffer = fs.readFileSync('e:/DATN/roadvision-backend/uploads/incidents/4182fab1-3231-4b69-a217-f0ebec036136.jpg');
    const fd = new FormData();
    for (const [k, v] of Object.entries(data)) {
      fd.append(k, String(v));
    }
    const realImage = new Blob([imageBuffer], { type: 'image/jpeg' });
    fd.append('image', realImage, 'test.jpg');

    const res = await fetch(`${baseUrl}/incidents`, {
      method: 'POST',
      headers: authHeader,
      body: fd
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Create incident failed: ${res.status} - ${errText}`);
    }
    return await res.json();
  }

  // 2. Incident on QL21
  const ql21Data = await createIncident({
    title: 'Hố sâu trên QL21 gần Ba Sao',
    description: 'Sụt lún 50x40cm gây nguy hiểm xe máy',
    category: 'POTHOLE',
    latitude: 20.5512,
    longitude: 105.8234,
    address: 'Quốc Lộ 21, Ba Sao, Kim Bảng, Hà Nam'
  });
  console.log('\n--- TEST 1: INCIDENT CREATED ON QL21 ---');
  console.log('Ticket Code:', ql21Data.ticketCode);
  console.log('Route Corridor:', ql21Data.routeCorridor);
  console.log('Zone Name:', ql21Data.zoneName);

  // 3. Incident on QL1A
  const ql1aData = await createIncident({
    title: 'Vết nứt lớn Km235 QL1A',
    description: 'Nứt kéo dài 3m',
    category: 'ROAD_CRACK',
    latitude: 20.436036,
    longitude: 105.904596,
    address: 'Thanh Liêm, Hà Nam (QL1A)'
  });
  console.log('\n--- TEST 2: INCIDENT CREATED ON QL1A ---');
  console.log('Ticket Code:', ql1aData.ticketCode);
  console.log('Route Corridor:', ql1aData.routeCorridor);
  console.log('Zone Name:', ql1aData.zoneName);

  // 4. Incident Downtown Phu Ly
  const cityData = await createIncident({
    title: 'Hố ga sập đường Lê Hoàn',
    description: 'Mất nắp hố ga nội thị',
    category: 'POTHOLE',
    latitude: 20.5435,
    longitude: 105.9175,
    address: 'Đường Lê Hoàn, TP. Phủ Lý, Hà Nam'
  });
  console.log('\n--- TEST 3: INCIDENT CREATED IN DOWNTOWN ---');
  console.log('Ticket Code:', cityData.ticketCode);
  console.log('Route Corridor:', cityData.routeCorridor);
  console.log('Zone Name:', cityData.zoneName);

  // 5. Test Dispatch Queue
  const queueRes = await fetch(`${baseUrl}/incidents?page=0&size=10`, { headers: authHeader });
  const queueData = await queueRes.json();
  console.log('\n--- TEST 4: DISPATCH QUEUE ITEMS ---');
  console.log('Total Incidents in Queue:', queueData.totalElements);
  for (const item of queueData.content.slice(0, 5)) {
    console.log(`[${item.ticketCode}] Corridor: ${item.routeCorridor} | Zone: ${item.zoneName} | Title: ${item.title}`);
  }

  // 6. Test Corridor Analytics Filter
  const analyticsRes = await fetch(`${baseUrl}/admin/analytics?district=QL21`, { headers: authHeader });
  const analyticsData = await analyticsRes.json();
  console.log('\n--- TEST 5: ANALYTICS FILTER QL21 ---');
  console.log('Total in QL21 Corridor:', analyticsData.totalIncidents);
  console.log('Category Spectrum:', analyticsData.categoryBreakdown);
  console.log('Urgent Feed count:', analyticsData.urgentFeeds?.length || 0);

  // 7. Test Export GeoJSON
  const geojsonRes = await fetch(`${baseUrl}/admin/export-geojson`, { headers: authHeader });
  const geojsonData = await geojsonRes.json();
  console.log('\n--- TEST 6: EXPORT GEOJSON ---');
  console.log('GeoJSON Type:', geojsonData.type);
  console.log('Features count:', geojsonData.features?.length || 0);
  if (geojsonData.features && geojsonData.features.length > 0) {
    const feat = geojsonData.features[0];
    console.log('First Feature properties:', feat.properties.ticketCode, feat.properties.routeCorridor, feat.properties.zoneName);
  }
}

run().catch(console.error);
