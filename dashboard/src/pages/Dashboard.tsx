import { useQuery } from '@tanstack/react-query';
import { analyticsAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Search, Activity, Clock } from 'lucide-react';

export function Dashboard() {
    const { data: analytics, isLoading } = useQuery({
        queryKey: ['analytics'],
        queryFn: async () => {
            const response = await analyticsAPI.getOverview();
            return response.data;
        },
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-muted-foreground">Loading analytics...</div>
            </div>
        );
    }

    const stats = [
        {
            title: 'Total Members',
            value: analytics?.totalMembers || 0,
            icon: Users,
            change: '+12%',
        },
        {
            title: 'Total Searches',
            value: analytics?.totalSearches || 0,
            icon: Search,
            change: '+23%',
        },
        {
            title: 'Active Users',
            value: analytics?.activeUsers || 0,
            icon: Activity,
            change: '+5%',
        },
        {
            title: 'Avg Response Time',
            value: `${analytics?.avgResponseTime || 0}ms`,
            icon: Clock,
            change: '-8%',
        },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground mt-2">
                    Overview of your community search analytics
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={stat.title}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {stat.title}
                                </CardTitle>
                                <Icon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stat.value}</div>
                                <p className="text-xs text-muted-foreground">
                                    <span className="text-green-600">{stat.change}</span> from last month
                                </p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Searches Over Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={analytics?.searchesByDay || []}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Top Search Queries</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analytics?.topQueries?.slice(0, 5) || []}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="query" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="#3b82f6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Member Activity */}
            <Card>
                <CardHeader>
                    <CardTitle>Most Active Members</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {analytics?.memberActivity?.slice(0, 5).map((member, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <p className="font-medium">{member.name}</p>
                                    </div>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {member.searches} searches
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
