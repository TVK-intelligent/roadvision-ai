$loginBody = @{ email = 'admin@roadvision.com'; password = '12345678' } | ConvertTo-Json
$login = Invoke-RestMethod -Uri 'http://localhost:8080/api/v1/auth/login' -Method Post -Body $loginBody -ContentType 'application/json'
$token = $login.token
$headers = @{ Authorization = "Bearer $token" }

Write-Host "=== TEST 1: CREATE INCIDENT ON QL21 (KIM BANG) ==="
$newIncBody = @{
  title = "Ổ gà sâu trên quốc lộ 21 gần Ba Sao"
  description = "Hố sụt kích thước 50x40cm gây nguy hiểm cho xe máy"
  category = "POTHOLE"
  latitude = 20.5512
  longitude = 105.8234
  address = "Quốc Lộ 21, Ba Sao, Kim Bảng, Hà Nam"
} | ConvertTo-Json

$created = Invoke-RestMethod -Uri 'http://localhost:8080/api/v1/incidents' -Method Post -Body $newIncBody -ContentType 'application/json' -Headers $headers
Write-Host "Ticket: $($created.ticketCode)"
Write-Host "Route Corridor: $($created.routeCorridor)"
Write-Host "Zone Name: $($created.zoneName)"

Write-Host "`n=== TEST 2: CREATE INCIDENT ON QL1A (THANH LIEM) ==="
$ql1aBody = @{
  title = "Vết nứt chân chim lớn Km235 QL1A"
  description = "Nứt mặt đường kéo dài 3m"
  category = "ROAD_CRACK"
  latitude = 20.436036
  longitude = 105.904596
  address = "Thanh Liêm, Hà Nam (QL1A)"
} | ConvertTo-Json

$created2 = Invoke-RestMethod -Uri 'http://localhost:8080/api/v1/incidents' -Method Post -Body $ql1aBody -ContentType 'application/json' -Headers $headers
Write-Host "Ticket: $($created2.ticketCode)"
Write-Host "Route Corridor: $($created2.routeCorridor)"
Write-Host "Zone Name: $($created2.zoneName)"

Write-Host "`n=== TEST 3: CHECK DISPATCH QUEUE FOR CORRIDOR DATA ==="
$queue = Invoke-RestMethod -Uri 'http://localhost:8080/api/v1/incidents/queue?page=0&size=5' -Method Get -Headers $headers
Write-Host "Queue Total Elements: $($queue.totalElements)"
foreach ($item in $queue.content) {
  Write-Host "Ticket: $($item.ticketCode) | Corridor: $($item.routeCorridor) | Zone: $($item.zoneName)"
}

Write-Host "`n=== TEST 4: ANALYTICS FILTER BY CORRIDOR QL21 ==="
$analytics = Invoke-RestMethod -Uri 'http://localhost:8080/api/v1/admin/analytics?district=QL21' -Method Get -Headers $headers
Write-Host "Analytics QL21 Total Incidents: $($analytics.totalIncidents)"
Write-Host "Resolved: $($analytics.resolvedIncidents)"
Write-Host "In Progress: $($analytics.inProgressIncidents)"
