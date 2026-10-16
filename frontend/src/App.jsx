import { useState } from 'react';
import AuthPage from './components/AuthPage';
import TaskDashboard from './components/TaskDashboard';
import './App.css';

function App() {
    const [user, setUser] = useState(() => {
        try {
            const savedUser = localStorage.getItem('user');
            const token = localStorage.getItem('access_token');

            return savedUser && token ? JSON.parse(savedUser) : null;
        } catch {
            return null;
        }
    });

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        setUser(null);
    };

    if (!user) {
        return <AuthPage onLogin={setUser} />;
    }

    return <TaskDashboard user={user} onLogout={handleLogout} />;
}

export default App;