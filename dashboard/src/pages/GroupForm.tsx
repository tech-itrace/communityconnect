import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { groupAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, UserPlus, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface NewMember {
    name: string;
    phone: string;
    email?: string;
}

export function GroupForm() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isEdit = id !== 'new';
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        name: '',
        description: ''
    });

    const [members, setMembers] = useState<NewMember[]>([]);
    const [showAddMember, setShowAddMember] = useState(false);
    const [newMember, setNewMember] = useState<NewMember>({
        name: '',
        phone: '',
        email: ''
    });

    // Fetch single group for editing
    const { data: groupResponse } = useQuery({
        queryKey: ['group', id],
        queryFn: async () => {
            const response = await groupAPI.getById(id!);
            return response.data;
        },
        enabled: isEdit,
    });

    const group = groupResponse?.group;

    useEffect(() => {
        if (group) {
            setFormData({
                name: group.name || '',
                description: group.description || ''
            });
            // Note: existing member IDs from the group are not loaded
            // as we're creating a NEW members list
        }
    }, [group]);

    const saveMutation = useMutation({
        mutationFn: async (data: { name: string; description: string; members: NewMember[] }) => {
            console.log('Mutation function called with:', data);
            
            // For now, we'll just save the group info
            // You may need to create members first, then add their IDs to the group
            const groupData = {
                name: data.name,
                description: data.description,
                members: [] // Empty for now - you'll need to create members first
            };

            if (isEdit) {
                console.log('Updating group:', id);
                return groupAPI.update(id!, groupData);
            }
            console.log('Creating new group');
            return groupAPI.create(groupData);
        },
        onSuccess: (response) => {
            console.log('Group saved successfully:', response);
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            navigate('/groups');
        },
        onError: (error: any) => {
            console.error('Error saving group:', error);
            const errorMessage = error.response?.data?.error?.message 
                || error.message 
                || 'Failed to save group';
            alert(`Error: ${errorMessage}`);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const dataToSend = {
            name: formData.name.trim(),
            description: formData.description.trim(),
            members: isEdit ? members : [] // Only include members when editing
        };
        
        console.log('Submitting group data:', dataToSend);
        console.log('Members to add:', members);
        
        saveMutation.mutate(dataToSend);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleNewMemberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMember({ ...newMember, [e.target.name]: e.target.value });
    };

    const handleAddMember = () => {
        if (!newMember.name.trim() || !newMember.phone.trim()) {
            alert('Name and phone are required');
            return;
        }

        setMembers(prev => [...prev, { ...newMember }]);
        setNewMember({ name: '', phone: '', email: '' });
        setShowAddMember(false);
    };

    const handleRemoveMember = (index: number) => {
        setMembers(prev => prev.filter((_, i) => i !== index));
    };

    const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const lines = text.split('\n');
                
                // Skip header row and process data
                const newMembers: NewMember[] = [];
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;
                    
                    // CSV format: name,phone,email
                    const [name, phone, email] = line.split(',').map(s => s.trim());
                    if (name && phone) {
                        newMembers.push({ name, phone, email: email || '' });
                    }
                }

                setMembers(prev => [...prev, ...newMembers]);
                alert(`Added ${newMembers.length} members from CSV`);
                
                // Reset file input
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            } catch (error) {
                console.error('Error parsing CSV:', error);
                alert('Error parsing CSV file. Please check the format.');
            }
        };
        reader.readAsText(file);
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
                        {isEdit ? 'Update group information and add members' : 'Add a new group to the community'}
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

                            {/* Members section - Only show in edit mode */}
                            {isEdit && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium">Members ({members.length})</label>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setShowAddMember(!showAddMember)}
                                            >
                                                <UserPlus className="h-4 w-4 mr-2" />
                                                Add Member
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                <Upload className="h-4 w-4 mr-2" />
                                                Bulk Upload
                                            </Button>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".csv"
                                                onChange={handleBulkUpload}
                                                className="hidden"
                                            />
                                        </div>
                                    </div>

                                    {/* Add New Member Form */}
                                    {showAddMember && (
                                        <Card className="bg-muted/30">
                                            <CardContent className="pt-4">
                                                <div className="space-y-3">
                                                    <div className="text-sm font-medium mb-2">Add New Member</div>
                                                    <div className="grid gap-3 md:grid-cols-3">
                                                        <Input
                                                            name="name"
                                                            value={newMember.name}
                                                            onChange={handleNewMemberChange}
                                                            placeholder="Name *"
                                                        />
                                                        <Input
                                                            name="phone"
                                                            value={newMember.phone}
                                                            onChange={handleNewMemberChange}
                                                            placeholder="Phone *"
                                                        />
                                                        <Input
                                                            name="email"
                                                            type="email"
                                                            value={newMember.email}
                                                            onChange={handleNewMemberChange}
                                                            placeholder="Email (optional)"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            onClick={handleAddMember}
                                                        >
                                                            Add
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setShowAddMember(false);
                                                                setNewMember({ name: '', phone: '', email: '' });
                                                            }}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Members List */}
                                    {members.length > 0 && (
                                        <div className="border rounded-md">
                                            <div className="p-3 border-b bg-muted/30">
                                                <div className="text-sm font-medium">Added Members:</div>
                                            </div>
                                            <div className="divide-y">
                                                {members.map((member, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center justify-between p-3 hover:bg-muted/30"
                                                    >
                                                        <div className="flex-1">
                                                            <div className="text-sm font-medium">{member.name}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {member.phone}
                                                                {member.email && ` • ${member.email}`}
                                                            </div>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleRemoveMember(index)}
                                                        >
                                                            <X className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* CSV Format Help */}
                                    <p className="text-xs text-muted-foreground">
                                        💡 Tip: For bulk upload, use CSV format: name,phone,email (one per line, header row required)
                                    </p>
                                </div>
                            )}
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