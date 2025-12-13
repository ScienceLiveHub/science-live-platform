import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { usersLatestNanopubs } from "@/lib/queries";
import { getUriEnd } from "@/lib/utils";
import { SiOrcid } from "@icons-pack/react-simple-icons";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import relativeTime from "dayjs/plugin/relativeTime";
import ky from "ky";
import { Calendar, CheckCircle, ExternalLink, User } from "lucide-react";
import { NanopubClient } from "nanopub-js";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

interface UserProfileData {
  id: string;
  name: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  orcidConnected: boolean;
  orcidId: string | null;
  latestContent?: any[];
}

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        let data: UserProfileData;

        if (userId) {
          // Fetch public profile by userId
          const response = await ky(
            `${import.meta.env.VITE_API_URL}/user-profile/${userId}`,
          );

          if (!response.ok) {
            if (response.status === 404) {
              setError("User not found");
            } else {
              setError("Failed to load profile");
            }
            setLoading(false);
            return;
          }

          data = await response.json();
        } else {
          // Fetch current user's profile
          const { data: session, error: sessionError } =
            await authClient.getSession();

          if (sessionError || !session?.user) {
            setError("Please log in to view your profile");
            setLoading(false);
            return;
          }

          // Fetch current user's full profile data
          const response = await ky(
            `${import.meta.env.VITE_API_URL}/user-profile/${session.user.id}`,
          );

          if (!response.ok) {
            setError("Failed to load profile");
            setLoading(false);
            return;
          }

          data = await response.json();
        }

        if (data.orcidConnected && data.orcidId) {
          const client = new NanopubClient();

          data.latestContent = await client.querySparql(
            usersLatestNanopubs(data.orcidId),
          );
        }
        setProfile(data);
      } catch (err) {
        console.log("Error fetching user profile:", err);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="container mx-auto max-w-2xl p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
              <span className="ml-2 text-muted-foreground">
                Loading profile...
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-2xl p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <User className="mx-auto h-12 w-12 text-muted-foreground" />
              <h2 className="mt-4 text-xl font-semibold">Profile Not Found</h2>
              <p className="mt-2 text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <main className="container mx-auto flex grow flex-col gap-6 p-4 md:p-6 md:max-w-6xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage
                src={profile.image || undefined}
                alt={profile.name}
              />
              <AvatarFallback className="text-lg">
                {getInitials(profile.name)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{profile.name}</h1>
                {profile.emailVerified && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Member since {formatDate(profile.createdAt)}
              </p>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-6">
          <div className="space-y-16">
            <div>
              <h3 className="text-lg font-semibold mb-3">
                Account Information
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Joined:</span>
                  <span>{formatDate(profile.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Email Verified:</span>
                  <span>{profile.emailVerified ? "Yes" : "No"}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Connected Accounts</h3>
              <div className="flex items-center gap-2">
                <SiOrcid />
                {profile.orcidConnected && profile.orcidId ? (
                  <a
                    href={profile.orcidId}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm"
                  >
                    <Badge className="gap-2 mr-2">
                      <ExternalLink className="h-3 w-3" />
                      ORCID Connected
                    </Badge>
                    {getUriEnd(profile.orcidId)}
                  </a>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    ORCID Not Connected
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3">
                Latest Nanopublications
              </h3>
              <div className="flex-col m-4">
                {profile.latestContent?.length ? (
                  profile.latestContent?.map((c) => {
                    return (
                      <>
                        <Link to={"/np/" + getUriEnd(c.np)}>{c.label}</Link>
                        <div className="flex items-center gap-2 text-sm group relative w-70">
                          <span className="text-muted-foreground w-auto">
                            {dayjs(c.date).fromNow()}
                          </span>
                          <span className="group-hover:opacity-100 transition-opacity bg-muted px-1 text-sm text-muted-foreground rounded-md absolute translate-y-full opacity-0 m-4 mx-auto">
                            {dayjs(c.date).toString()}
                          </span>
                        </div>
                        <hr className="my-4" />
                      </>
                    );
                  })
                ) : (
                  <span className="text-muted-foreground text-sm w-auto">
                    Nothing found
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
