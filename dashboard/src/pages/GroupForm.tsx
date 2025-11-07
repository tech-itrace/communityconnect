import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { groupAPI, memberAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';

export function GroupForm() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isEdit = id !== 'new';

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        members: [] as string[]
    });

    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

    // Fetch single group for editing
    const { data: groupResponse } = useQuery({
        queryKey: ['group', id],
        queryFn: async () => {
            const response = await groupAPI.getById(id!);
            return response.data; // This returns groupResponse type: { success: boolean, group: Group }
        },
        enabled: isEdit,
    });

    // Fetch all members for selection
    const { data: membersResponse } = useQuery({
        queryKey: ['members'],
        queryFn: async () => {
            const response = await memberAPI.getAll();
            return response.data; // This returns { success: boolean, members: Member[], pagination: {...} }
        },
    });

    // Extract group from response
    const group = groupResponse?.group;
    const allMembers = membersResponse?.members || [];

    useEffect(() => {
        if (group) {
            setFormData({
                name: group.name || '',
                description: group.description || '',
                members: group.members || [],
            });
            setSelectedMembers(group.members || []);
        }
    }, [group]);

    const saveMutation = useMutation({
        mutationFn: (data: { name: string; description: string; members: string[] }) => {
            console.log('Mutation function called with:', data);
            if (isEdit) {
                console.log('Updating group:', id);
                return groupAPI.update(id!, data);
            }
            console.log('Creating new group');
            return groupAPI.create(data);
        },
        onSuccess: (response) => {
            console.log('Group saved successfully:', response);
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            navigate('/groups');
        },
        onError: (error: any) => {
            console.error('Error saving group:', error);
            console.error('Error response:', error.response);
            console.error('Error data:', error.response?.data);
            
            // Get error message
            const errorMessage = error.response?.data?.error?.message 
                || error.message 
                || 'Failed to save group';
            
            alert(`Error: ${errorMessage}`);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Prepare data to send
        const dataToSend = {
            name: formData.name.trim(),
            description: formData.description.trim(),
            members: selectedMembers
        };
        
        console.log('Submitting group data:', dataToSend);
        saveMutation.mutate(dataToSend);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleMemberToggle = (memberId: string) => {
        setSelectedMembers(prev => 
            prev.includes(memberId)
                ? prev.filter(id => id !== memberId)
                : [...prev, memberId]
        );
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Link to="/groups">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold">
                        {isEdit ? 'Edit Group' : 'New Group'}
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        {isEdit ? 'Update group information' : 'Add a new group to the community'}
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Group Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Group Name *</label>
                                <Input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    placeholder="Enter group name"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Describe the purpose of this group (optional)"
                                    rows={4}
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Members</label>
                                <div className="border rounded-md p-4 max-h-64 overflow-y-auto space-y-2">
                                    {allMembers && allMembers.length > 0 ? (
                                        allMembers.map((member) => (
                                            <label
                                                key={member.id}
                                                className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedMembers.includes(member.id)}
                                                    onChange={() => handleMemberToggle(member.id)}
                                                    className="h-4 w-4"
                                                />
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium">{member.name}</div>
                                                    <div className="text-xs text-muted-foreground">{member.phone}</div>
                                                </div>
                                            </label>
                                        ))
                                    ) : (
                                        <div className="text-sm text-muted-foreground text-center py-4">
                                            No members available
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {selectedMembers.length} member(s) selected
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Link to="/groups">
                                <Button variant="outline" type="button">Cancel</Button>
                            </Link>
                            <Button type="submit" disabled={saveMutation.isPending}>
                                {saveMutation.isPending ? 'Saving...' : 'Save Group'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}