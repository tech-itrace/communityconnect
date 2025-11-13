import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { memberAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export function MemberForm() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isEdit = id !== 'new';
    const [searchParams, setSearchParams] = useSearchParams();
    
    const groupId = searchParams.get('groupId');
const memberId = searchParams.get('memberId')
console.log("groupId:" + groupId)
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        city: '',
        working_knowledge: '',
        degree: '',
        branch: '',
        organization_name: '',
        designation: '',
    });

    const { data: member } = useQuery({
        queryKey: ['member', id],
        queryFn: async () => {
            const response = await memberAPI.getById(id!);
            return response.data.member;
        },
        enabled: isEdit,
    });
console.log("member:" + JSON.stringify(member))
    useEffect(() => {
        if (member) {
            setFormData({
                name: member.name || '',
                phone: member.phone || '',
                email: member.email || '',
                city: member.city || '',
                working_knowledge: member.working_knowledge || '',
                degree: member.degree || '',
                branch: member.branch || '',
                organization_name: member.organization_name || '',
                designation: member.designation || '',
            });
        }
    }, [member]);

    const saveMutation = useMutation({
        mutationFn: (data: typeof formData) => {
            if (isEdit) {
                return memberAPI.update(id!, data);
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
                 <Link to={`/members?groupId=${groupId}`}>
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
                                    name="phone"
                                    value={formData.phone}
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
                                <label className="text-sm font-medium">City</label>
                                <Input
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    placeholder="New York, NY"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium">Working Knowledge / Skills</label>
                                <Input
                                    name="working_knowledge"
                                    value={formData.working_knowledge}
                                    onChange={handleChange}
                                    placeholder="Software Engineering, Data Science"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Degree</label>
                                <Input
                                    name="degree"
                                    value={formData.degree}
                                    onChange={handleChange}
                                    placeholder="B.Tech, MBA"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Branch</label>
                                <Input
                                    name="branch"
                                    value={formData.branch}
                                    onChange={handleChange}
                                    placeholder="Computer Science"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Organization Name</label>
                                <Input
                                    name="organization_name"
                                    value={formData.organization_name}
                                    onChange={handleChange}
                                    placeholder="Company Name"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Designation</label>
                                <Input
                                    name="designation"
                                    value={formData.designation}
                                    onChange={handleChange}
                                    placeholder="Software Engineer"
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
