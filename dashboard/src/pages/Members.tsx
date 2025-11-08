import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { memberAPI, groupAPI, type Member } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, Eye, Upload, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BulkImportDialog } from '@/components/BulkImportDialog';
// import { Badge } from '@/components/ui/badge';

export function Members() {
    const [searchQuery, setSearchQuery] = useState('');
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const queryClient = useQueryClient();
    
    const groupId = searchParams.get('groupId');

    // const { data: members, isLoading } = useQuery({
    //     queryKey: ['members'],
    //     queryFn: async () => {
    //         const response = await memberAPI.getAll();
    //         return response.data.members || [];
    //     },
    // });

    // Fetch group details if groupId is present
    const { data: groupData, isLoading } = useQuery({
        queryKey: ['group', groupId],
        queryFn: async () => {
            if (!groupId) return null;
            const response = await groupAPI.getById(groupId);
            return response.data;
        },
        enabled: !!groupId,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => memberAPI.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['members'] });
            if (groupId) {
                queryClient.invalidateQueries({ queryKey: ['group', groupId] });
            }
        },
    });
console.log("groupData:" + JSON.stringify(groupData))
    // Filter members based on group if groupId is present
    const displayMembers = groupData?.group.members;
    // if (groupId && groupData?.members) {
    //     const groupMemberIds = new Set(groupData.members.map((m: any) => m.id));
    //     displayMembers = groupData?.members?.filter((member) => groupMemberIds.has(member.id));
    // }
console.log("displayMembers:" + JSON.stringify(displayMembers))
    const filteredMembers = displayMembers?.filter((member) =>
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.phone.includes(searchQuery) ||
        member.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
console.log("filteredMembers:" + JSON.stringify(filteredMembers))
    const handleClearFilter = () => {
        setSearchParams({});
    };

    const handleDelete = (id: string, name: string) => {
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
                    <h1 className="text-3xl font-bold">Members - {groupData?.group.name}</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage your community members
                    </p>
                    {/* {groupData && (
                        <Badge variant="secondary" className="mt-2">
                        <>                            Filtered by: {groupData.name}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 ml-2 p-0"
                                onClick={handleClearFilter}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                            </>

                        </Badge>
                    )} */}
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                        <Upload className="h-4 w-4 mr-2" />
                        Bulk Import
                    </Button>
                    <Link to="/members/new">
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Member
                        </Button>
                    </Link>
                </div>
            </div>

            <BulkImportDialog open={showImportDialog} onOpenChange={setShowImportDialog} />

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
                                    <th className="text-left p-3 text-sm font-medium">City</th>
                                    <th className="text-left p-3 text-sm font-medium">Skills</th>
                                    <th className="text-right p-3 text-sm font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayMembers?.map((member) => (
                                    <tr key={member.id} className="border-b hover:bg-muted/50">
                                        <td className="p-3 text-sm font-medium">{member.name}</td>
                                        <td className="p-3 text-sm text-muted-foreground">{member.phone}</td>
                                        <td className="p-3 text-sm text-muted-foreground">{member.email || '-'}</td>
                                        <td className="p-3 text-sm text-muted-foreground">{member.city || '-'}</td>
                                        <td className="p-3 text-sm text-muted-foreground">
                                            {member.working_knowledge ? (
                                                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs">
                                                    {member.working_knowledge.split(',')[0]}
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