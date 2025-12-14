import React, { useEffect, useState } from 'react';
import { Announcement } from '../../types/api';
import { API_CONFIG } from '../../config/api';

export const AnnouncementSection: React.FC = () => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadAnnouncements();
    }, []);

    const loadAnnouncements = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // 直接用 fetch 请求
            const response = await fetch(`${API_CONFIG.BASE_URL}/api/announcements`);
            const data = await response.json();
            
            if (data.code === 200 && data.data) {
                setAnnouncements(data.data.announcements || []);
            } else {
                setError(data.message || '获取公告失败');
            }
        } catch (err) {
            console.error('加载公告失败:', err);
            setError('加载公告失败，请检查后端服务');
        } finally {
            setLoading(false);
        }
    };

    const getTypeClass = (type: string) => {
        switch (type) {
            case 'warning': return 'warning';
            case 'success': return 'success';
            case 'error': return 'error';
            default: return '';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'warning': return '⚠️';
            case 'success': return '✅';
            case 'error': return '❌';
            default: return '📢';
        }
    };

    if (loading) {
        return (
            <div className="announcement-section card">
                <div className="announcement-header">
                    <h3>📢 公告</h3>
                </div>
                <div className="announcement-content">
                    加载中...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="announcement-section card">
                <div className="announcement-header">
                    <h3>📢 公告</h3>
                </div>
                <div className="announcement-content error">
                    {error}
                </div>
            </div>
        );
    }

    if (announcements.length === 0) {
        return (
            <div className="announcement-section card">
                <div className="announcement-header">
                    <h3>📢 公告</h3>
                </div>
                <div className="announcement-content">
                    暂无公告
                </div>
            </div>
        );
    }

    return (
        <>
            {announcements.map((announcement) => (
                <div key={announcement.id} className="announcement-section card">
                    <div className="announcement-header">
                        <h3>{getTypeIcon(announcement.type)} {announcement.title}</h3>
                    </div>
                    <div className={`announcement-content ${getTypeClass(announcement.type)}`}>
                        <div dangerouslySetInnerHTML={{ __html: announcement.content }} />
                    </div>
                </div>
            ))}
        </>
    );
};
