import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { memberAPI, type Member } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export function Members() {
    const [searchQuery, setSearchQuery] = useState('');
    const queryClient = useQueryClient();

    const { data: members, isLoading } = useQuery({
        queryKey: ['members'],
        queryFn: async () => {
            const response = await memberAPI.getAll();
            return response.data;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => memberAPI.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['members'] });
        },
    });

    const filteredMembers = members?.filter((member) =>
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.phone_number.includes(searchQuery) ||
        member.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDelete = (id: number, name: string) => {
        if (window.confirm(`Are you sure you want to delete ${name}?`)) {
            deleteMutation.mutate(id);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-muted-foreground">Loading members...</div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Members</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage your community members
                    </p>
                </div>
                <Link to="/members/new">
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Member
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search members..."
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
                                    <th className="text-left p-3 text-sm font-medium">Name</th>
                                    <th className="text-left p-3 text-sm font-medium">Phone</th>
                                    <th className="text-left p-3 text-sm font-medium">Email</th>
                                    <th className="text-left p-3 text-sm font-medium">Location</th>
                                    <th className="text-left p-3 text-sm font-medium">Expertise</th>
                                    <th className="text-right p-3 text-sm font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMembers?.map((member) => (
                                    <tr key={member.id} className="border-b hover:bg-muted/50">
                                        <td className="p-3 text-sm font-medium">{member.name}</td>
                                        <td className="p-3 text-sm text-muted-foreground">{member.phone_number}</td>
                                        <td className="p-3 text-sm text-muted-foreground">{member.email || '-'}</td>
                                        <td className="p-3 text-sm text-muted-foreground">{member.location || '-'}</td>
                                        <td className="p-3 text-sm text-muted-foreground">
                                            {member.expertise ? (
                                                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs">
                                                    {member.expertise.split(',')[0]}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link to={`/members/${member.id}`}>
                                                    <Button variant="ghost" size="icon">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Link to={`/members/${member.id}/edit`}>
                                                    <Button variant="ghost" size="icon">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(member.id, member.name)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredMembers?.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground">
                                No members found
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
