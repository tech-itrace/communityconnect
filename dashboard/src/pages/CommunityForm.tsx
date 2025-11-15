import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { communityAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Plus, Upload, X } from 'lucide-react';
import { useState, useEffect } from 'react';

// Define community types
const COMMUNITY_TYPES = [
  { label: "Alumini", value: "alumini" },
  { label: "Entrepreneur", value: "entrepreneur" },
  { label: "Religious", value: "religious" },
  { label: "Gated / Residential", value: "gated" },
  { label: "Political", value: "political" }
];


export function CommunityForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = id !== 'new';
 const loggedUser = {
  id: "100",
  name: "Anthoniselvi",
  phone: "9876543210",    
  email: "test@gmail.com" 
};


  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: '',
    rules: 'Keep discussions relevant to the community purpose',
    admins: [] as Array<{ id: string; name: string }>,
    is_bot_enable: false,
    is_active: true,
    created_by: loggedUser.id,
  });
const [memberDetails, setMemberDetails] = useState({
  college: "",
  graduation_year: "",
  degree: "",
  department: "",
  roll_no: "",
  current_organization: "",
  designation: "",
});

  // Fetch single community for editing
  const { data: communityResponse, isLoading } = useQuery({
    queryKey: ['community', id],
    queryFn: async () => {
      const response = await communityAPI.getById(id!);
      return response.data;
    },
    enabled: isEdit,
  });
  const community = communityResponse?.data;

  useEffect(() => {
    if (community) {
      // Parse admins if it's a string, otherwise use as-is
      let parsedAdmins = [];
      try {
        parsedAdmins = community.admins.map(a => ({
  id: a.id,
  name: a.name,
  phone: a.phone ?? "",
  email: a.email ?? ""
}));

      } catch (e) {
        console.error('Error parsing admins:', e);
        parsedAdmins = [];
      }

      setFormData({
        name: community.name || '',
        description: community.description || '',
        type: community.type || '',
        rules: community.rules || '',
        admins: parsedAdmins,
        is_bot_enable: community.is_bot_enable ?? false,
        is_active: community.is_active ?? true,
        created_by: community.created_by || '',
      });
    }
  }, [community]);

  // Save / Update community
 const saveMutation = useMutation({
  mutationFn: async (data: typeof formData) => {
    const baseAdmin = {
      id: loggedUser.id,
      name: loggedUser.name,
      phone: loggedUser.phone,
      email: loggedUser.email,
    };

    if (isEdit) {
      const payload = {
        ...data,
      admins: JSON.stringify([baseAdmin]),
member_type_data: formData.type === "alumini" ? memberDetails : null
      };

      return communityAPI.update(id!, payload);
    } 
    
    else {
      const payload = {
  name: data.name,
  description: data.description,
  type: data.type,
  rules: data.rules,
  is_bot_enable: data.is_bot_enable,
  is_active: data.is_active,
  created_by: loggedUser.id,
  admins: JSON.stringify([baseAdmin]),
  member_type_data: formData.type === "alumini" ? memberDetails : null
};


      return communityAPI.create(payload);
    }
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["community"] });
    navigate("/community");
  }
});


  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "type") {
  // Reset member details when type changes
  setMemberDetails({
    college: "",
    graduation_year: "",
    degree: "",
    department: "",
    roll_no: "",
    current_organization: "",
    designation: "",
  });
}
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name: string, value: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  console.log("Form submitted:", formData);
  saveMutation.mutate(formData);
};


  if (isLoading && isEdit) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading community...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link to="/community">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">
            {isEdit ? 'Edit' : 'New Community'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isEdit
              ? `${community?.name}`
              : 'Create a new community record'}
          </p>
        </div>
       
      </div>
        <div className="flex gap-2">
                    <Button variant="outline" >
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

      <Card>
        <CardHeader>
          {/* <CardTitle>Community Information</CardTitle> */}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Community Name *</label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter Community Name"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe about this Community"
                  rows={4}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Type *</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Select Community Type</option>
{COMMUNITY_TYPES.map((type) => (
  <option key={type.value} value={type.value}>
    {type.label}
  </option>
))}

                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Rules / Guidelines</label>
                <textarea
                  name="rules"
                  value={formData.rules}
                  onChange={handleChange}
                  placeholder="Enter community rules"
                  rows={3}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              {isEdit && (
                <div>
                  <label className="text-sm font-medium">Community Admins</label>
                  <div className="space-y-2">
                    {/* Display current admins */}
                    {formData.admins.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {formData.admins.map((admin) => (
                          <>
                          <div className="h-8 w-8 flex items-center justify-center rounded-full bg-primary text-white">
  {admin.name.charAt(0).toUpperCase()}
</div>
<span className="text-sm font-medium">{admin.name}</span>
</>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">
                  Enable Bot Features
                </label>
                <Switch
                  checked={formData.is_bot_enable}
                  onCheckedChange={(v) => handleSwitchChange('is_bot_enable', v)}
                />
              </div>
            </div>

            {/* Alumni Form */}
{formData.type === "alumini" && (
  <div className="border p-4 rounded-md bg-muted/20 space-y-4">
    <h2 className="font-semibold text-lg">Alumni Member Details</h2>

    <div>
      <label className="text-sm font-medium">College *</label>
      <Input
        name="college"
        value={memberDetails.college}
        onChange={(e) =>
          setMemberDetails({ ...memberDetails, college: e.target.value })
        }
        required
      />
    </div>

    <div>
      <label className="text-sm font-medium">Graduation Year *</label>
      <Input
        name="graduation_year"
        value={memberDetails.graduation_year}
        onChange={(e) =>
          setMemberDetails({ ...memberDetails, graduation_year: e.target.value })
        }
        required
      />
    </div>

    <div>
      <label className="text-sm font-medium">Degree *</label>
      <Input
        name="degree"
        value={memberDetails.degree}
        onChange={(e) =>
          setMemberDetails({ ...memberDetails, degree: e.target.value })
        }
        required
      />
    </div>

    <div>
      <label className="text-sm font-medium">Department *</label>
      <Input
        name="department"
        value={memberDetails.department}
        onChange={(e) =>
          setMemberDetails({ ...memberDetails, department: e.target.value })
        }
        required
      />
    </div>

    <div>
      <label className="text-sm font-medium">Roll No *</label>
      <Input
        name="roll_no"
        value={memberDetails.roll_no}
        onChange={(e) =>
          setMemberDetails({ ...memberDetails, roll_no: e.target.value })
        }
        required
      />
    </div>

    <div>
      <label className="text-sm font-medium">Current Organization *</label>
      <Input
        name="current_organization"
        value={memberDetails.current_organization}
        onChange={(e) =>
          setMemberDetails({
            ...memberDetails,
            current_organization: e.target.value,
          })
        }
        required
      />
    </div>

    <div>
      <label className="text-sm font-medium">Designation *</label>
      <Input
        name="designation"
        value={memberDetails.designation}
        onChange={(e) =>
          setMemberDetails({ ...memberDetails, designation: e.target.value })
        }
        required
      />
    </div>
  </div>
)}


            <div className="flex justify-end gap-2 pt-4">
              <Link to="/community">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending
                  ? 'Saving...'
                  : isEdit
                  ? 'Update'
                  : 'Create'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}