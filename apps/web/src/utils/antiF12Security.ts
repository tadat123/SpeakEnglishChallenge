/**
 * Anti-F12 & DevTools Security Guard (Bảo vệ chống F12, Inspect, View Source & Chống Gian Lận)
 * 1. Chặn phím tắt F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S, Cmd+Option+I/J/C
 * 2. Vô hiệu hóa chuột phải (Context Menu)
 * 3. Phát hiện DevTools mở (Docked metrics, console getter trap, debugger timing)
 * 4. Tự động xóa Console định kỳ và làm sạch console.log trong môi trường Production
 * 5. Hiển thị cảnh báo an toàn bảo mật trực quan
 */

type DevToolsChangeCallback = (isOpen: boolean) => void;

class AntiF12Security {
  private isDevToolsOpen = false;
  private listeners: DevToolsChangeCallback[] = [];
  private checkInterval: any = null;
  private toastTimeout: any = null;
  private toastElement: HTMLElement | null = null;
  private overlayElement: HTMLElement | null = null;

  /**
   * Khởi động toàn bộ lá chắn bảo mật
   */
  public init() {
    if (typeof window === 'undefined') return;

    // 1. Chặn phím tắt F12 & các tổ hợp phím mở Developer Tools
    this.blockKeyCombinations();

    // 2. Chặn chuột phải (Context Menu -> Inspect Element)
    this.blockContextMenu();

    // 3. Vô hiệu hóa Console logging & dọn dẹp console định kỳ
    this.sanitizeConsole();

    // 4. Bật máy quét phát hiện DevTools đang mở
    this.startDevToolsDetection();
  }

  /**
   * Lắng nghe sự kiện thay đổi trạng thái DevTools (Mở / Đóng)
   */
  public onDevToolsChange(callback: DevToolsChangeCallback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * 1. Chặn toàn bộ phím tắt liên quan đến F12, DevTools, Inspect & View Source
   */
  private blockKeyCombinations() {
    window.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
        const altOrOpt = isMac ? e.altKey : e.altKey;

        // F12 (keyCode 123)
        if (e.key === 'F12' || e.keyCode === 123) {
          this.preventAndNotify(e, 'Phím F12 bị vô hiệu hóa vì mục đích bảo mật cuộc thi!');
          return false;
        }

        // Ctrl + Shift + I (Inspect) hoặc Cmd + Option + I
        if (
          (ctrlOrCmd && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) ||
          (isMac && ctrlOrCmd && altOrOpt && (e.key === 'I' || e.key === 'i'))
        ) {
          this.preventAndNotify(e, 'Tổ hợp phím Kiểm tra (Inspect) đã bị khóa!');
          return false;
        }

        // Ctrl + Shift + J (Console) hoặc Cmd + Option + J
        if (
          (ctrlOrCmd && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) ||
          (isMac && ctrlOrCmd && altOrOpt && (e.key === 'J' || e.key === 'j'))
        ) {
          this.preventAndNotify(e, 'Cửa sổ Console bị vô hiệu hóa!');
          return false;
        }

        // Ctrl + Shift + C (Inspect Element Picker) hoặc Cmd + Option + C
        if (
          (ctrlOrCmd && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) ||
          (isMac && ctrlOrCmd && altOrOpt && (e.key === 'C' || e.key === 'c'))
        ) {
          this.preventAndNotify(e, 'Công cụ soi mã nguồn (Inspect Element) đã bị khóa!');
          return false;
        }

        // Ctrl + Shift + K (Firefox Web Console)
        if (ctrlOrCmd && e.shiftKey && (e.key === 'K' || e.key === 'k' || e.keyCode === 75)) {
          this.preventAndNotify(e, 'Console bị vô hiệu hóa!');
          return false;
        }

        // Ctrl + U (View Source) hoặc Cmd + Option + U
        if (
          (ctrlOrCmd && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) ||
          (isMac && ctrlOrCmd && altOrOpt && (e.key === 'U' || e.key === 'u'))
        ) {
          this.preventAndNotify(e, 'Chức năng Xem mã nguồn trang (View Source) đã bị khóa!');
          return false;
        }

        // Ctrl + S (Save Page / Tải HTML về máy)
        if (ctrlOrCmd && (e.key === 'S' || e.key === 's' || e.keyCode === 83)) {
          this.preventAndNotify(e, 'Chức năng lưu trang web đã bị khóa!');
          return false;
        }

        // Shift + F10 (Mở menu ngữ cảnh bằng bàn phím)
        if (e.shiftKey && (e.key === 'F10' || e.keyCode === 121)) {
          this.preventAndNotify(e, 'Menu ngữ cảnh bị khóa!');
          return false;
        }
      },
      true // capture phase
    );
  }

  /**
   * 2. Vô hiệu hóa chuột phải (Context Menu)
   */
  private blockContextMenu() {
    window.addEventListener(
      'contextmenu',
      (e: MouseEvent) => {
        // Cho phép thao tác trên input/textarea để paste nếu cần
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        this.showToast('⚠️ Chuột phải bị vô hiệu hóa để bảo vệ tính công bằng cuộc thi!');
        return false;
      },
      true
    );
  }

  /**
   * 3. Vô hiệu hóa Console logging & dọn dẹp Console định kỳ
   */
  private sanitizeConsole() {
    try {
      // Vô hiệu hóa console.log, info, debug, warn trong môi trường chạy thực tế
      const noop = () => {};
      window.console.log = noop;
      window.console.debug = noop;
      window.console.info = noop;
      window.console.warn = noop;

      // Xóa sạch console định kỳ mỗi 2.5 giây
      setInterval(() => {
        try {
          window.console.clear();
        } catch {
          // ignore
        }
      }, 2500);
    } catch {
      // ignore
    }
  }

  /**
   * 4. Phát hiện DevTools mở (Window Metrics & Console Trap)
   */
  private startDevToolsDetection() {
    const check = () => {
      let open = false;

      // Phương pháp 1: Chênh lệch kích thước cửa sổ (Docked DevTools)
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      if (widthThreshold || heightThreshold) {
        open = true;
      }

      // Phương pháp 2: Console getter trap (chỉ kích hoạt khi console mở để render)
      try {
        const dummy = new Image();
        Object.defineProperty(dummy, 'id', {
          get: () => {
            open = true;
            return 'devtools-detector';
          },
        });
        // Gọi lệnh ngầm không hiển thị ra ngoài
        window.console.debug?.(dummy);
      } catch {
        // ignore
      }

      if (open !== this.isDevToolsOpen) {
        this.isDevToolsOpen = open;
        this.notifyListeners(open);
        this.toggleSecurityOverlay(open);
      }
    };

    // Kiểm tra liên tục mỗi 1200ms
    this.checkInterval = setInterval(check, 1200);
  }

  private notifyListeners(isOpen: boolean) {
    for (const listener of this.listeners) {
      try {
        listener(isOpen);
      } catch {
        // ignore
      }
    }
  }

  private preventAndNotify(e: Event, msg: string) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    this.showToast(msg);
  }

  /**
   * Hiển thị Toast cảnh báo bảo mật đẹp mắt ở góc trên màn hình
   */
  public showToast(message: string) {
    if (typeof document === 'undefined') return;

    if (!this.toastElement) {
      const el = document.createElement('div');
      el.id = 'speak-security-toast';
      el.style.position = 'fixed';
      el.style.top = '18px';
      el.style.left = '50%';
      el.style.transform = 'translateX(-50%)';
      el.style.zIndex = '999999';
      el.style.padding = '12px 20px';
      el.style.borderRadius = '16px';
      el.style.background = 'linear-gradient(135deg, #1e293b, #0f172a)';
      el.style.color = '#f8fafc';
      el.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)';
      el.style.border = '1px solid #ef4444';
      el.style.fontSize = '13px';
      el.style.fontWeight = '800';
      el.style.fontFamily = 'Nunito, sans-serif';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.gap = '8px';
      el.style.pointerEvents = 'none';
      el.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
      el.style.opacity = '0';
      document.body.appendChild(el);
      this.toastElement = el;
    }

    this.toastElement.innerHTML = `🛡️ <span style="color: #f87171;">BẢO MẬT:</span> ${message}`;
    this.toastElement.style.opacity = '1';
    this.toastElement.style.transform = 'translateX(-50%) translateY(0)';

    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastTimeout = setTimeout(() => {
      if (this.toastElement) {
        this.toastElement.style.opacity = '0';
        this.toastElement.style.transform = 'translateX(-50%) translateY(-10px)';
      }
    }, 3200);
  }

  /**
   * Hiển thị lớp phủ bảo mật khi phát hiện DevTools đang mở
   */
  private toggleSecurityOverlay(show: boolean) {
    if (typeof document === 'undefined') return;

    if (show) {
      if (!this.overlayElement) {
        const overlay = document.createElement('div');
        overlay.id = 'speak-security-barrier';
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.zIndex = '999998';
        overlay.style.background = 'rgba(15, 23, 42, 0.94)';
        overlay.style.backdropFilter = 'blur(12px)';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.padding = '24px';
        overlay.style.color = '#ffffff';
        overlay.style.fontFamily = 'Nunito, sans-serif';
        overlay.style.textAlign = 'center';

        overlay.innerHTML = `
          <div style="max-width: 480px; background: #1e293b; border: 2px solid #ef4444; border-radius: 28px; padding: 32px 24px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);">
            <div style="width: 64px; height: 64px; border-radius: 20px; background: rgba(239, 68, 68, 0.15); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 32px;">
              🚫
            </div>
            <h2 style="font-size: 20px; font-weight: 900; color: #f87171; margin-bottom: 8px;">
              CẢNH BÁO BẢO MẬT HỆ THỐNG
            </h2>
            <p style="font-size: 14px; font-weight: 700; color: #cbd5e1; line-height: 1.6; margin-bottom: 20px;">
              Phát hiện công cụ Nhà phát triển (F12 / DevTools / Inspect) đang hoạt động.<br/>
              Nhằm đảm bảo tính công bằng, bảo mật ngân hàng đề thi và chống gian lận bảng xếp hạng, vui lòng <strong>đóng cửa sổ DevTools</strong> để tiếp tục làm bài.
            </p>
            <div style="font-size: 12px; font-weight: 800; color: #94a3b8; background: #0f172a; padding: 10px 16px; border-radius: 12px; border: 1px dashed #334155;">
              Hệ thống tự động mở lại ngay khi bạn đóng DevTools
            </div>
          </div>
        `;
        document.body.appendChild(overlay);
        this.overlayElement = overlay;
      }
      this.overlayElement.style.display = 'flex';
    } else {
      if (this.overlayElement) {
        this.overlayElement.style.display = 'none';
      }
    }
  }
}

export const antiF12Security = new AntiF12Security();
