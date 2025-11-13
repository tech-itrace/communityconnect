import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { communityAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Trash2, Eye } from "lucide-react";
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
      // Some backends return { success, data }; some return array directly
      return Array.isArray(response.data) ? response.data : response.data?.data || [];
    },
  });

  console.log("communityData:", communityData);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => communityAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community"] });
    },
  });

  const filteredCommunities = communityData?.filter(
    (community) =>
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Community</h1>
          <p className="text-muted-foreground mt-2">
            Manage your registered communities
          </p>
        </div>
        <Link to="/community/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Community
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search community..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Admins</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Created At</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCommunities?.map((community) => (
                  <tr key={community.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">{community.name}</td>
                    <td className="p-3 text-muted-foreground">
                      {community.type || "-"}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {community.admins?.map((a: any) => a.name).join(", ") || "-"}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          community.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {community.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(community.created_at).toLocaleDateString("en-IN")}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/community/${community.id}`}>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredCommunities?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No communities found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
