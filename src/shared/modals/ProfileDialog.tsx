import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import {
  Mail,
  Phone,
  Smartphone,
  MapPin,
  Calendar,
  BellRing,
} from "lucide-react";
import { Switch } from "@/shared/ui/switch";
import { Label } from "@/shared/ui/label";
import { Skeleton } from "@/shared/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { userApi } from "@/features/auth/api/userAPI";
import { ScheduleDialog } from "@/shared/modals/ScheduleDialog";
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
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [isEmailPrefsLoading, setIsEmailPrefsLoading] = useState(false);
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
    setIsEmailPrefsLoading(true);
    try {
      // Always fetch fresh user meta data
      const [userMeta, emailPrefs] = await Promise.all([
        userApi.getUserMeta(),
        userApi.getEmailPreferences(),
      ]);
      setJobTitle(userMeta.job_title || "");
      setPhone(userMeta.phone || "");
      setMobilePhone(userMeta.mobile_phone || "");
      setLocation(userMeta.location || "");
      setEmailNotifications(emailPrefs.emails_enabled);
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
      setIsEmailPrefsLoading(false);
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
      await Promise.all([
        userApi.updateUserMeta({
          email: displayEmail,
          phone,
          mobile_phone: mobilePhone,
          location,
          job_title: jobTitle,
          email_notifications: emailNotifications,
        }),
        userApi.updateEmailPreferences(emailNotifications),
      ]);
      onOpenChange(false);
      toast.success("Profile Updated Successfully");
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEmailNotifications = async (checked: boolean) => {
    // Optimistic update
    setEmailNotifications(checked);

    try {
      await userApi.updateEmailPreferences(checked);
      toast.success(`Email notifications ${checked ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("Failed to update email preferences:", error);
      toast.error("Failed to update email preferences");
      // Revert on failure
      setEmailNotifications(!checked);
    }
  };

  // Use real user information from API
  const displayName = user?.name || "User";
  const displayEmail = user?.email || "";
  // const displayUsername = user?.username || "";
  const displayRole = user?.role_label || "";

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

                    {/* <Badge variant="secondary" className="w-fit">
                      {displayUsername}
                    </Badge> */}
                    <Badge variant="secondary" className="w-fit">
                      {displayRole}
                    </Badge>

                    <div className="hidden space-y-3 pt-4">
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

                    <div className="space-y-3 pt-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <BellRing className="h-4 w-4 text-primary" />
                        Preferences
                      </h3>
                      <div className="flex items-center gap-4">
                        {isEmailPrefsLoading ? (
                          <Skeleton className="h-6 w-9 rounded-full" />
                        ) : (
                          <Switch
                            id="dialog-email-notifications"
                            checked={emailNotifications}
                            onCheckedChange={handleToggleEmailNotifications}
                          />
                        )}
                        <div className="space-y-0.5">
                          <Label
                            htmlFor="dialog-email-notifications"
                            className="text-sm font-medium"
                          >
                            Email Notifications
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Receive updates via email.
                          </p>
                        </div>
                      </div>
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
