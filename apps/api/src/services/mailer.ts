import nodemailer from 'nodemailer';

export interface ResetEmailPayload {
  to: string;
  fullName: string;
  employeeId: string;
  otpCode: string;
  resetLink: string;
}

export async function sendPasswordResetEmail(payload: ResetEmailPayload): Promise<{
  sentViaSmtp: boolean;
  htmlPreview: string;
}> {
  const { to, fullName, employeeId, otpCode, resetLink } = payload;

  const htmlContent = `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #f8fafc; padding: 24px; border-radius: 16px; border: 1px solid #e2e8f0;">
    <div style="background: linear-gradient(135deg, #1d4ed8, #2563eb); padding: 24px; border-radius: 12px; text-align: center; color: #ffffff;">
      <h2 style="margin: 0; font-size: 22px; letter-spacing: 0.5px;">SPEAK RIGHT CHALLENGE 2026</h2>
      <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">Khôi phục mật khẩu tài khoản nhân viên</p>
    </div>

    <div style="background: #ffffff; padding: 24px; border-radius: 12px; margin-top: 16px; color: #1e293b;">
      <p style="margin-top: 0;">Xin chào <strong>${fullName}</strong> (Số GEN: <strong>${employeeId}</strong>),</p>
      <p>Hệ thống nhận được yêu cầu lấy lại mật khẩu cho tài khoản tham gia <strong>Speak Right Daily Challenge 2026</strong> của bạn.</p>

      <div style="background: #eff6ff; border: 2px dashed #3b82f6; border-radius: 12px; padding: 16px; text-align: center; margin: 20px 0;">
        <div style="font-size: 13px; color: #475569; margin-bottom: 6px;">CÁCH 1: Nhập mã xác thực OTP (6 chữ số) trên ứng dụng</div>
        <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8;">${otpCode}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 6px;">Mã có hiệu lực trong vòng 15 phút</div>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <div style="font-size: 13px; color: #475569; margin-bottom: 12px;">CÁCH 2: Hoặc bấm trực tiếp vào nút dưới đây để đặt lại mật khẩu ngay</div>
        <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; text-decoration: none; font-weight: 700; padding: 14px 28px; border-radius: 10px; font-size: 15px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
          🔑 Đặt Lại Mật Khẩu Ngay
        </a>
      </div>

      <p style="font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-bottom: 0;">
        Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này. Tài khoản của bạn vẫn an toàn.
      </p>
    </div>
  </div>
  `;

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
