import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { memberAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';

export function MemberForm() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isEdit = id !== 'new';

    const [formData, setFormData] = useState({
        name: '',
        phone_number: '',
        email: '',
        location: '',
        expertise: '',
        interests: '',
        availability: '',
    });

    const { data: member } = useQuery({
        queryKey: ['member', id],
        queryFn: async () => {
            const response = await memberAPI.getById(Number(id));
            return response.data;
        },
        enabled: isEdit,
    });

    useEffect(() => {
        if (member) {
            setFormData({
                name: member.name || '',
                phone_number: member.phone_number || '',
                email: member.email || '',
                location: member.location || '',
                expertise: member.expertise || '',
                interests: member.interests || '',
                availability: member.availability || '',
            });
        }
    }, [member]);

    const saveMutation = useMutation({
        mutationFn: (data: typeof formData) => {
            if (isEdit) {
                return memberAPI.update(Number(id), data);
            }
            return memberAPI.create(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['members'] });
            navigate('/members');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        saveMutation.mutate(formData);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Link to="/members">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold">
                        {isEdit ? 'Edit Member' : 'New Member'}
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        {isEdit ? 'Update member information' : 'Add a new member to the community'}
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Member Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Name *</label>
                                <Input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    placeholder="John Doe"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Phone Number *</label>
                                <Input
                                    name="phone_number"
                                    value={formData.phone_number}
                                    onChange={handleChange}
                                    required
                                    placeholder="+1234567890"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email</label>
                                <Input
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="john@example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Location</label>
                                <Input
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    placeholder="New York, NY"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium">Expertise</label>
                                <Input
                                    name="expertise"
                                    value={formData.expertise}
                                    onChange={handleChange}
                                    placeholder="Software Engineering, Data Science"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium">Interests</label>
                                <Input
                                    name="interests"
                                    value={formData.interests}
                                    onChange={handleChange}
                                    placeholder="AI, Machine Learning, Web Development"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium">Availability</label>
                                <Input
                                    name="availability"
                                    value={formData.availability}
                                    onChange={handleChange}
                                    placeholder="Weekends, Evenings"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Link to="/members">
                                <Button variant="outline">Cancel</Button>
                            </Link>
                            <Button type="submit" disabled={saveMutation.isPending}>
                                {saveMutation.isPending ? 'Saving...' : 'Save Member'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
