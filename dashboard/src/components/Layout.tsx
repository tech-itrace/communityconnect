import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
    Group,
    Users,
    BarChart3,
    Settings,
    LogOut,
    Menu,
    X,
    Phone,
    MessageCircle
} from 'lucide-react';
import { useState } from 'react';
import { getUserPhone, formatPhone, clearUserContext } from '@/lib/auth';
import { Card } from './ui/card';

const navigation = [
    { name: 'Dashboard', href: '/', icon: BarChart3 },
    { name: 'Community', href: '/community', icon: Group },
    // { name: 'Groups', href: '/groups', icon: Group },
    // { name: 'Members', href: '/members', icon: Users },
    { name: 'Chat', href: '/chat', icon: MessageCircle },
    { name: 'Settings', href: '/settings', icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const userPhone = getUserPhone();

    const handleLogout = () => {
        clearUserContext();
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Mobile sidebar */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
                    <div className="fixed inset-y-0 left-0 w-64 bg-card border-r">
                        <div className="flex h-16 items-center justify-between px-6 border-b">
                            <h1 className="text-xl font-bold">Community Connect</h1>
                            <button onClick={() => setSidebarOpen(false)}>
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <nav className="flex flex-col gap-1 p-4">
                            {navigation.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.href}
                                        onClick={() => setSidebarOpen(false)}
                                        className={cn(
                                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                                            isActive
                                                ? 'bg-primary text-primary-foreground'
                                                : 'hover:bg-accent'
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {item.name}
                                    </Link>
                                );
                            })}
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent mt-auto"
                            >
                                <LogOut className="h-4 w-4" />
                                Logout
                            </button>
                        </nav>
                    </div>
                </div>
            )}

            {/* Desktop sidebar */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
                <div className="flex flex-col flex-1 border-r bg-card">
                    <div className="flex h-16 items-center px-6 border-b">
                        <h1 className="text-xl font-bold">Community Connect</h1>
                    </div>
                    <nav className="flex flex-col flex-1 gap-1 p-4">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={cn(
                                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                                        isActive
                                            ? 'bg-primary text-primary-foreground'
                                            : 'hover:bg-accent'
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.name}
                                </Link>
                            );
                        })}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent mt-auto"
                        >
                            <LogOut className="h-4 w-4" />
                            Logout
                        </button>
                    </nav>
                </div>
            </div>

            {/* Main content */}
            <div className="lg:pl-64">
                <div className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-8">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden"
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                    <div className="flex-1" />

                    {/* User info display */}
                    {userPhone && (
                        <Card className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border-blue-200">
                            <Phone className="h-3.5 w-3.5 text-blue-600" />
                            <span className="text-sm text-gray-700">
                                {formatPhone(userPhone)}
                            </span>
                        </Card>
                    )}
                </div>
                <main className="p-4 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
