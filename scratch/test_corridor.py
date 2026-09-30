import requests
import json

base_url = "http://localhost:8080/api/v1"

# 1. Login
res = requests.post(f"{base_url}/auth/login", json={"email": "admin@roadvision.com", "password": "password123"})
if res.status_code != 200:
    res = requests.post(f"{base_url}/auth/login", json={"email": "admin@roadvision.com", "password": "12345678"})

token = res.json()["token"]
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
print("Login successful! Token acquired.")

# 2. Test Create on QL21
pothole_ql21 = {
    "title": "Hố sâu trên QL21 gần Ba Sao",
    "description": "Sụt lún 50x40cm gây nguy hiểm xe máy",
    "category": "POTHOLE",
    "latitude": 20.5512,
    "longitude": 105.8234,
    "address": "Quoc Lo 21, Ba Sao, Kim Bang, Ha Nam"
}
res_ql21 = requests.post(f"{base_url}/incidents", json=pothole_ql21, headers=headers)
data_ql21 = res_ql21.json()
print("\n--- TEST 1: INCIDENT QL21 CREATED ---")
print(f"Ticket: {data_ql21.get('ticketCode')}")
print(f"Route Corridor: {data_ql21.get('routeCorridor')}")
print(f"Zone Name: {data_ql21.get('zoneName')}")

# 3. Test Create on QL1A
crack_ql1a = {
    "title": "Vết nứt lớn Km235 QL1A",
    "description": "Nứt kéo dài 3m",
    "category": "ROAD_CRACK",
    "latitude": 20.436036,
    "longitude": 105.904596,
    "address": "Thanh Liem, Ha Nam (QL1A)"
}
res_ql1a = requests.post(f"{base_url}/incidents", json=crack_ql1a, headers=headers)
data_ql1a = res_ql1a.json()
print("\n--- TEST 2: INCIDENT QL1A CREATED ---")
print(f"Ticket: {data_ql1a.get('ticketCode')}")
print(f"Route Corridor: {data_ql1a.get('routeCorridor')}")
print(f"Zone Name: {data_ql1a.get('zoneName')}")

# 4. Check Queue
res_q = requests.get(f"{base_url}/incidents/queue?page=0&size=5", headers=headers)
q_data = res_q.json()
print("\n--- TEST 3: DISPATCH QUEUE ---")
print(f"Total elements: {q_data.get('totalElements')}")
for item in q_data.get("content", [])[:3]:
    print(f"Ticket: {item.get('ticketCode')} | Corridor: {item.get('routeCorridor')} | Zone: {item.get('zoneName')}")

# 5. Check Corridor Analytics
res_analytics = requests.get(f"{base_url}/admin/analytics?district=QL21", headers=headers)
print("\n--- TEST 4: ANALYTICS FILTER BY CORRIDOR QL21 ---")
print(res_analytics.json())
