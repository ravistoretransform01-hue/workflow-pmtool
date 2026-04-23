import { useState, useEffect } from "react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Mail, Phone, Smartphone, MapPin, Calendar, User, Briefcase, ShieldCheck, ArrowLeft, BellRing } from "lucide-react";
import { Switch } from "@/shared/components/ui/switch";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { userApi } from "@/features/auth/userAPI";
import { ScheduleDialog } from "@/shared/components/ScheduleDialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  // Fetch user meta on mount
  useEffect(() => {
    if (user?.user_id) {
      loadUserMeta();
    }
  }, [user?.user_id]);

  const loadUserMeta = async () => {
    setIsLoading(true);
    setIsEmailPrefsLoading(true);
    try {
      const [userMeta, emailPrefs] = await Promise.all([
        userApi.getUserMeta(),
        userApi.getEmailPreferences()
      ]);
      setJobTitle(userMeta.job_title || "");
      setPhone(userMeta.phone || "");
      setMobilePhone(userMeta.mobile_phone || "");
      setLocation(userMeta.location || "");
      setEmailNotifications(emailPrefs.emails_enabled);
      setRetryCount(0);
    } catch (error) {
      console.error("Failed to fetch user meta:", error);
      if (retryCount < MAX_RETRIES) {
        setRetryCount(retryCount + 1);
        setTimeout(() => {
          loadUserMeta();
        }, 1000);
      } else {
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
          email: user.email || "",
          phone,
          mobile_phone: mobilePhone,
          location,
          job_title: jobTitle,
          email_notifications: emailNotifications,
        }),
        userApi.updateEmailPreferences(emailNotifications)
      ]);
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

  const displayName = user?.name || "User";
  const displayEmail = user?.email || "";
  const displayRole = user?.role_label || "";

  return (
    <div className="min-h-screen bg-background p-6 md:p-10 animate-in fade-in duration-500">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)}
              className="rounded-full hover:bg-primary/10 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
              <p className="text-muted-foreground">Manage your personal information and work preferences.</p>
            </div>
          </div>
          <Button
            onClick={handleUpdateProfile}
            disabled={isSaving || isLoading}
            className="px-8 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Avatar & Basic Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card border-2 border-primary/5 rounded-3xl p-8 flex flex-col items-center text-center space-y-4 shadow-sm">
              <div className="relative group">
                <Avatar className="h-48 w-48 ring-8 ring-primary/5 transition-transform group-hover:scale-[1.02] duration-300">
                  <AvatarFallback className="text-6xl font-bold text-primary bg-primary/10">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <span className="text-white text-sm font-medium">Change Photo</span>
                </div>
              </div>
              
              <div className="space-y-1 pt-4">
                <h2 className="text-2xl font-bold">{displayName}</h2>
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Briefcase className="h-4 w-4" />
                  <Input
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Add job title"
                    className="border-none bg-transparent p-0 h-auto text-center focus-visible:ring-0 placeholder:text-muted-foreground/50 w-fit"
                  />
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-2 pt-2">
                <Badge variant="secondary" className="px-3 py-1 bg-primary/5 text-primary border-primary/10">
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  {displayRole}
                </Badge>
              </div>
            </div>

            <div className="bg-card border-2 border-primary/5 rounded-3xl p-6 space-y-4 shadow-sm">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Work Schedule
              </h3>
              <p className="text-sm text-muted-foreground">Manage your availability and working hours.</p>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 hover:bg-primary/5 transition-colors"
                onClick={() => setScheduleDialogOpen(true)}
              >
                Configure Schedule
              </Button>
            </div>

            <div className="bg-card border-2 border-primary/5 rounded-3xl p-6 space-y-4 shadow-sm">
              <h3 className="font-semibold flex items-center gap-2">
                <BellRing className="h-4 w-4 text-primary" />
                Preferences
              </h3>
              <div className="flex items-center gap-4 py-2">
                {isEmailPrefsLoading ? (
                  <Skeleton className="h-6 w-9 rounded-full" />
                ) : (
                  <Switch
                    id="email-notifications"
                    checked={emailNotifications}
                    onCheckedChange={handleToggleEmailNotifications}
                  />
                )}
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications" className="text-sm font-medium">Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive updates via email.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Detailed Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border-2 border-primary/5 rounded-3xl p-8 shadow-sm space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Account Details Section */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2 border-b border-primary/5 pb-2">
                    <User className="h-5 w-5 text-primary" />
                    Account Details
                  </h3>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      Email Address
                    </div>
                    <Input
                      type="email"
                      value={displayEmail}
                      disabled
                      className="bg-muted/50 border-primary/5 italic"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      Location
                    </div>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. San Francisco, CA"
                      className="bg-background border-primary/10 focus:border-primary/30 transition-all"
                    />
                  </div>
                </div>

                {/* Contact Information Section */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2 border-b border-primary/5 pb-2">
                    <Phone className="h-5 w-5 text-primary" />
                    Contact Info
                  </h3>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      Office Phone
                    </div>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="bg-background border-primary/10 focus:border-primary/30 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Smartphone className="h-4 w-4" />
                      Mobile Phone
                    </div>
                    <Input
                      type="tel"
                      value={mobilePhone}
                      onChange={(e) => setMobilePhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="bg-background border-primary/10 focus:border-primary/30 transition-all"
                    />
                  </div>
                </div>
              </div>

              {isLoading && retryCount > 0 && (
                <div className="flex items-center gap-2 text-xs text-amber-500 animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Connection issues? Retrying... ({retryCount}/{MAX_RETRIES})
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ScheduleDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
      />
    </div>
  );
}
