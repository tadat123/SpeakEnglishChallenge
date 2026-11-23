// Script tự động dọn dẹp 100% tài khoản Load Test (GEN 999xxxxx) sau khi chạy k6
const BASE_URL = process.env.BASE_URL || 'https://removable-qld-complement-castle.trycloudflare.com';
const ADMIN_ID = process.env.ADMIN_ID || '88888888';
const ADMIN_PASS = process.env.ADMIN_PASS || 'Admin@2026';

async function cleanup() {
  console.log(`[Cleanup] Đang đăng nhập Admin trên ${BASE_URL}...`);
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: ADMIN_ID, password: ADMIN_PASS }),
  });

  if (!loginRes.ok) {
    console.error(`[Cleanup] Không thể đăng nhập Admin (HTTP ${loginRes.status}):`, await loginRes.text());
    process.exit(1);
  }

  const loginData = await loginRes.json();
  const token = loginData.accessToken || loginData.token;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const usersRes = await fetch(`${BASE_URL}/api/admin/users?search=999`, { headers });
  if (!usersRes.ok) {
    console.error(`[Cleanup] Không thể lấy danh sách user (HTTP ${usersRes.status})`);
    process.exit(1);
  }

  const { users } = await usersRes.json();
  const testUsers = (users || []).filter(
    (u) => String(u.employeeId || '').startsWith('999') || String(u.email || '').startsWith('loadtest.')
  );

  console.log(`[Cleanup] Tìm thấy ${testUsers.length} tài khoản Load Test (999xxxxx). Đang xóa...`);

  let deleted = 0;
  for (const u of testUsers) {
    const delRes = await fetch(`${BASE_URL}/api/admin/users/${u.id}`, {
      method: 'DELETE',
      headers,
    });
    if (delRes.ok) {
      deleted++;
    }
    // Nghỉ nhẹ 150ms để tránh chạm rate limit khi xóa
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(`[Cleanup] Hoàn tất! Đã xóa sạch ${deleted}/${testUsers.length} tài khoản Load Test.`);
}

cleanup().catch((err) => {
  console.error('[Cleanup Error]', err);
  process.exit(1);
});
