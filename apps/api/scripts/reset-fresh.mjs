import { store } from '../dist/services/store.js';

async function main() {
  console.log('🧹 Đang tiến hành thiết lập hệ thống mới toanh...');
  const res = await store.resetToFreshAdminOnly();
  console.log('✅ ' + res.message);
  console.log('👑 Tài khoản Quản trị viên (Admin) duy nhất:');
  console.log('   - Số GEN: 88888888');
  console.log('   - Mật khẩu: Admin@2026');
  console.log('   - Quyền: ADMIN');
  console.log('   - Email: admin.speakright@gmail.com');
  console.log('📊 Người dùng thông thường: 0 người (chờ nhân viên đăng ký thật)');
  console.log('📝 Lịch sử bài làm (Attempts): 0 bản ghi');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Lỗi thiết lập mới:', err);
  process.exit(1);
});
