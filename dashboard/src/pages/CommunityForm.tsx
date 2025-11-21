import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, Link } from "react-router-dom";
import { communityAPI } from "@/lib/api";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowBigDown, ArrowBigUp, ArrowBigUpDash, ArrowBigUpIcon, ArrowLeft, Upload, UserPlus, X } from "lucide-react";

type Member = {
  id: string | number;
  name?: string;
  phone?: string;
  email?: string;
  role?: string;
};

type NewMember = {
  name: string;
  phone: string;
  email?: string;
  role: string;
};

type CommunityPayload = {
  name: string;
  slug: string;
  description?: string;
  type?: string;
  subscription_plan?: string;
  member_limit?: number;
  search_limit_monthly?: number;
  is_bot_enabled?: boolean;
  is_search_enabled?: boolean;
  is_embedding_enabled?: boolean;
  member_type_data?: any;
  new_members?: NewMember[];
  updated_members?: Member[];
};

const COMMUNITY_TYPES = [
  { label: "Alumni", value: "alumni" },
  { label: "Entrepreneur", value: "entrepreneur" },
  { label: "Apartment / Gated Community", value: "apartment" },
  { label: "Mixed Community", value: "mixed" },
];

export function CommunityForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== "new" && !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loggedUser = {
    id: "099b8946-4d62-4110-9d59-e436a85ad590",
    name: "Anthoniselvi",
    phone: "+918778833937",
    email: "selvi@example.com",
  };

  const [formData, setFormData] = useState<CommunityPayload>({
    name: "",
    slug: "",
    description: "",
    type: "",
    subscription_plan: "free",
    member_limit: 100,
    search_limit_monthly: 1000,
    is_bot_enabled: true,
    is_search_enabled: true,
    is_embedding_enabled: true,
    member_type_data: {},
    new_members: [],
  });

  const [existingMembers, setExistingMembers] = useState<Member[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);

  const [newMemberForm, setNewMemberForm] = useState<NewMember>({
    name: "",
    phone: "",
    email: "",
    role: "member",
  });

  const { data: communityResponse, isLoading } = useQuery({
    queryKey: ["communities", id],
    queryFn: async () => {
      if (!isEdit) return null;
      const res = await communityAPI.getById(id!);
      return res.data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (communityResponse?.community) {
      const c = communityResponse.community;

      setFormData((prev) => ({
        ...prev,
        name: c.name || "",
        slug: c.slug || "",
        description: c.description || "",
        type: c.type || "",
        subscription_plan: c.subscription_plan || "free",
        member_limit: c.member_limit ?? 100,
        search_limit_monthly: c.search_limit_monthly ?? 1000,
        is_bot_enabled: !!c.is_bot_enabled,
        is_search_enabled: !!c.is_search_enabled,
        is_embedding_enabled: !!c.is_embedding_enabled,
        member_type_data: c.member_type_data || {},
      }));

      setExistingMembers(Array.isArray(c.members) ? c.members : []);
    }
  }, [communityResponse]);

  const generateSlug = (name: string) =>
    name
      .trim()
      .toLowerCase()
      .replace(/[^\x00-\x7F]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === "name") {
      setFormData((prev) => ({ ...prev, name: value, slug: generateSlug(value) }));
      return;
    }

    if (name === "member_limit" || name === "search_limit_monthly") {
      setFormData((prev) => ({ ...prev, [name]: Number(value) }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMemberTypeChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      member_type_data: { ...(prev.member_type_data || {}), [name]: value },
    }));
  };

  const handleSwitchChange = (name: keyof CommunityPayload, value: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNewMemberChange = (e: any) => {
    const { name, value } = e.target;
    setNewMemberForm((prev) => ({ ...prev, [name]: value }));
  };

  const addNewMemberToList = () => {
    if (!newMemberForm.name || !newMemberForm.phone) {
      alert("Please enter name & phone");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      new_members: [...(prev.new_members || []), newMemberForm],
    }));

    setNewMemberForm({ name: "", phone: "", email: "", role: "member" });
    setShowAddMember(false);
  };

  const updateExistingMemberRole = (id: any, newRole: string) => {
    setExistingMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, role: newRole } : m))
    );
  };

  const removeExistingMember = (idToRemove: any) => {
    setExistingMembers((prev) => prev.filter((m) => m.id !== idToRemove));
  };

  const removeNewMember = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      new_members: prev.new_members?.filter((_, i) => i !== index),
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: CommunityPayload) => {
      if (isEdit) return communityAPI.update(id!, payload);
      return communityAPI.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      navigate("/community");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: CommunityPayload = {
      ...formData,
      updated_members: existingMembers,
    };

    saveMutation.mutate(payload);
  };

  if (isLoading && isEdit) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  const navigateToSingleMemberPage = (id) => {
    navigate(`/member?groupId=${id}`)
  }

   const navigateToMembersPage = (id) => {
    navigate(`/members?groupId=${id}`)
  }

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <Link to="/community">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{isEdit ? "Edit" : "Create"}</h1>
          <p className="text-muted-foreground">{formData.name}</p>
        </div>
      </div>

      {/* SECTION 1 — COMMUNITY DETAILS */}
      <Card>
        <CardHeader><h2 className="font-semibold text-lg">Community Details</h2></CardHeader>
        <CardContent className="space-y-4">
          <Input name="name" placeholder="Community Name" value={formData.name} onChange={handleChange} />
          <Input name="slug" placeholder="Slug" value={formData.slug} readOnly />
          <textarea name="description" rows={3} className="w-full border rounded-md p-2 text-sm" placeholder="Description"
            value={formData.description} onChange={handleChange} />
          <select name="type" value={formData.type} onChange={handleChange}
            className="flex h-10 w-full rounded-md border px-3 text-sm">
            <option value="">Select Type</option>
            {COMMUNITY_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
          </select>
        </CardContent>
      </Card>

      {/* SECTION 2 — MEMBERS DETAILS */}
<Card>
<CardHeader>
  <div className="flex justify-between items-center w-full">

    {/* LEFT SIDE - Heading */}
    <h2 className="font-semibold text-lg">Members Details</h2>

    {/* RIGHT SIDE - Buttons */}
    {/* <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        // onClick={() => setShowAddMember(!showAddMember)}
        onClick={()=>navigateToMembersPage(communityResponse?.community.id)}
      >
        <UserPlus className="w-4 h-4 mr-1" /> View More
      </Button>

      <Button
        variant="outline"
        size="sm"
        // onClick={() => setShowAddMember(!showAddMember)}
        onClick={()=>navigateToSingleMemberPage(communityResponse?.community.id)}
      >
        <UserPlus className="w-4 h-4 mr-1" /> Add Member
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-4 h-4 mr-1" /> Bulk Upload
      </Button>

      <input
        type="file"
        accept=".csv"
        ref={fileInputRef}
        className="hidden"
      />
    </div> */}

  </div>
</CardHeader>


  <CardContent className="space-y-4">

    {/* --- Add Member (Single Row Layout) --- */}
    {showAddMember && (
      <div className="border p-3 rounded-md bg-muted/30">
        <div className="flex flex-wrap gap-3 items-center">

          <Input
            name="name"
            placeholder="Name"
            value={newMemberForm.name}
            onChange={handleNewMemberChange}
            className="w-[180px]"
          />

          <Input
            name="phone"
            placeholder="Phone"
            value={newMemberForm.phone}
            onChange={handleNewMemberChange}
            className="w-[150px]"
          />

          <Input
            name="email"
            placeholder="Email"
            value={newMemberForm.email}
            onChange={handleNewMemberChange}
            className="w-[200px]"
          />

          <select
            name="role"
            value={newMemberForm.role}
            onChange={handleNewMemberChange}
            className="border rounded-md p-2 text-sm w-[120px]"
          >
            <option value="admin">Admin</option>
            <option value="member">Member</option>
          </select>

          <Button size="sm" color="primary" variant="outline" onClick={addNewMemberToList}>Add</Button>
          <Button size="sm" variant="outline" onClick={() => setShowAddMember(false)}>Cancel</Button>
        </div>
      </div>
    )}

    {/* --- Existing Members (Single Line Layout) --- */}
    {existingMembers.length > 0 && (
      <div className="border rounded-md">
        <div className="bg-muted/40 p-2 border-b font-medium">Existing Members</div>

        <div className="divide-y">
          {existingMembers.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-3 gap-3">

              <div className="flex items-center gap-8 flex-wrap flex-1">

                <div className="w-[180px] text-sm font-medium" onClick={()=>navigateToSingleMemberPage(m.id)}>{m.name}</div>
                <div className="w-[150px] text-xs text-muted-foreground">{m.phone}</div>
                <div className="w-[220px] text-xs text-muted-foreground">{m.email || "-"}</div>

                <select
                  className="border rounded-md p-1 text-xs w-[120px]"
                  value={m.role || "member"}
                  onChange={(e) => updateExistingMemberRole(m.id, e.target.value)}
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                </select>
              </div>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => removeExistingMember(m.id)}
              >
                <X className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* --- New Members Display with Single Line Layout --- */}
    {formData.new_members && formData.new_members.length > 0 && (
      <div className="border rounded-md">
        <div className="bg-green-50 p-2 border-b font-medium">New Members</div>

        <div className="divide-y">
          {formData.new_members.map((m, i) => (
            <div key={i} className="flex items-center justify-between p-3 gap-3">

              <div className="flex items-center gap-8 flex-wrap flex-1">

                <div className="w-[180px] text-sm font-medium">{m.name}</div>
                <div className="w-[150px] text-xs text-muted-foreground">{m.phone}</div>
                <div className="w-[220px] text-xs text-muted-foreground">{m.email || "-"}</div>

                <div className="w-[120px] text-xs">{m.role}</div>
              </div>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => removeNewMember(i)}
              >
                <X className="h-4 w-4 text-red-500" />
              </Button>

            </div>
          ))}
        </div>
      </div>
    )}

  </CardContent>
  <CardFooter>
      <Button
        variant="outline"
        size="sm"
        // onClick={() => setShowAddMember(!showAddMember)}
        onClick={()=>navigateToMembersPage(communityResponse?.community.id)}
      >
        <ArrowBigUpDash className="w-4 h-4 mr-1" /> View More
      </Button>
  </CardFooter>
</Card>


      {/* SECTION 3 — OTHER DETAILS */}
    <Card>
  <CardHeader>
    <h2 className="font-semibold text-lg">Other Details</h2>
  </CardHeader>

  <CardContent className="space-y-4">

    {/* --- SINGLE LINE TOGGLE ROW --- */}
    <div className="flex items-center justify-between">

      <div className="flex items-center gap-2">
        <label className="text-sm w-32">Bot Enabled</label>
        <Switch
          checked={!!formData.is_bot_enabled}
          onCheckedChange={(v) => handleSwitchChange("is_bot_enabled", v)}
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm w-32">Search Enabled</label>
        <Switch
          checked={!!formData.is_search_enabled}
          onCheckedChange={(v) => handleSwitchChange("is_search_enabled", v)}
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm w-40">Embedding Enabled</label>
        <Switch
          checked={!!formData.is_embedding_enabled}
          onCheckedChange={(v) => handleSwitchChange("is_embedding_enabled", v)}
        />
      </div>

    </div>

    {/* Other Fields Below */}
    <select
      name="subscription_plan"
      value={formData.subscription_plan}
      onChange={handleChange}
      className="border rounded-md p-2 text-sm w-full"
    >
      <option value="free">Free</option>
      <option value="basic">Basic</option>
      <option value="premium">Premium</option>
    </select>

    <Input
      type="number"
      name="member_limit"
      value={formData.member_limit}
      onChange={handleChange}
      placeholder="Member Limit"
    />

    <Input
      type="number"
      name="search_limit_monthly"
      value={formData.search_limit_monthly}
      onChange={handleChange}
      placeholder="Monthly Search Limit"
    />

  </CardContent>
</Card>


      {/* SECTION 4 — ADDITIONAL INFORMATION */}
      {/* <Card>
        <CardHeader><h2 className="font-semibold text-lg">Additional Information</h2></CardHeader>
        <CardContent className="space-y-3">
          <Input name="skills" placeholder="Skills" value={formData.member_type_data.skills || ""} onChange={handleMemberTypeChange} />
          <Input name="interests" placeholder="Interests" value={formData.member_type_data.interests || ""} onChange={handleMemberTypeChange} />

          <textarea name="bio" rows={4} className="w-full border rounded-md p-2 text-sm"
            placeholder="Bio" value={formData.member_type_data.bio || ""} onChange={handleMemberTypeChange} />
        </CardContent>
      </Card> */}

      {/* SAVE BUTTON */}
      <div className="flex justify-end gap-2">
        <Link to="/community">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button className="pg-primary" variant="outline" onClick={handleSubmit}>
          {isEdit ? "Update Community" : "Create Community"}
        </Button>
      </div>
    </div>
  );
}
