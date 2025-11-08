import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupAPI, type Group } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, Eye, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export function Groups() {
    const [searchQuery, setSearchQuery] = useState('');
    const queryClient = useQueryClient();
    const navigate = useNavigate()

    const { data: groups, isLoading } = useQuery({
        queryKey: ['groups'],
        queryFn: async () => {
            const response = await groupAPI.getAll();
            // API returns { success, groups, pagination }
            // Extract just the groups array
            return response.data.groups || [];
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => groupAPI.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
        },
    });

    const filteredGroups = groups?.filter((group) =>
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDelete = (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete ${name}?`)) {
            deleteMutation.mutate(id);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-muted-foreground">Loading groups...</div>
            </div>
        );
    }


    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Groups</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage your community groups
                    </p>
                </div>
                <Link to="/groups/new">
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Group
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search groups..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-3 text-sm font-medium">Group Name</th>
                                    <th className="text-left p-3 text-sm font-medium">Description</th>
                                    <th className="text-right p-3 text-sm font-medium">Total Members</th>
                                    <th className="text-right p-3 text-sm font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredGroups?.map((group) => (
                                    <tr key={group.id} className="border-b hover:bg-muted/50">
                                        <td className="p-3 text-sm font-medium">{group.name}</td>
                                        <td className="p-3 text-sm text-muted-foreground">{group.description || '-'}</td>
                                        <td className="p-3 text-sm text-muted-foreground text-right">
                                              <Link to={`/members?groupId=${group.id}`}>
                                            <span className="inline-flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                {group.members.length || 0}
                                            </span>
                                            </Link>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link to={`/groups/${group.id}`}>
                                                    <Button variant="ghost" size="icon">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Link to={`/groups/${group.id}/edit`}>
                                                    <Button variant="ghost" size="icon">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(group.id, group.name)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredGroups?.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground">
                                No groups found
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}