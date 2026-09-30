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
      throw new Error(`Failed: ${res.status} - ${errText}`);
    }
    return await res.json();
  }

  // TEST 1: HÀ NỘI (KHU I)
  const hanoi = await createIncident({
    title: 'Hố sụt đường Giải Phóng, Hà Nội',
    description: 'Hố sụt gần cổng bệnh viện Bạch Mai',
    category: 'POTHOLE',
    latitude: 21.0028,
    longitude: 105.8415,
    address: 'Số 78 Đường Giải Phóng, Phường Phương Mai, Quận Đống Đa, TP. Hà Nội'
  });
  console.log(`[TEST 1 - HÀ NỘI] Ticket: ${hanoi.ticketCode} | Corridor: ${hanoi.routeCorridor} | Zone: ${hanoi.zoneName}`);

  // TEST 2: NGHỆ AN (KHU II)
  const nghean = await createIncident({
    title: 'Nứt mặt đường Lê Nin, TP. Vinh',
    description: 'Nứt chân chim dài 5m',
    category: 'ROAD_CRACK',
    latitude: 18.6812,
    longitude: 105.6885,
    address: 'Đường V.I. Lê Nin, Xã Nghi Phú, TP. Vinh, Tỉnh Nghệ An'
  });
  console.log(`[TEST 2 - NGHỆ AN] Ticket: ${nghean.ticketCode} | Corridor: ${nghean.routeCorridor} | Zone: ${nghean.zoneName}`);

  // TEST 3: ĐÀ NẴNG (KHU III)
  const danang = await createIncident({
    title: 'Ngập úng đường Nguyễn Văn Linh, Đà Nẵng',
    description: 'Nước ngập sâu 30cm sau mưa lớn',
    category: 'ROAD_FLOODING',
    latitude: 16.0612,
    longitude: 108.2145,
    address: 'Số 150 Đường Nguyễn Văn Linh, Phường Nam Dương, Quận Hải Châu, TP. Đà Nẵng'
  });
  console.log(`[TEST 3 - ĐÀ NẴNG] Ticket: ${danang.ticketCode} | Corridor: ${danang.routeCorridor} | Zone: ${danang.zoneName}`);

  // TEST 4: TP. HỒ CHÍ MINH (KHU IV)
  const hcm = await createIncident({
    title: 'Hố ga mất nắp Xa lộ Hà Nội, TP.HCM',
    description: 'Nắp cống bị sập làn xe máy',
    category: 'POTHOLE',
    latitude: 10.8456,
    longitude: 106.7789,
    address: 'Xa lộ Hà Nội, Phường Hiệp Phú, TP. Thủ Đức, TP. Hồ Chí Minh'
  });
  console.log(`[TEST 4 - TP.HCM] Ticket: ${hcm.ticketCode} | Corridor: ${hcm.routeCorridor} | Zone: ${hcm.zoneName}`);

  // TEST 5: CẦN THƠ (KHU IV)
  const cantho = await createIncident({
    title: 'Vật cản đường 30 Tháng 4, Cần Thơ',
    description: 'Đất đá rơi vãi cản trở giao thông',
    category: 'ROAD_OBSTACLE',
    latitude: 10.0298,
    longitude: 105.7725,
    address: 'Đường 30 Tháng 4, Phường Xuân Khánh, Quận Ninh Kiều, TP. Cần Thơ'
  });
  console.log(`[TEST 5 - CẦN THƠ] Ticket: ${cantho.ticketCode} | Corridor: ${cantho.routeCorridor} | Zone: ${cantho.zoneName}`);

  // 6. Test Analytics Filter by Region
  for (const reg of ['KHU_1', 'KHU_2', 'KHU_3', 'KHU_4']) {
    const resA = await fetch(`${baseUrl}/admin/analytics?district=${reg}`, { headers: authHeader });
    const dataA = await resA.json();
    console.log(`[ANALYTICS ${reg}] Total Incidents: ${dataA.totalIncidents} | Triage Pending: ${dataA.triagePending} | Active Crews: ${dataA.activeCrews}`);
  }
}

run().catch(console.error);
