import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { memberAPI, communityAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';

export function MemberForm() {
    const { id } = useParams<{ id: string }>();
    const isEdit = id !== 'new';

    const [searchParams] = useSearchParams();
    const groupId = searchParams.get('groupId');

    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [communityType, setCommunityType] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        city: '',

        // Alumni
        degree: '',
        branch: '',

        // Entrepreneur
        organization_name: '',
        designation: '',

        // Apartment
        block: '',
        floor: '',
        flat_no: '',

        // Common
        working_knowledge: '',
    });

    /* ------------------ Fetch COMMUNITY TYPE ------------------ */
    const { data: communityResp } = useQuery({
        queryKey: ['community', groupId],
        queryFn: async () => {
            if (!groupId) return null;
            const res = await communityAPI.getById(groupId);
            return res.data.community;
        },
        enabled: !!groupId,
    });

    useEffect(() => {
        if (communityResp?.type) {
            setCommunityType(communityResp.type);
        }
    }, [communityResp]);

    /* ------------------ Fetch MEMBER IF EDIT ------------------ */
    const { data: memberResp } = useQuery({
        queryKey: ['member', id],
        queryFn: async () => {
            if (!isEdit) return null;
            const res = await memberAPI.getById(id!);
            return res.data.member;
        },
        enabled: isEdit,
    });

    useEffect(() => {
        if (memberResp) {
            setFormData((prev) => ({
                ...prev,
                ...memberResp,
            }));
        }
    }, [memberResp]);

    /* ------------------ Save Member ------------------ */
    const saveMutation = useMutation({
        mutationFn: (data: typeof formData) => {
            if (isEdit) {
                return memberAPI.update(id!, { ...data, groupId });
            }
            return memberAPI.create({ ...data, groupId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['members'] });
            navigate(`/community/${groupId}`);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        saveMutation.mutate(formData);
    };

    const handleChange = (e: any) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    /* ------------------ FIELD HELPERS ------------------ */
    const isAlumni = communityType === 'alumni';
    const isEntrepreneur = communityType === 'entrepreneur';
    const isApartment = communityType === 'apartment';
    const isMixed = communityType === 'mixed';

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Link to={`/community/${groupId}`}>
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
                    {communityType && (
                        <p className="text-xs text-muted-foreground mt-1">
                            Community Type: <strong>{communityType.toUpperCase()}</strong>
                        </p>
                    )}
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* BASIC FIELDS */}
                        <div className="grid gap-4 md:grid-cols-2">

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Name *</label>
                                <Input name="name" value={formData.name} onChange={handleChange} required />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Phone *</label>
                                <Input name="phone" value={formData.phone} onChange={handleChange} required />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email</label>
                                <Input name="email" type="email" value={formData.email} onChange={handleChange} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">City</label>
                                <Input name="city" value={formData.city} onChange={handleChange} />
                            </div>

                        </div>

                        {/* ALUMNI FIELDS */}
                        {(isAlumni || isMixed) && (
                            <div className="border p-4 rounded-md space-y-4">
                                <h3 className="font-medium text-sm">Alumni Information</h3>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Degree</label>
                                        <Input name="degree" value={formData.degree} onChange={handleChange} />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Branch</label>
                                        <Input name="branch" value={formData.branch} onChange={handleChange} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ENTREPRENEUR FIELDS */}
                        {(isEntrepreneur || isMixed) && (
                            <div className="border p-4 rounded-md space-y-4">
                                <h3 className="font-medium text-sm">Entrepreneur Information</h3>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Organization Name</label>
                                        <Input name="organization_name" value={formData.organization_name} onChange={handleChange} />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Designation</label>
                                        <Input name="designation" value={formData.designation} onChange={handleChange} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* APARTMENT FIELDS */}
                        {(isApartment || isMixed) && (
                            <div className="border p-4 rounded-md space-y-4">
                                <h3 className="font-medium text-sm">Apartment Information</h3>

                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Block</label>
                                        <Input name="block" value={formData.block} onChange={handleChange} />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Floor</label>
                                        <Input name="floor" value={formData.floor} onChange={handleChange} />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Flat No</label>
                                        <Input name="flat_no" value={formData.flat_no} onChange={handleChange} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* WORKING KNOWLEDGE */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Working Knowledge / Skills</label>
                            <Input name="working_knowledge" value={formData.working_knowledge} onChange={handleChange} />
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Link to={`/community/${groupId}`}>
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
