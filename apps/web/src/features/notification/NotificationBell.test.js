import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotificationBell from './NotificationBell';

describe('NotificationBell', () => {
  const mockNotifications = [
    {
      id: '1',
      title: 'Báo cáo đã được tiếp nhận',
      message: 'Báo cáo sự cố #123 của bạn đã được admin tiếp nhận.',
      isRead: false,
      createdAt: '2026-05-28T10:00:00.000Z'
    },
    {
      id: '2',
      title: 'Phản hồi mới',
      message: 'Admin đã gửi phản hồi cho báo cáo #124.',
      isRead: true,
      createdAt: '2026-05-27T14:30:00.000Z'
    },
    {
      id: '3',
      title: 'Báo cáo đã xử lý',
      message: 'Người dân đã resolve báo cáo #125.',
      isRead: false,
      createdAt: '2026-05-28T11:00:00.000Z'
    }
  ];

  beforeEach(() => {
    global.fetch = jest.fn((url) => {
      if (url === '/api/notifications') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockNotifications)
        });
      }
      if (url.match(/\/api\/notifications\/\d+\/read/)) {
        return Promise.resolve({ ok: true });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('renders the bell and fetches notifications on mount', async () => {
    render(<NotificationBell />);
    
    // Đảm bảo fetch được gọi
    expect(global.fetch).toHaveBeenCalledWith('/api/notifications');

    // Mở popup
    fireEvent.click(screen.getByRole('button', { name: /🔔/i }));

    // Chờ popup hiển thị danh sách
    await waitFor(() => {
      expect(screen.getByText('Báo cáo đã được tiếp nhận')).toBeInTheDocument();
      expect(screen.getByText('Báo cáo sự cố #123 của bạn đã được admin tiếp nhận.')).toBeInTheDocument();
    });

    // Check count (2 unread in mock)
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('marks a notification as read when clicked', async () => {
    render(<NotificationBell />);
    
    // Mở popup
    fireEvent.click(screen.getByRole('button', { name: /🔔/i }));

    await waitFor(() => {
      expect(screen.getByText('Báo cáo đã được tiếp nhận')).toBeInTheDocument();
    });

    // Click vào item chưa đọc
    fireEvent.click(screen.getByText('Báo cáo đã được tiếp nhận').closest('li'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/notifications/1/read', expect.objectContaining({ method: 'PATCH' }));
    });
    
    // Sau khi gọi API patch, nó sẽ gọi fetch lấy list mới
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(3); // 1 init, 1 patch, 1 refresh
    });
  });

  it('refreshes notifications periodically', async () => {
    render(<NotificationBell />);
    
    expect(global.fetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(30000);
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
