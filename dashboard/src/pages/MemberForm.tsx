import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { memberAPI, communityAPI } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";

export function MemberForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== "new";

  const [searchParams] = useSearchParams();
  const groupId = searchParams.get("groupId");

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [communityType, setCommunityType] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    city: "",

    graduation_year: "",
    degree: "",
    department: "",
    college: "",

    company: "",
    industry: "",
    position: "",

    apartment_number: "",
    floor: "",
    block: "",

    skills: "",
    interests: "",
    bio: "",

    role: "member",
  });

  /* ------------------ Fetch COMMUNITY TYPE ------------------ */
  const { data: communityResp } = useQuery({
    queryKey: ["community-details", groupId],
    queryFn: async () => {
      if (!groupId) return null;
      const res = await communityAPI.getById(groupId);
      return res.data.community;
    },
    enabled: !!groupId,
  });

  useEffect(() => {
    if (communityResp?.type) setCommunityType(communityResp.type);
  }, [communityResp]);


  /* ------------------ Fetch SINGLE MEMBER ------------------ */
  const { data: communityMemberResp } = useQuery({
    queryKey: ["community-member", id, groupId],
    queryFn: async () => {
      if (!groupId || !isEdit) return null;
      const res = await communityAPI.getSingleMember(id!, groupId);
      return res.data ?? null;
    },
    enabled: !!groupId && isEdit,
  });

  /* ------------------ Map Response → FormData ------------------ */
  useEffect(() => {
    if (!communityMemberResp) return;

    const m = communityMemberResp;

    const flattened = {
      name: m.name || "",
      phone: m.phone || "",
      email: m.email || "",
      city: m.city || "",

      graduation_year: m.profile_data?.graduation_year ?? "",
      degree: m.profile_data?.degree ?? "",
      department: m.profile_data?.department ?? "",
      college: m.profile_data?.college ?? "",

      company: m.profile_data?.company ?? "",
      industry: m.profile_data?.industry ?? "",
      position: m.profile_data?.position ?? "",

      apartment_number: m.profile_data?.apartment_number ?? "",
      floor: m.profile_data?.floor ?? "",
      block: m.profile_data?.block ?? "",

      skills: Array.isArray(m.profile_data?.skills)
        ? m.profile_data.skills.join(", ")
        : m.profile_data?.skills ?? "",

      interests: Array.isArray(m.profile_data?.interests)
        ? m.profile_data.interests.join(", ")
        : m.profile_data?.interests ?? "",

      bio: m.profile_data?.bio ?? "",

      role: m.role || "member",
    };

    setFormData(flattened);
  }, [communityMemberResp]);

  /* ------------------ Build Profile Data ------------------ */
  const buildProfileData = (type: string, data: typeof formData) => {
    const profileData: any = {};

    if (type === "alumni") {
      profileData.graduation_year = data.graduation_year || null;
      profileData.degree = data.degree || null;
      profileData.department = data.department || null;
      profileData.college = data.college || null;
    }
    if (type === "entrepreneur") {
      profileData.company = data.company || null;
      profileData.industry = data.industry || null;
      profileData.position = data.position || null;
    }
    if (type === "apartment") {
      profileData.apartment_number = data.apartment_number || null;
      profileData.floor = data.floor || null;
      profileData.block = data.block || null;
    }

    profileData.skills = data.skills ? data.skills.split(",").map(s => s.trim()) : [];
    profileData.interests = data.interests ? data.interests.split(",").map(s => s.trim()) : [];
    profileData.bio = data.bio || "";

    return profileData;
  };

  /* ------------------ Save Member ------------------ */
const saveMutation = useMutation({
  mutationFn: async () => {
    const profileData = buildProfileData(communityType!, formData);

    // ------------------ EDIT MODE ------------------
    if (isEdit) {
      return communityAPI.updateMember(id!, groupId!, {
        profile_data: profileData,
      });
    }

    // ------------------ CREATE MODE ------------------
    const normalizedPhone =
      formData.phone.startsWith("+91")
        ? formData.phone
        : `+91${formData.phone.replace(/^\+?91/, "").trim()}`;

    const payload = {
      member_data: {
        name: formData.name,
        phone: normalizedPhone,
        email: formData.email,
      },
      member_type: communityType || "generic",
      profile_data: profileData,
      role: formData.role,
    };

    return communityAPI.createMember(groupId!, payload);
  },

  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: ["community-members", groupId],
    });

    navigate(`/members?groupId=${groupId}`);
  },
});


  const handleSubmit = (e: any) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const isAlumni = communityType === "alumni";
  const isEntrepreneur = communityType === "entrepreneur";
  const isApartment = communityType === "apartment";


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
            {isEdit ? "Edit Member" : "Create Member"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {communityType && `Community Type: ${communityType.toUpperCase()}`}
          </p>
        </div>
      </div>

      <Card>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="border p-4 rounded-md space-y-4">
              <h3 className="font-bold text-large">Personal Info</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Input name="name" placeholder="Name *" value={formData.name} onChange={handleChange} />
                <Input name="phone" placeholder="Phone *" value={formData.phone} onChange={handleChange} />
                <Input name="email" placeholder="Email" value={formData.email} onChange={handleChange} />

                <select name="role" value={formData.role} onChange={handleChange} className="border p-2 rounded-md w-full">
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                </select>
              </div>
            </div>

            {/* Alumni */}
            {isAlumni && (
              <div className="border p-4 rounded-md space-y-4">
                <h3 className="font-bold text-large">Alumni Info</h3>
                <Input name="graduation_year" placeholder="Graduation Year" value={formData.graduation_year} onChange={handleChange} />
                <Input name="degree" placeholder="Degree" value={formData.degree} onChange={handleChange} />
                <Input name="department" placeholder="Department" value={formData.department} onChange={handleChange} />
                <Input name="college" placeholder="College" value={formData.college} onChange={handleChange} />
              </div>
            )}

            {/* Entrepreneur */}
            {isEntrepreneur && (
              <div className="border p-4 rounded-md space-y-4">
                <h3 className="font-bold text-large">Entrepreneur Info</h3>
                <Input name="company" placeholder="Company" value={formData.company} onChange={handleChange} />
                <Input name="industry" placeholder="Industry" value={formData.industry} onChange={handleChange} />
                <Input name="position" placeholder="Position" value={formData.position} onChange={handleChange} />
              </div>
            )}

            {/* Apartment */}
            {isApartment && (
              <div className="border p-4 rounded-md space-y-4">
                <h3 className="font-bold text-large">Apartment Info</h3>
                <Input name="apartment_number" placeholder="Apartment No" value={formData.apartment_number} onChange={handleChange} />
                <Input name="floor" placeholder="Floor" value={formData.floor} onChange={handleChange} />
                <Input name="block" placeholder="Block" value={formData.block} onChange={handleChange} />
              </div>
            )}

            <div className="border p-4 rounded-md space-y-4">
              <h3 className="font-bold text-large">Additional Info</h3>
              <Input name="skills" placeholder="Skills (comma separated)" value={formData.skills} onChange={handleChange} />
              <Input name="interests" placeholder="Interests" value={formData.interests} onChange={handleChange} />
              <Input name="bio" placeholder="Bio" value={formData.bio} onChange={handleChange} />
            </div>

            <div className="flex justify-end gap-2">
              <Link to={`/members?groupId=${groupId}`}>
                <Button variant="outline">Cancel</Button>
              </Link>
              <Button type="submit">{isEdit ? "Update" : "Save"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
