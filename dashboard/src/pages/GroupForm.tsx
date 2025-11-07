import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { groupAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, UserPlus, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface Member {
    id: string;
    name: string;
    phone: string;
    email?: string;
}

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

    const [existingMembers, setExistingMembers] = useState<Member[]>([]);
    const [newMembers, setNewMembers] = useState<NewMember[]>([]);
    const [showAddMember, setShowAddMember] = useState(false);
    const [newMember, setNewMember] = useState<NewMember>({
        name: '',
        phone: '',
        email: ''
    });

    // Fetch single group for editing
    const { data: groupResponse, isLoading } = useQuery({
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
            // Set existing members from the group
            setExistingMembers(group.members || []);
        }
    }, [group]);

    const saveMutation = useMutation({
        mutationFn: async (data: { name: string; description: string; members: NewMember[] }) => {
            console.log('Mutation function called with:', data);
            
            if (isEdit) {
                console.log('Updating group:', id);
                // Update group name and description
                await groupAPI.update(id!, {
                    name: data.name,
                    description: data.description
                });
                
                // If there are NEW members to add, add them
                if (data.members.length > 0) {
                    console.log('Adding new members to group:', data.members);
                    await groupAPI.addMembers(id!, data.members);
                }
                
                return { success: true };
            } else {
                console.log('Creating new group');
                return groupAPI.create({
                    name: data.name,
                    description: data.description
                });
            }
        },
        onSuccess: (response) => {
            console.log('Group saved successfully:', response);
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            queryClient.invalidateQueries({ queryKey: ['group', id] });
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
            members: isEdit ? newMembers : [] // Only send NEW members to add
        };
        
        console.log('Submitting group data:', dataToSend);
        console.log('Existing members will remain:', existingMembers.length);
        
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

        // Check if phone already exists in existing or new members
        const phoneExists = [...existingMembers, ...newMembers].some(
            m => m.phone === newMember.phone
        );

        if (phoneExists) {
            alert('A member with this phone number already exists in this group');
            return;
        }

        setNewMembers(prev => [...prev, { ...newMember }]);
        setNewMember({ name: '', phone: '', email: '' });
        setShowAddMember(false);
    };

    const handleRemoveNewMember = (index: number) => {
        setNewMembers(prev => prev.filter((_, i) => i !== index));
    };

    const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const lines = text.split('\n');
                
                const uploadedMembers: NewMember[] = [];
                const existingPhones = [...existingMembers, ...newMembers].map(m => m.phone);
                let skipped = 0;

                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;
                    
                    const [name, phone, email] = line.split(',').map(s => s.trim());
                    if (name && phone) {
                        // Skip if phone already exists
                        if (existingPhones.includes(phone)) {
                            skipped++;
                            continue;
                        }
                        uploadedMembers.push({ name, phone, email: email || '' });
                        existingPhones.push(phone); // Add to check for duplicates within CSV
                    }
                }

                setNewMembers(prev => [...prev, ...uploadedMembers]);
                
                let message = `Added ${uploadedMembers.length} members from CSV`;
                if (skipped > 0) {
                    message += ` (${skipped} skipped - already in group)`;
                }
                alert(message);
                
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

    const totalMembers = existingMembers.length + newMembers.length;

    if (isLoading && isEdit) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-muted-foreground">Loading group...</div>
            </div>
        );
    }

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
                        {isEdit ? 'Update group information and manage members' : 'Add a new group to the community'}
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
                                        <label className="text-sm font-medium">
                                            Members ({totalMembers})
                                            {existingMembers.length > 0 && (
                                                <span className="text-muted-foreground ml-2">
                                                    ({existingMembers.length} existing, {newMembers.length} new)
                                                </span>
                                            )}
                                        </label>
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

                                    {/* Existing Members List */}
                                    {existingMembers.length > 0 && (
                                        <div className="border rounded-md">
                                            <div className="p-3 border-b bg-muted/50">
                                                <div className="text-sm font-medium">Current Members:</div>
                                            </div>
                                            <div className="divide-y">
                                                {existingMembers.map((member) => (
                                                    <div
                                                        key={member.id}
                                                        className="flex items-center justify-between p-3 bg-background"
                                                    >
                                                        <div className="flex-1">
                                                            <div className="text-sm font-medium">{member.name}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {member.phone}
                                                                {member.email && ` • ${member.email}`}
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground px-2">
                                                            Existing
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* New Members to Add List */}
                                    {newMembers.length > 0 && (
                                        <div className="border rounded-md">
                                            <div className="p-3 border-b bg-green-50 dark:bg-green-950">
                                                <div className="text-sm font-medium text-green-800 dark:text-green-200">
                                                    New Members to Add:
                                                </div>
                                            </div>
                                            <div className="divide-y">
                                                {newMembers.map((member, index) => (
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
                                                            onClick={() => handleRemoveNewMember(index)}
                                                        >
                                                            <X className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

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