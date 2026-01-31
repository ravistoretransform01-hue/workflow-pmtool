import axios from "@/lib/axios";

export interface OrganizationMember {
  member_id: string;
  user_id: string;
  status: string;
  joined_at: string;
  display_name: string;
  user_email: string;
  first_name: string;
  last_name: string;
}

export interface GetOrganizationMembersResponse {
  success: boolean;
  count: number;
  data: OrganizationMember[];
}

export const organizationApi = {
  /**
   * Get all members of an organization
   */
  getOrganizationMembers: async (
    organizationId: number
  ): Promise<OrganizationMember[]> => {
    const response = await axios.get<GetOrganizationMembersResponse>(
      `/organization/members`,
      {
        params: {
          organization_id: organizationId,
        },
      }
    );

    if (response.data.success) {
      return response.data.data;
    }

    throw new Error("Failed to fetch organization members");
  },
};
