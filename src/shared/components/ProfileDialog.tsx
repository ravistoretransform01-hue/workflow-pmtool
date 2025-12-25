import { useState } from "react";
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
import { useTestUser } from "@/contexts/TestUserContext";
import { testUserEmails } from "@/contexts/TestUserContext";
import { ScheduleDialog } from "./ScheduleDialog";

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const avatarColors = [
  "bg-gradient-to-br from-purple-500 to-pink-500",
  "bg-gradient-to-br from-blue-500 to-cyan-500",
  "bg-gradient-to-br from-green-500 to-emerald-500",
  "bg-gradient-to-br from-orange-500 to-red-500",
  "bg-gradient-to-br from-indigo-500 to-purple-500",
  "bg-gradient-to-br from-pink-500 to-rose-500",
];

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { currentUser } = useTestUser();
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [mobilePhone, setMobilePhone] = useState("");
  const [location, setLocation] = useState("");
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

  const userEmail = testUserEmails[currentUser.id] || "";

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="sr-only">
            <span>Profile</span>
          </DialogHeader>

          <div className="flex gap-8 p-6">
            <div className="flex-1 space-y-6">
              <div className="flex items-start gap-6">
                <div className="relative group">
                  <Avatar 
                    className="h-40 w-40"
                    style={{ backgroundColor: currentUser.avatarColor }}
                  >
                    <AvatarFallback 
                      className="text-5xl font-bold text-white bg-transparent"
                      style={{ backgroundColor: currentUser.avatarColor }}
                    >
                      {getInitials(currentUser.name)}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="text-3xl font-semibold">
                    {currentUser.name}
                  </div>
                
                <Input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Add a job title"
                  className="border-none p-0 text-muted-foreground focus-visible:ring-0"
                />

                <Badge variant="secondary" className="w-fit">
                  Admin
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
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

          <div className="w-80 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Mail className="h-4 w-4" />
                Email
              </div>
              <Input
                type="email"
                value={userEmail}
                disabled
                placeholder="Add email"
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
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <ScheduleDialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen} />
    </>
  );
}
