# Cloudflare Workers + Durable Objects

- Entrypoint: `worker.mjs`, binding: `GAME_ROOMS`
- Durable Object class: `GameRoom`, SQLite migration tag `v1`
- Mỗi phòng lưu trạng thái trên Durable Object; SSE đồng bộ và tự kết nối lại.
- API Health: `/api/health`
- Hiện chưa cấu hình tự động deploy từ repository này. Hãy cấu hình Workers Builds hoặc CI/CD và review trước khi release.
