import nodemailer from 'nodemailer';

export interface ResetEmailPayload {
  to: string;
  fullName: string;
  employeeId: string;
  otpCode: string;
  resetLink: string;
  theme?: 'light' | 'dark';
}

export async function sendPasswordResetEmail(payload: ResetEmailPayload): Promise<{
  sentViaSmtp: boolean;
  htmlPreview: string;
}> {
  const { to, fullName, employeeId, otpCode, resetLink, theme = 'light' } = payload;
  const isDark = theme === 'dark';

  // Bảng màu sắc chuẩn theo hệ thống Speak Right 2026
  const bgBody = isDark ? '#080d1a' : '#edf5ff';
  const bgCard = isDark ? '#111a2e' : '#ffffff';
  const borderCard = isDark ? '#1e293b' : '#dbeafe';
  const textTitle = isDark ? '#f8fafc' : '#0f172a';
  const textBody = isDark ? '#cbd5e1' : '#334155';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const bgOtp = isDark ? '#172554' : '#eff6ff';
  const borderOtp = isDark ? '#3b82f6' : '#2563eb';
  const colorOtp = isDark ? '#60a5fa' : '#1d4ed8';
  const hrBorder = isDark ? '#1e293b' : '#e2e8f0';

  const htmlContent = `<!DOCTYPE html>
<html lang="vi" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Khôi phục mật khẩu - Speak Right 2026</title>
  <style>
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    /* Tự động thích ứng khi người dùng mở Gmail ở chế độ Tối (Dark Mode) */
    @media (prefers-color-scheme: dark) {
      .email-bg { background-color: #080d1a !important; }
      .email-card { background-color: #111a2e !important; border-color: #1e293b !important; }
      .text-title-themed { color: #f8fafc !important; }
      .text-body-themed { color: #cbd5e1 !important; }
      .text-muted-themed { color: #94a3b8 !important; }
      .otp-container-themed { background-color: #172554 !important; border-color: #3b82f6 !important; }
      .otp-digit-themed { color: #60a5fa !important; }
      .divider-themed { border-color: #1e293b !important; }
      .fallback-link-themed { color: #93c5fd !important; }
    }
    /* Tự động thích ứng khi người dùng mở Gmail ở chế độ Sáng (Light Mode) */
    @media (prefers-color-scheme: light) {
      .email-bg { background-color: #edf5ff !important; }
      .email-card { background-color: #ffffff !important; border-color: #dbeafe !important; }
      .text-title-themed { color: #0f172a !important; }
      .text-body-themed { color: #334155 !important; }
      .text-muted-themed { color: #64748b !important; }
      .otp-container-themed { background-color: #eff6ff !important; border-color: #2563eb !important; }
      .otp-digit-themed { color: #1d4ed8 !important; }
      .divider-themed { border-color: #e2e8f0 !important; }
      .fallback-link-themed { color: #2563eb !important; }
    }
    @media only screen and (max-width: 600px) {
      .email-wrapper { padding: 12px !important; }
      .card-content { padding: 20px 16px !important; }
      .otp-digit-themed { font-size: 30px !important; letter-spacing: 6px !important; }
      .cta-button { display: block !important; width: 100% !important; padding: 14px 16px !important; }
    }
  </style>
</head>
<body class="email-bg" style="margin: 0; padding: 0; background-color: ${bgBody}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <div class="email-wrapper" style="padding: 32px 16px; min-height: 100%;">
    <div style="max-width: 580px; margin: 0 auto;">

      <!-- Banner Đầu Thư - Gradient Xanh Samsung Hệ Thống -->
      <div style="background: linear-gradient(135deg, #0d2358 0%, #1d4ed8 50%, #0284c7 100%); padding: 32px 24px 28px; border-radius: 20px 20px 0 0; text-align: center; color: #ffffff; box-shadow: 0 4px 14px rgba(29, 78, 216, 0.2);">
        <div style="display: inline-block; background: rgba(255, 255, 255, 0.16); padding: 5px 14px; border-radius: 999px; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px; border: 1px solid rgba(255, 255, 255, 0.25);">
          ✨ 30 DAYS PRONUNCIATION CHALLENGE
        </div>
        <h1 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 0.5px; color: #ffffff; text-shadow: 0 2px 8px rgba(0,0,0,0.25);">
          SPEAK RIGHT 2026
        </h1>
        <p style="margin: 6px 0 0; font-size: 13px; font-weight: 600; opacity: 0.95; color: #e0f2fe;">
          Khôi phục mật khẩu tài khoản học viên
        </p>
      </div>

      <!-- Thẻ Nội Dung Chính -->
      <div class="email-card card-content" style="background-color: ${bgCard}; padding: 30px 26px; border-radius: 0 0 20px 20px; border: 1px solid ${borderCard}; border-top: none; box-shadow: 0 10px 25px -5px rgba(29, 78, 216, 0.08);">
        
        <p class="text-title-themed" style="margin-top: 0; font-size: 15px; font-weight: 700; color: ${textTitle}; line-height: 1.5;">
          Xin chào <span style="color: #2563eb;">${fullName || 'Học viên'}</span> (Số GEN: <strong>${employeeId}</strong>),
        </p>
        
        <p class="text-body-themed" style="font-size: 14px; line-height: 1.6; color: ${textBody}; margin-bottom: 24px;">
          Hệ thống nhận được yêu cầu lấy lại mật khẩu cho tài khoản tham gia cuộc thi <strong>Speak Right Daily Challenge 2026</strong>. Bạn có thể chọn 1 trong 2 cách bảo mật bên dưới để tiếp tục:
        </p>

        <!-- CÁCH 1: Nhập OTP 6 số -->
        <div class="otp-container-themed" style="background-color: ${bgOtp}; border: 2px dashed ${borderOtp}; border-radius: 16px; padding: 22px 18px; text-align: center; margin: 22px 0;">
          <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: ${isDark ? '#93c5fa' : '#1e40af'}; margin-bottom: 8px;">
            🛡️ CÁCH 1: NHẬP MÃ XÁC THỰC OTP TRÊN ỨNG DỤNG
          </div>
          <div class="otp-digit-themed" style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 38px; font-weight: 900; letter-spacing: 10px; color: ${colorOtp}; padding: 6px 0;">
            ${otpCode}
          </div>
          <div class="text-muted-themed" style="font-size: 12px; font-weight: 600; color: ${textMuted}; margin-top: 8px;">
            ⏱️ Mã có hiệu lực trong vòng <strong>15 phút</strong>. Tuyệt đối không chia sẻ mã này cho bất kỳ ai.
          </div>
        </div>

        <!-- CÁCH 2: Nút bấm trực tiếp (Magic Link) -->
        <div style="text-align: center; margin: 28px 0 20px;">
          <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: ${isDark ? '#93c5fa' : '#1e40af'}; margin-bottom: 12px;">
            ⚡ CÁCH 2: HOẶC BẤM ĐỂ MỞ CỬA SỔ ĐỔI MẬT KHẨU NGAY
          </div>
          <a href="${resetLink}" target="_blank" class="cta-button" style="display: inline-block; background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #0284c7 100%); color: #ffffff; text-decoration: none; font-weight: 800; font-size: 15px; padding: 15px 36px; border-radius: 14px; box-shadow: 0 4px 18px rgba(29, 78, 216, 0.35); letter-spacing: 0.3px; text-align: center;">
            🔑 Đặt Lại Mật Khẩu Ngay
          </a>
          <div class="text-muted-themed" style="margin-top: 14px; font-size: 11px; color: ${textMuted}; line-height: 1.5;">
            (Nếu không bấm được nút trên, bạn có thể sao chép liên kết trực tiếp này vào trình duyệt:)<br>
            <a href="${resetLink}" target="_blank" class="fallback-link-themed" style="color: #2563eb; text-decoration: underline; word-break: break-all; font-size: 11px;">
              ${resetLink}
            </a>
          </div>
        </div>

        <hr class="divider-themed" style="border: none; border-top: 1px solid ${hrBorder}; margin: 26px 0 16px;">

        <p class="text-muted-themed" style="font-size: 12px; line-height: 1.6; color: ${textMuted}; margin: 0;">
          🛡️ <strong>Lưu ý an toàn:</strong> Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua thư. Tài khoản của bạn vẫn được giữ an toàn tuyệt đối.<br>
          Hệ thống <strong>Speak Right Daily Challenge 2026</strong> • Samsung Electronics Vietnam
        </p>
      </div>

      <!-- Footer nhỏ ngoài card -->
      <div style="text-align: center; padding: 16px 8px; font-size: 11px; color: #94a3b8;">
        Email này được gửi tự động từ hệ thống Speak Right 2026. Vui lòng không trả lời thư này.
      </div>

    </div>
  </div>
</body>
</html>`;

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT || 465),
        secure: Number(process.env.SMTP_PORT || 465) === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"Speak Right 2026" <${smtpUser}>`,
        to,
        subject: `[Speak Right 2026] Mã OTP ${otpCode} khôi phục mật khẩu của bạn`,
        html: htmlContent,
      });

      return { sentViaSmtp: true, htmlPreview: htmlContent };
    } catch (err) {
      console.error('Lỗi gửi SMTP, chuyển sang chế độ Demo Preview:', err);
    }
  }

  return { sentViaSmtp: false, htmlPreview: htmlContent };
}
