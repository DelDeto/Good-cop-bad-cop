# Điệp Viên Số Dách Online — V1.5

Game Good Cop Bad Cop Online, 4–8 người, multiplayer và 3–7 BOT; 23 lá trang bị, lá thân phận và súng. Mã nguồn xuất từ bản V1.5 đã triển khai Cloudflare.

## Cấu trúc
- `worker.mjs`: Cloudflare Worker và Durable Object `GameRoom`
- `src/engine.mjs`: luật chơi, BOT, quản lý ván
- `assets/`: giao diện nhúng cho Cloudflare
- `public/`: giao diện phục vụ chế độ local Node.js
- `server.mjs`: máy chủ local Node.js (cần đồng bộ với Worker)

## Chạy thử
Node.js >= 20. `npm start` để chơi local và `npm test` để chạy kiểm thử.

## Lưu ý
Bản V1.5 còn cần audit 23 hiệu ứng trang bị, bảo mật thông tin và kiểm thử đa thiết bị trước khi dùng công khai. Không tự triển khai thay đổi thẳng lên production nếu chưa qua test và review. Hình vẽ tạo mới; không sao chép artwork thương mại của bộ bài gốc.
