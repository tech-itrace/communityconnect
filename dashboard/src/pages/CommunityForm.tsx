import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, Link } from "react-router-dom";
import { communityAPI } from "@/lib/api";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Users } from "lucide-react";

type Member = {
  id: string | number;
  name?: string;
  phone?: string;
  email?: string;
  role?: string;
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

  // Logged user will be automatically added as first member during create
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
  });

  // Only used in Edit mode
  const [existingMembers, setExistingMembers] = useState<Member[]>([]);

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

      // Set existing members for display in Edit mode
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

  const handleSwitchChange = (name: keyof CommunityPayload, value: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: CommunityPayload) => {
      if (isEdit) {
        return communityAPI.update(id!, payload);
      }
      // For create, include logged user data so they become the first member
      return communityAPI.create({
        ...payload,
        member_type_data: {
          ...payload.member_type_data,
          name: loggedUser.name,
          phone: loggedUser.phone,
          email: loggedUser.email,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      navigate("/community");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  if (isLoading && isEdit) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  const navigateToMembersPage = (communityId: string) => {
    navigate(`/members?groupId=${communityId}`);
  };

  const navigateToSingleMemberPage = (memberId: string | number) => {
    navigate(`/member/${memberId}?groupId=${id}`);
  };

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <Link to="/community">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{isEdit ? "Edit Community" : "Create Community"}</h1>
          <p className="text-muted-foreground">{formData.name || "New Community"}</p>
        </div>
      </div>

      {/* SECTION 1 — COMMUNITY DETAILS */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-lg">Community Details</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            name="name"
            placeholder="Community Name"
            value={formData.name}
            onChange={handleChange}
          />
          <Input
            name="slug"
            placeholder="Slug"
            value={formData.slug}
            readOnly
            className="bg-muted"
          />
          <textarea
            name="description"
            rows={3}
            className="w-full border rounded-md p-2 text-sm"
            placeholder="Description"
            value={formData.description}
            onChange={handleChange}
          />
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="flex h-10 w-full rounded-md border px-3 text-sm"
          >
            <option value="">Select Type</option>
            {COMMUNITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* SECTION 2 — MEMBERS DETAILS (Only show in Edit mode) */}
      {isEdit && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center w-full">
              <h2 className="font-semibold text-lg">Members</h2>
              <span className="text-sm text-muted-foreground">
                {existingMembers.length} member{existingMembers.length !== 1 ? "s" : ""}
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Show first 5 members as preview */}
            {existingMembers.length > 0 ? (
              <div className="border rounded-md">
                <div className="divide-y">
                  {existingMembers.slice(0, 5).map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-3 gap-3 hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigateToSingleMemberPage(m.id)}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium">
                            {m.name?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{m.name || "Unknown"}</div>
                          <div className="text-xs text-muted-foreground">{m.phone}</div>
                        </div>
                        <div className="text-xs px-2 py-1 rounded-full bg-muted">
                          {m.role || "member"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No members yet</p>
              </div>
            )}
          </CardContent>

          <CardFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => communityResponse?.community?.id && navigateToMembersPage(communityResponse.community.id)}
            >
              <Users className="w-4 h-4 mr-2" />
              View All Members
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Info message for Create mode */}
      {!isEdit && (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Users className="w-5 h-5" />
              <p className="text-sm">
                You ({loggedUser.name}) will be automatically added as the first admin member of this community.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 3 — OTHER DETAILS */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-lg">Settings</h2>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Toggle Row */}
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <label className="text-sm">Bot Enabled</label>
              <Switch
                checked={!!formData.is_bot_enabled}
                onCheckedChange={(v) => handleSwitchChange("is_bot_enabled", v)}
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm">Search Enabled</label>
              <Switch
                checked={!!formData.is_search_enabled}
                onCheckedChange={(v) => handleSwitchChange("is_search_enabled", v)}
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm">Embedding Enabled</label>
              <Switch
                checked={!!formData.is_embedding_enabled}
                onCheckedChange={(v) => handleSwitchChange("is_embedding_enabled", v)}
              />
            </div>
          </div>

          {/* Subscription Plan */}
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Subscription Plan</label>
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
          </div>

          {/* Limits */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Member Limit</label>
              <Input
                type="number"
                name="member_limit"
                value={formData.member_limit}
                onChange={handleChange}
                placeholder="Member Limit"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Monthly Search Limit</label>
              <Input
                type="number"
                name="search_limit_monthly"
                value={formData.search_limit_monthly}
                onChange={handleChange}
                placeholder="Monthly Search Limit"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SAVE BUTTON */}
      <div className="flex justify-end gap-2">
        <Link to="/community">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
          {saveMutation.isPending
            ? "Saving..."
            : isEdit
            ? "Update Community"
            : "Create Community"}
        </Button>
      </div>
    </div>
  );
}