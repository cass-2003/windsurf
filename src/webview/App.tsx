import React from 'react';
import { ExtensionStateProvider } from './hooks/useExtensionState';
import { BrandHeader } from './components/BrandFooter';
import { AccountInfo } from './components/AccountInfo';
import { AuthSection } from './components/AuthSection';
import { HistoricalAccounts } from './components/HistoricalAccounts';
import { CursorKeyConverter } from './components/CursorKeyConverter';
import { AnnouncementSection } from './components/AnnouncementSection';
import './styles.css';

const App: React.FC = () => {
    return (
        <ExtensionStateProvider>
            <div className="app">
                <BrandHeader />
                <AccountInfo />
                <AuthSection />
                <HistoricalAccounts />
                <CursorKeyConverter />
                <AnnouncementSection />
            </div>
        </ExtensionStateProvider>
    );
};

export default App;
