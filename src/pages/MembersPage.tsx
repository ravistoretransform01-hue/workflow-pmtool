import { useState, useEffect } from "react";
import { Loader2, Mail, Calendar, Shield } from "lucide-react";
import { organizationApi, type OrganizationMember } from "@/features/organization/organizationApi";
import { getOrganizationId } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { toast } from "sonner";

export default function MembersPage() {
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      const organizationId = getOrganizationId();
      
      if (!organizationId) {
        toast.error("Organization not found");
        setLoading(false);
        return;
      }

      try {
        const data = await organizationApi.getOrganizationMembers(organizationId);
        setMembers(data);
      } catch (error) {
        console.error("Failed to fetch members:", error);
        toast.error("Failed to load members");
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  // Helper function to get initials from name
  const getUserInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Helper function to generate avatar color based on user ID
  const getAvatarColor = (userId: string) => {
    const colors = [
      "#16a249", // green
      "#3c83f6", // blue
      "#a855f7", // purple
      "#dc2828", // red
      "#facc14", // yellow
      "#ff8400", // orange
    ];
    const numericId = parseInt(userId, 10) || 0;
    return colors[numericId % colors.length];
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  // Helper function to get status badge color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-500/20 text-green-500 border-green-500/30";
      case "pending":
        return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
      case "inactive":
        return "bg-gray-500/20 text-gray-500 border-gray-500/30";
      default:
        return "bg-blue-500/20 text-blue-500 border-blue-500/30";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Organization Members</h1>
            <p className="text-muted-foreground mt-1">
              {members.length} {members.length === 1 ? "member" : "members"} in your organization
            </p>
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="flex-1 overflow-auto p-6">
        {members.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No members found</h3>
              <p className="text-muted-foreground">
                There are no members in your organization yet.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <div
                key={member.member_id}
                className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                {/* Member Header */}
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback
                      style={{ backgroundColor: getAvatarColor(member.user_id) }}
                      className="text-white text-lg font-semibold"
                    >
                      {getUserInitials(member.display_name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-foreground truncate">
                      {member.display_name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                          member.status
                        )}`}
                      >
                        {member.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Member Details */}
                <div className="space-y-3">
                  {/* Email */}
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground truncate" title={member.user_email}>
                      {member.user_email}
                    </span>
                  </div>

                  {/* Name */}
                  {(member.first_name || member.last_name) && (
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">
                        {[member.first_name, member.last_name].filter(Boolean).join(" ")}
                      </span>
                    </div>
                  )}

                  {/* Joined Date */}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">
                      Joined {formatDate(member.joined_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
