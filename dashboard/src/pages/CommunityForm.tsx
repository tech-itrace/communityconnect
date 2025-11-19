import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, Link } from "react-router-dom";
import { communityAPI, memberAPI } from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import axios from "axios";

const COMMUNITY_TYPES = [
  { label: "Alumni", value: "alumni" },
  { label: "Entrepreneur", value: "entrepreneur" },
  { label: "Apartment / Gated Community", value: "apartment" },
  { label: "Mixed Community", value: "mixed" }
];

export function CommunityForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = id !== "new";

  const loggedUser = {
    "id": "099b8946-4d62-4110-9d59-e436a85ad590",
    "name": "Anthoniselvi", 
    "phone": "+918778833937",
    "email": "selvi@example.com",
  }

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    type: "",
    subscription_plan: "free",
    member_limit: 100,
    search_limit_monthly: 1000,
    is_bot_enabled: true,
    is_search_enabled: true,
    is_embedding_enabled: true
  });

  // User data from members table
  const [userData, setUserData] = useState<any>(null);

  // Dynamic member-type fields
  const [memberDetails, setMemberDetails] = useState<any>({});

  // Fetch user data by phone
  // useEffect(() => {
  //   const fetchUserData = async () => {
  //     const userPhone = localStorage.getItem("userPhone");
  //     if (!userPhone) {
  //       console.error("No user phone found in localStorage");
  //       return;
  //     }

  //     try {
  //       // Replace with your actual API endpoint
  //       const response = await axios.get(`/api/members/phone/${userPhone}`);
  //       setUserData(response.data);
  //     } catch (error) {
  //       console.error("Failed to fetch user data:", error);
  //     }
  //   };

  //   fetchUserData();
  // }, []);

  // Load existing community for Edit
  const { data: communityResponse, isLoading } = useQuery({
    queryKey: ["communities", id],
    queryFn: async () => {
      const response = await communityAPI.getById(id!);
      return response.data;
    },
    enabled: isEdit
  });
const community = communityResponse?.community;
  const { data: membersResponse } = useQuery({
    queryKey: ["members", id],
    queryFn: async () => {
      const response = await memberAPI.getById(id!);
      return response.data;
    },
    enabled: isEdit
  });

  const totalMembers = membersResponse?.members;
console.log("totalMembers:" + JSON.stringify(totalMembers))
  useEffect(() => {
    if (community) {
      setFormData({
        name: community.name,
        slug: community.slug,
        description: community.description,
        type: community.type,
        subscription_plan: community.subscription_plan,
        member_limit: community.member_limit,
        search_limit_monthly: community.search_limit_monthly,
        is_bot_enabled: community.is_bot_enabled,
        is_search_enabled: community.is_search_enabled,
        is_embedding_enabled: community.is_embedding_enabled
      });

      setMemberDetails(community.member_type_data || {});
    }
  }, [community]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Auto-generate slug from name
    if (name === "name") {
      const slug = value.toLowerCase().replace(/\s+/g, "-");
      setFormData((prev) => ({ ...prev, slug }));
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMemberChange = (e: any) => {
    const { name, value } = e.target;
    setMemberDetails((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name: string, value: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const memberTypeMapping: Record<string, string> = {
    alumni: "alumni",
    entrepreneur: "entrepreneur",
    apartment: "resident",
    mixed: "generic"
  };

  // Build payload based on backend rules
  const buildProfileData = () => {
    const t = formData.type;
    const d = memberDetails;
    const out: any = {};

    // REQUIRED FIELDS FOR ALL TYPES - from members table
    if (loggedUser) {
      out.name = loggedUser.name;
      out.phone = loggedUser.phone;
      out.email = loggedUser.email;
    }

    // Type-specific fields
    if (t === "alumni") {
      out.graduation_year = d.graduation_year ? Number(d.graduation_year) : null;
      out.degree = d.degree || null;
      out.department = d.department || null;
      out.college = d.college || null;
    }

    if (t === "entrepreneur") {
      out.company = d.company || null;
      out.industry = d.industry || null;
      out.position = d.position || null;
    }

    if (t === "apartment") {
      out.apartment_number = d.apartment_number || null;
      out.floor = d.floor || null;
      out.block = d.block || null;
    }

    // Common optional fields
    if (d.skills)
      out.skills = d.skills.split(",").map((s: string) => s.trim());

    if (d.interests)
      out.interests = d.interests.split(",").map((s: string) => s.trim());

    if (d.bio) out.bio = d.bio;

    // Profile type
    out.profile_type = memberTypeMapping[t];

    return out;
  };

  // Submit Handler
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload: any = {
        name: data.name,
        slug: data.slug,
        type: data.type,
        description: data.description,
        subscription_plan: data.subscription_plan,
        member_limit: Number(data.member_limit),
        search_limit_monthly: Number(data.search_limit_monthly),
        is_bot_enabled: data.is_bot_enabled,
        is_search_enabled: data.is_search_enabled,
        is_embedding_enabled: data.is_embedding_enabled,
        member_type_data: buildProfileData()
      };

      if (isEdit) return communityAPI.update(id!, payload);
      return communityAPI.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      navigate("/community");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loggedUser) {
      alert("User data not loaded. Please try again.");
      return;
    }

    saveMutation.mutate(formData);
  };

  if (isLoading && isEdit) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading community...</div>
      </div>
    );
  }

  if (!loggedUser) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading user data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link to="/community">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{isEdit ? "Edit Community" : "New Community"}</h1>
          <p className="text-muted-foreground mt-1">{isEdit ? community?.name : "Create a new community"}</p>
        </div>
      </div>

      <Card>
        <CardHeader></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* USER INFO DISPLAY */}
            {/* <div className="border p-4 rounded-md bg-muted/50">
              <h2 className="font-semibold mb-2">Creator Information</h2>
              <p className="text-sm"><strong>Name:</strong> {loggedUser.name}</p>
              <p className="text-sm"><strong>Phone:</strong> {loggedUser.phone}</p>
              <p className="text-sm"><strong>Email:</strong> {loggedUser.email}</p>
            </div> */}

            {/* NAME */}
            <div>
              <label className="text-sm font-medium">Community Name *</label>
              <Input name="name" value={formData.name} onChange={handleChange} required />
            </div>

            {/* SLUG */}
            <div>
              <label className="text-sm font-medium">Slug</label>
              <Input name="slug" value={formData.slug} readOnly />
            </div>

            {/* DESCRIPTION */}
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="flex w-full rounded-md border p-2 text-sm"
              />
            </div>

            {/* TYPE */}
            <div>
              <label className="text-sm font-medium">Type *</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                className="flex h-10 w-full rounded-md border px-3 text-sm"
              >
                <option value="">Select Type</option>
                {COMMUNITY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* SWITCHES */}
            <div className="flex flex-col gap-4 mt-4">
              <div className="flex items-center gap-3">
                <label className="text-sm">Bot Enabled</label>
                <Switch
                  checked={formData.is_bot_enabled}
                  onCheckedChange={(v) => handleSwitchChange("is_bot_enabled", v)}
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm">Search Enabled</label>
                <Switch
                  checked={formData.is_search_enabled}
                  onCheckedChange={(v) => handleSwitchChange("is_search_enabled", v)}
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm">Embedding Enabled</label>
                <Switch
                  checked={formData.is_embedding_enabled}
                  onCheckedChange={(v) => handleSwitchChange("is_embedding_enabled", v)}
                />
              </div>
            </div>

            {/* SUBSCRIPTION */}
            <div>
              <label className="text-sm font-medium">Subscription Plan</label>
              <select
                name="subscription_plan"
                value={formData.subscription_plan}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border px-3 text-sm"
              >
                <option value="free">Free</option>
                <option value="basic">Basic</option>
                <option value="premium">Premium</option>
              </select>
            </div>

            {/* LIMITS */}
            <div>
              <label className="text-sm font-medium">Member Limit</label>
              <Input
                type="number"
                name="member_limit"
                value={formData.member_limit}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Monthly Search Limit</label>
              <Input
                type="number"
                name="search_limit_monthly"
                value={formData.search_limit_monthly}
                onChange={handleChange}
              />
            </div>

            {/* DYNAMIC MEMBER FIELDS */}
            {formData.type === "alumni" && (
              <div className="border p-4 rounded-md space-y-4 mt-6">
                <h2 className="font-semibold">Alumni Profile</h2>

                <Input placeholder="College" name="college" value={memberDetails.college || ""} onChange={handleMemberChange} />
                <Input placeholder="Graduation Year" name="graduation_year" value={memberDetails.graduation_year || ""} onChange={handleMemberChange} />
                <Input placeholder="Degree" name="degree" value={memberDetails.degree || ""} onChange={handleMemberChange} />
                <Input placeholder="Department" name="department" value={memberDetails.department || ""} onChange={handleMemberChange} />
              </div>
            )}

            {formData.type === "entrepreneur" && (
              <div className="border p-4 rounded-md space-y-4 mt-6">
                <h2 className="font-semibold">Entrepreneur Profile</h2>

                <Input placeholder="Company" name="company" value={memberDetails.company || ""} onChange={handleMemberChange} />
                <Input placeholder="Industry" name="industry" value={memberDetails.industry || ""} onChange={handleMemberChange} />
                <Input placeholder="Position" name="position" value={memberDetails.position || ""} onChange={handleMemberChange} />
              </div>
            )}

            {formData.type === "apartment" && (
              <div className="border p-4 rounded-md space-y-4 mt-6">
                <h2 className="font-semibold">Apartment Profile</h2>

                <Input placeholder="Apartment Number" name="apartment_number" value={memberDetails.apartment_number || ""} onChange={handleMemberChange} />
                <Input placeholder="Floor" name="floor" value={memberDetails.floor || ""} onChange={handleMemberChange} />
                <Input placeholder="Block" name="block" value={memberDetails.block || ""} onChange={handleMemberChange} />
              </div>
            )}

            {/* COMMON OPTIONAL FIELDS */}
            <div className="border p-4 rounded-md space-y-4 mt-6">
              <h2 className="font-semibold">Additional Information</h2>

              <Input
                placeholder="Skills (comma separated)"
                name="skills"
                value={memberDetails.skills || ""}
                onChange={handleMemberChange}
              />

              <Input
                placeholder="Interests (comma separated)"
                name="interests"
                value={memberDetails.interests || ""}
                onChange={handleMemberChange}
              />

              <textarea
                name="bio"
                value={memberDetails.bio || ""}
                rows={3}
                onChange={handleMemberChange}
                placeholder="Short bio"
                className="w-full border rounded-md p-2 text-sm"
              />
            </div>

            {/* SUBMIT BUTTON */}
            <div className="flex justify-end gap-2">
              <Link to="/community">
                <Button variant="outline" type="button">Cancel</Button>
              </Link>
              <Button type="submit" disabled={saveMutation.isPending}>
                {isEdit ? "Update" : "Create"}
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}