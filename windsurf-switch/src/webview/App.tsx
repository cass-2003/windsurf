import React from 'react';
import { StateProvider } from './hooks/useAppState';
import { Header } from './components/Header';
import { CurrentAccount } from './components/CurrentAccount';
import { SwitchSettings } from './components/SwitchSettings';
import { AddAccount } from './components/AddAccount';
import { AccountList } from './components/AccountList';
import './styles.css';

const App: React.FC = () => {
    return (
        <StateProvider>
            <div className="app">
                <Header />
                <CurrentAccount />
                <SwitchSettings />
                <AddAccount />
                <AccountList />
            </div>
        </StateProvider>
    );
};

export default App;
