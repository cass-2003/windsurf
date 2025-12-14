import React from 'react';
import { useAppState } from '../hooks/useAppState';

export const SwitchSettings: React.FC = () => {
    const { state, setRefreshAfterSwitch } = useAppState();

    const handleToggle = () => {
        const currentValue = state?.refreshAfterSwitch ?? true;
        setRefreshAfterSwitch(!currentValue);
    };

    return (
        <div className="card switch-settings">
            <h3>切换设置</h3>
            <div className="setting-row">
                <span className="setting-label">切换后刷新窗口</span>
                <label className="toggle-switch">
                    <input
                        type="checkbox"
                        checked={state?.refreshAfterSwitch ?? true}
                        onChange={handleToggle}
                    />
                    <span className="toggle-slider"></span>
                </label>
            </div>
        </div>
    );
};
