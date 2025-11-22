import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { memberAPI, communityAPI } from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";

// Options for select fields
const LOOKING_FOR_OPTIONS_ALUMNI = [
  "Mentorship",
  "Job Opportunities",
  "Collaboration",
  "Networking",
];

const CAN_OFFER_OPTIONS_ALUMNI = [
  "Mentorship",
  "Referrals",
  "Career Guidance",
  "Industry Insights",
];

const BUSINESS_STAGE_OPTIONS = [
  { label: "Idea Stage", value: "idea" },
  { label: "MVP", value: "mvp" },
  { label: "Growth", value: "growth" },
  { label: "Scaled", value: "scaled" },
];

const FUNDING_STATUS_OPTIONS = [
  { label: "Bootstrapped", value: "bootstrapped" },
  { label: "Seed", value: "seed" },
  { label: "Series A", value: "series_a" },
  { label: "Series B", value: "series_b" },
  { label: "Series C+", value: "series_c_plus" },
];

const LOOKING_FOR_OPTIONS_ENTREPRENEUR = [
  "Investors",
  "Co-founders",
  "Clients",
  "Partners",
  "Mentors",
];

const CAN_PROVIDE_OPTIONS_ENTREPRENEUR = [
  "Investment",
  "Mentorship",
  "Services",
  "Partnership",
];

export function MemberForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== "new";

  const [searchParams] = useSearchParams();
  const groupId = searchParams.get("groupId");

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [communityType, setCommunityType] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    // Basic Info
    name: "",
    phone: "",
    email: "",
    role: "member",

    // ========== ALUMNI FIELDS ==========
    college: "",
    graduation_year: "",
    degree: "",
    department: "",
    current_organization: "",
    job_title: "",
    industry_sector: "",
    years_of_experience: "",
    linkedin_url: "",
    achievements: "",
    looking_for_alumni: [] as string[],
    can_offer_alumni: [] as string[],

    // ========== ENTREPRENEUR FIELDS ==========
    company_name: "",
    entrepreneur_industry: "",
    business_stage: "",
    founded_year: "",
    team_size: "",
    website_url: "",
    funding_status: "",
    revenue_range: "",
    services_products: "",
    target_market: "",
    looking_for_entrepreneur: [] as string[],
    can_provide_entrepreneur: [] as string[],
    areas_of_expertise: "",
    previous_ventures: "",

    // ========== APARTMENT FIELDS ==========
    apartment_number: "",
    floor: "",
    block: "",

    // ========== COMMON FIELDS ==========
    skills: "",
    interests: "",
    bio: "",
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
    const p = m.profile_data || {};

    const flattened = {
      // Basic Info
      name: m.name || "",
      phone: m.phone || "",
      email: m.email || "",
      role: m.role || "member",

      // Alumni Fields
      college: p.college ?? "",
      graduation_year: p.graduation_year ?? "",
      degree: p.degree ?? "",
      department: p.department ?? "",
      current_organization: p.current_organization ?? "",
      job_title: p.job_title ?? "",
      industry_sector: p.industry_sector ?? "",
      years_of_experience: p.years_of_experience ?? "",
      linkedin_url: p.linkedin_url ?? "",
      achievements: p.achievements ?? "",
      looking_for_alumni: Array.isArray(p.looking_for) ? p.looking_for : [],
      can_offer_alumni: Array.isArray(p.can_offer) ? p.can_offer : [],

      // Entrepreneur Fields
      company_name: p.company_name ?? p.company ?? "",
      entrepreneur_industry: p.entrepreneur_industry ?? p.industry ?? "",
      business_stage: p.business_stage ?? "",
      founded_year: p.founded_year ?? "",
      team_size: p.team_size ?? "",
      website_url: p.website_url ?? "",
      funding_status: p.funding_status ?? "",
      revenue_range: p.revenue_range ?? "",
      services_products: p.services_products ?? "",
      target_market: p.target_market ?? "",
      looking_for_entrepreneur: Array.isArray(p.looking_for) ? p.looking_for : [],
      can_provide_entrepreneur: Array.isArray(p.can_provide) ? p.can_provide : [],
      areas_of_expertise: p.areas_of_expertise ?? "",
      previous_ventures: p.previous_ventures ?? "",

      // Apartment Fields
      apartment_number: p.apartment_number ?? "",
      floor: p.floor ?? "",
      block: p.block ?? "",

      // Common Fields
      skills: Array.isArray(p.skills) ? p.skills.join(", ") : p.skills ?? "",
      interests: Array.isArray(p.interests) ? p.interests.join(", ") : p.interests ?? "",
      bio: p.bio ?? "",
    };

    setFormData(flattened);
  }, [communityMemberResp]);

  /* ------------------ Build Profile Data ------------------ */
  const buildProfileData = (type: string, data: typeof formData) => {
    const profileData: any = {};

    if (type === "alumni") {
      profileData.college = data.college || null;
      profileData.graduation_year = data.graduation_year || null;
      profileData.degree = data.degree || null;
      profileData.department = data.department || null;
      profileData.current_organization = data.current_organization || null;
      profileData.job_title = data.job_title || null;
      profileData.industry_sector = data.industry_sector || null;
      profileData.years_of_experience = data.years_of_experience || null;
      profileData.linkedin_url = data.linkedin_url || null;
      profileData.achievements = data.achievements || null;
      profileData.looking_for = data.looking_for_alumni || [];
      profileData.can_offer = data.can_offer_alumni || [];
    }

    if (type === "entrepreneur") {
      profileData.company_name = data.company_name || null;
      profileData.entrepreneur_industry = data.entrepreneur_industry || null;
      profileData.business_stage = data.business_stage || null;
      profileData.founded_year = data.founded_year || null;
      profileData.team_size = data.team_size || null;
      profileData.website_url = data.website_url || null;
      profileData.funding_status = data.funding_status || null;
      profileData.revenue_range = data.revenue_range || null;
      profileData.services_products = data.services_products || null;
      profileData.target_market = data.target_market || null;
      profileData.looking_for = data.looking_for_entrepreneur || [];
      profileData.can_provide = data.can_provide_entrepreneur || [];
      profileData.areas_of_expertise = data.areas_of_expertise || null;
      profileData.previous_ventures = data.previous_ventures || null;
    }

    if (type === "apartment") {
      profileData.apartment_number = data.apartment_number || null;
      profileData.floor = data.floor || null;
      profileData.block = data.block || null;
    }

    // Common fields
    profileData.skills = data.skills ? data.skills.split(",").map((s) => s.trim()) : [];
    profileData.interests = data.interests ? data.interests.split(",").map((s) => s.trim()) : [];
    profileData.bio = data.bio || "";

    return profileData;
  };

  /* ------------------ Save Member ------------------ */
  const saveMutation = useMutation({
    mutationFn: async () => {
      const profileData = buildProfileData(communityType!, formData);

      const normalizedPhone = formData.phone.startsWith("+91")
        ? formData.phone
        : `+91${formData.phone.replace(/^\+?91/, "").trim()}`;

      /* ------------------ EDIT MODE ------------------ */
      if (isEdit) {
        // 1. Update basic member fields (members table)
        await memberAPI.update(id!, {
          name: formData.name,
          email: formData.email,
          phone: normalizedPhone,
        });

        // 2. Update profile_data (community membership table)
        return communityAPI.updateMember(id!, groupId!, {
          profile_data: profileData,
        });
      }

      /* ------------------ CREATE MODE ------------------ */
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCheckboxChange = (field: string, value: string, checked: boolean) => {
    const currentValues = formData[field as keyof typeof formData] as string[];
    if (checked) {
      setFormData({ ...formData, [field]: [...currentValues, value] });
    } else {
      setFormData({ ...formData, [field]: currentValues.filter((v) => v !== value) });
    }
  };

  const isAlumni = communityType === "alumni";
  const isEntrepreneur = communityType === "entrepreneur";
  const isApartment = communityType === "apartment";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={`/members?groupId=${groupId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{isEdit ? "Edit Member" : "Add Member"}</h1>
          <p className="text-muted-foreground mt-1">
            {communityType && `Community Type: ${communityType.charAt(0).toUpperCase() + communityType.slice(1)}`}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-lg">Personal Information</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Name *</label>
                <Input
                  name="name"
                  // placeholder="Full Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Phone *</label>
                <Input
                  name="phone"
                  // placeholder="Phone Number"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Email</label>
                <Input
                  name="email"
                  type="email"
                  // placeholder="Email Address"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="border p-2 rounded-md w-full h-10"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ========== ALUMNI FIELDS ========== */}
        {isAlumni && (
          <>
            <Card>
              <CardHeader>
                <h2 className="font-semibold text-lg">Educational Information</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">College/School *</label>
                    <Input
                      name="college"
                      // placeholder="College or School Name"
                      value={formData.college}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Graduation Year *</label>
                    <Input
                      name="graduation_year"
                      // placeholder="e.g., 2020"
                      value={formData.graduation_year}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Degree/Course *</label>
                    <Input
                      name="degree"
                      // placeholder="e.g., B.Tech, MBA"
                      value={formData.degree}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Department *</label>
                    <Input
                      name="department"
                      // placeholder="e.g., Computer Science"
                      value={formData.department}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-semibold text-lg">Professional Information</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Current Organization *</label>
                    <Input
                      name="current_organization"
                      // placeholder="Company Name"
                      value={formData.current_organization}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Job Title/Designation *</label>
                    <Input
                      name="job_title"
                      // placeholder="e.g., Software Engineer"
                      value={formData.job_title}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Industry/Sector</label>
                    <Input
                      name="industry_sector"
                      // placeholder="e.g., IT, Healthcare"
                      value={formData.industry_sector}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Years of Experience</label>
                    <Input
                      name="years_of_experience"
                      // placeholder="e.g., 5"
                      value={formData.years_of_experience}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">LinkedIn Profile URL</label>
                    <Input
                      name="linkedin_url"
                      // placeholder="https://linkedin.com/in/username"
                      value={formData.linkedin_url}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Achievements/Awards</label>
                    <Input
                      name="achievements"
                      // placeholder="Notable achievements"
                      value={formData.achievements}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-semibold text-lg">Networking Preferences</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Looking For</label>
                  <div className="flex flex-wrap gap-4">
                    {LOOKING_FOR_OPTIONS_ALUMNI.map((option) => (
                      <label key={option} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.looking_for_alumni.includes(option)}
                          onChange={(e) =>
                            handleCheckboxChange("looking_for_alumni", option, e.target.checked)
                          }
                          className="rounded"
                        />
                        <span className="text-sm">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Can Offer</label>
                  <div className="flex flex-wrap gap-4">
                    {CAN_OFFER_OPTIONS_ALUMNI.map((option) => (
                      <label key={option} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.can_offer_alumni.includes(option)}
                          onChange={(e) =>
                            handleCheckboxChange("can_offer_alumni", option, e.target.checked)
                          }
                          className="rounded"
                        />
                        <span className="text-sm">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ========== ENTREPRENEUR FIELDS ========== */}
        {isEntrepreneur && (
          <>
            <Card>
              <CardHeader>
                <h2 className="font-semibold text-lg">Business Information</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Company/Startup Name *</label>
                    <Input
                      name="company_name"
                      // placeholder="Company Name"
                      value={formData.company_name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Industry/Sector *</label>
                    <Input
                      name="entrepreneur_industry"
                      // placeholder="e.g., Fintech, EdTech"
                      value={formData.entrepreneur_industry}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Business Stage</label>
                    <select
                      name="business_stage"
                      value={formData.business_stage}
                      onChange={handleChange}
                      className="border p-2 rounded-md w-full h-10"
                    >
                      <option value="">Select Stage</option>
                      {BUSINESS_STAGE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Founded Year</label>
                    <Input
                      name="founded_year"
                      // placeholder="e.g., 2022"
                      value={formData.founded_year}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Team Size</label>
                    <Input
                      name="team_size"
                      // placeholder="e.g., 10"
                      value={formData.team_size}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Website/Portfolio URL *</label>
                    <Input
                      name="website_url"
                      // placeholder="https://yourcompany.com"
                      value={formData.website_url}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-semibold text-lg">Financial & Market Information</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Funding Status</label>
                    <select
                      name="funding_status"
                      value={formData.funding_status}
                      onChange={handleChange}
                      className="border p-2 rounded-md w-full h-10"
                    >
                      <option value="">Select Status</option>
                      {FUNDING_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Revenue Range (Optional)</label>
                    <Input
                      name="revenue_range"
                      // placeholder="e.g., $100K - $500K"
                      value={formData.revenue_range}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-muted-foreground mb-1 block">Services/Products Offered *</label>
                    <textarea
                      name="services_products"
                      // placeholder="Describe your products or services"
                      value={formData.services_products}
                      onChange={handleChange}
                      className="w-full border rounded-md p-2 text-sm min-h-[80px]"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-muted-foreground mb-1 block">Target Market</label>
                    <Input
                      name="target_market"
                      // placeholder="e.g., B2B, SMBs, Enterprise"
                      value={formData.target_market}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-semibold text-lg">Expertise & Networking</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="text-sm text-muted-foreground mb-1 block">Areas of Expertise *</label>
                    <Input
                      name="areas_of_expertise"
                      // placeholder="e.g., Sales, Marketing, Tech (comma separated)"
                      value={formData.areas_of_expertise}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-muted-foreground mb-1 block">Previous Ventures (if any)</label>
                    <Input
                      name="previous_ventures"
                      // placeholder="Previous company names or ventures"
                      value={formData.previous_ventures}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Looking For *</label>
                  <div className="flex flex-wrap gap-4">
                    {LOOKING_FOR_OPTIONS_ENTREPRENEUR.map((option) => (
                      <label key={option} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.looking_for_entrepreneur.includes(option)}
                          onChange={(e) =>
                            handleCheckboxChange("looking_for_entrepreneur", option, e.target.checked)
                          }
                          className="rounded"
                        />
                        <span className="text-sm">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Can Provide *</label>
                  <div className="flex flex-wrap gap-4">
                    {CAN_PROVIDE_OPTIONS_ENTREPRENEUR.map((option) => (
                      <label key={option} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.can_provide_entrepreneur.includes(option)}
                          onChange={(e) =>
                            handleCheckboxChange("can_provide_entrepreneur", option, e.target.checked)
                          }
                          className="rounded"
                        />
                        <span className="text-sm">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ========== APARTMENT FIELDS ========== */}
        {isApartment && (
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-lg">Apartment Information</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Apartment Number</label>
                  <Input
                    name="apartment_number"
                    // placeholder="e.g., A-101"
                    value={formData.apartment_number}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Floor</label>
                  <Input
                    name="floor"
                    // placeholder="e.g., 1"
                    value={formData.floor}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Block</label>
                  <Input
                    name="block"
                    // placeholder="e.g., A"
                    value={formData.block}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========== COMMON FIELDS ========== */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-lg">Additional Information</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Skills (comma separated)</label>
              <Input
                name="skills"
                // placeholder="e.g., JavaScript, Project Management"
                value={formData.skills}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Interests (comma separated)</label>
              <Input
                name="interests"
                // placeholder="e.g., AI, Startups, Music"
                value={formData.interests}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Bio</label>
              <textarea
                name="bio"
                // placeholder="A short bio about yourself"
                value={formData.bio}
                onChange={handleChange}
                className="w-full border rounded-md p-2 text-sm min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-2">
          <Link to={`/members?groupId=${groupId}`}>
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : isEdit ? "Update Member" : "Add Member"}
          </Button>
        </div>
      </form>
    </div>
  );
}