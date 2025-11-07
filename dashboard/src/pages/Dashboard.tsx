import { useQuery } from '@tanstack/react-query';
import { analyticsAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Search, Activity, Clock, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
    const navigate = useNavigate()
    const { data: analytics, isLoading } = useQuery({
        queryKey: ['analytics'],
        queryFn: async () => {
            const response = await analyticsAPI.getOverview();
            return response.data;
        },
    });

    const handleCreateGroup = () => {
        // TODO: Implement create group functionality
        console.log('Create new group');
        navigate("/groups/new")
    };

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

            {/* Groups Table */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle>Groups</CardTitle>
                    {/* <Link to="/groups/new"></Link> */}
                    <Button onClick={handleCreateGroup} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Group
                    </Button>
                </CardHeader>
                <CardContent>
                    <table className="w-full">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left p-3 text-sm font-medium">Group Name</th>
                                <th className="text-left p-3 text-sm font-medium">Description</th>
                                <th className="text-right p-3 text-sm font-medium">Total Members</th>
                            </tr>
                        </thead>
                        <tbody>
                            {analytics?.groups && analytics.groups.length > 0 ? (
                                analytics.groups.map((group, index) => (
                                    <tr key={index} className="border-b hover:bg-muted/50">
                                        <td className="p-3 text-sm font-medium">{group.name}</td>
                                        <td className="p-3 text-sm text-muted-foreground">{group.description}</td>
                                        <td className="p-3 text-sm text-muted-foreground text-right">{group.totalMembers}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-muted-foreground">
                                        No groups found. Click "Add Group" to create one.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

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