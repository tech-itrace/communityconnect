import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { communityAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Trash2, Eye, Users, MapPin, Clock } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export function Community() {
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: communityData, isLoading } = useQuery({
    queryKey: ["community"],
    queryFn: async () => {
      const response = await communityAPI.getAll();
      return Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => communityAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community"] });
    },
  });

  const filteredCommunities = communityData?.filter((community) =>
    community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    community.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    community.type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading communities...</div>
      </div>
    );
  }

  const navigateToSelectedGroupMembers = (groupId) => {
navigate(`/members?groupdId=${groupId}`)
  } 
   return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Community</h1>
          <p className="text-muted-foreground mt-2">
            Manage your registered communities
          </p>
        </div>
        <Link to="/community/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" /> Add Community
          </Button>
        </Link>
      </div>

      {/* Search Bar */}
      <Card>
        <CardHeader>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search community..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
      </Card>

      {/* Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCommunities?.map((community) => (
          <Card key={community.id} className="hover:shadow-lg transition-shadow rounded-2xl">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{community.name}</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    community.is_active
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {community.is_active ? "Active" : "Inactive"}
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {/* Admin Avatars */}
              <div className="flex items-center gap-2" onClick={()=>navigateToSelectedGroupMembers(community.id)}>
                   <div className="flex -space-x-2">
  {community.admins.slice(0, 2).map((admin) => (
    <div
      key={admin.id}
      className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium"
    >
      {admin.name?.trim()?.charAt(0)?.toUpperCase() || "?"}
    </div>
  ))}

  {community.admins.length > 2 && (
    <div className="h-8 w-8 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center text-sm font-medium">
      +{community.admins.length - 2}
    </div>
  )}
</div>


                 
                  {community.admins?.length > 2 && (
                    <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs">
                      +{community.admins.length - 2}
                    </div>
                  )}
                </div>
              </div>
            

              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700 font-medium">
                {community.type || "-"}
              </span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Created: {new Date(community.created_at).toLocaleDateString("en-IN")}
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-4">
                

                <Link to={`/community/${community.id}/edit`}>
                  <Button variant="ghost" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                </Link>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(community.id, community.name)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCommunities?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No communities found
        </div>
      )}
    </div>
  );
}
