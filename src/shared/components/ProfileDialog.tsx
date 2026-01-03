import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Mail, Phone, Smartphone, MapPin, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { userApi } from "@/features/auth/userAPI";
import { ScheduleDialog } from "./ScheduleDialog";
import { toast } from "sonner";

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { user } = useAuth();
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [mobilePhone, setMobilePhone] = useState("");
  const [location, setLocation] = useState("");
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  // Fetch user meta when dialog opens
  useEffect(() => {
    if (open && user?.user_id) {
      loadUserMeta();
    }
  }, [open]);

  const loadUserMeta = async () => {
    setIsLoading(true);
    try {
      // Always fetch fresh user meta data
      const userMeta = await userApi.getUserMeta();
      setJobTitle(userMeta.job_title || "");
      setPhone(userMeta.phone || "");
      setMobilePhone(userMeta.mobile_phone || "");
      setLocation(userMeta.location || "");
      setRetryCount(0); // Reset retry count on success
    } catch (error) {
      console.error("Failed to fetch user meta:", error);

      // Retry logic
      if (retryCount < MAX_RETRIES) {
        setRetryCount(retryCount + 1);
        // Retry after 1 second
        setTimeout(() => {
          loadUserMeta();
        }, 1000);
      } else {
        // Show error after max retries
        toast.error("Failed to load user details. Please try again.");
        setRetryCount(0);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleUpdateProfile = async () => {
    if (!user?.user_id) return;

    setIsSaving(true);
    try {
      await userApi.updateUserMeta({
        email: displayEmail,
        phone,
        mobile_phone: mobilePhone,
        location,
        job_title: jobTitle,
      });
      onOpenChange(false);
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  // Use real user information from API
  const displayName = user?.name || "User";
  const displayEmail = user?.email || "";
  const displayUsername = user?.username || "";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="sr-only">
            <span>Profile</span>
          </DialogHeader>

          <div className="p-6">
            <div className="flex gap-8">
              {/* Left Side - User Info */}
              <div className="flex-1 space-y-6">
                <div className="flex items-start gap-6">
                  <div className="relative group">
                    <Avatar className="h-40 w-40 bg-primary/10">
                      <AvatarFallback className="text-5xl font-bold text-primary bg-transparent">
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="text-3xl font-semibold">{displayName}</div>

                    <Input
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="Add a job title"
                      className="border-none p-0 text-muted-foreground focus-visible:ring-0"
                    />

                    <Badge variant="secondary" className="w-fit">
                      {displayUsername}
                    </Badge>

                    <div className="space-y-3 pt-4">
                      <h3 className="font-semibold">Your work schedules:</h3>
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => setScheduleDialogOpen(true)}
                      >
                        <Calendar className="h-4 w-4" />
                        Schedule
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Form Fields Column */}
              <div className="w-80 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Mail className="h-4 w-4" />
                    Email
                  </div>
                  <Input
                    type="email"
                    value={displayEmail}
                    disabled
                    placeholder="Email"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Phone className="h-4 w-4" />
                    Phone
                  </div>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Add a phone"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Smartphone className="h-4 w-4" />
                    Mobile phone
                  </div>
                  <Input
                    type="tel"
                    value={mobilePhone}
                    onChange={(e) => setMobilePhone(e.target.value)}
                    placeholder="Add a mobile phone"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <MapPin className="h-4 w-4" />
                    Location
                  </div>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Add a location"
                  />
                </div>

                {isLoading && retryCount > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Retrying... ({retryCount}/{MAX_RETRIES})
                  </div>
                )}

                <Button
                  onClick={handleUpdateProfile}
                  disabled={isSaving || isLoading}
                  className="w-full mt-4"
                >
                  {isSaving ? "Updating..." : "Update"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ScheduleDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
      />
    </>
  );
}
