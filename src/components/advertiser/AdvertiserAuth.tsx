import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getSecureAdvertiserIdentity, signInAdvertiser, signOutAdvertiser, signUpAdvertiser, syncAdvertiserAuthProfile } from "@/utils/secureAdvertiserAuth";

export function AdvertiserAuth() {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [busy, setBusy] = useState(false);
  const [currentIdentity, setCurrentIdentity] = useState<{ id: string; username: string; email: string } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const identity = await getSecureAdvertiserIdentity();
      if (active) setCurrentIdentity(identity);
    })();
    return () => { active = false; };
  }, []);

  const handleSignIn = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      toast.error("Enter your email and password");
      return;
    }

    setBusy(true);
    const { error, identity } = await signInAdvertiser(trimmedEmail, password);
    setBusy(false);

    if (error) {
      toast.error(error);
      return;
    }

    setCurrentIdentity(identity);
    await syncAdvertiserAuthProfile();
    toast.success("Signed in securely");
  };

  const handleSignUp = async () => {
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      toast.error("Username must be 3–20 characters");
      return;
    }
    if (!trimmedEmail || !/^.+@.+\..+$/.test(trimmedEmail)) {
      toast.error("Enter a valid email");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setBusy(true);
    const { error, identity } = await signUpAdvertiser({
      email: trimmedEmail,
      password,
      username: trimmedUsername,
      country: country.trim() || undefined,
      ageGroup: ageGroup.trim() || undefined,
    });
    setBusy(false);

    if (error) {
      toast.error(error);
      return;
    }

    setCurrentIdentity(identity);
    await syncAdvertiserAuthProfile();
    toast.success("Account created — check your email to confirm signup if required.");
  };

  const handleSignOut = async () => {
    setBusy(true);
    const { error } = await signOutAdvertiser();
    setBusy(false);
    if (error) toast.error(error);
    else {
      setCurrentIdentity(null);
      toast.success("Signed out");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Advertiser Portal</CardTitle>
          <p className="text-sm text-muted-foreground">
            Secure sign-in with Supabase Auth. This replaces the legacy localStorage password session.
          </p>
        </CardHeader>
        <CardContent>
          {currentIdentity ? (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/40 p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Signed in as</div>
                <div className="mt-1 font-semibold">{currentIdentity.username}</div>
                <div className="text-sm text-muted-foreground">{currentIdentity.email}</div>
              </div>
              <Button className="w-full" onClick={handleSignOut} disabled={busy}>Sign out</Button>
            </div>
          ) : (
            <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-3 mt-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="advertiser@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button className="w-full" disabled={busy} onClick={handleSignIn}>Sign in</Button>
              </TabsContent>

              <TabsContent value="signup" className="space-y-3 mt-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="3–20 characters" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="advertiser@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Country <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input value={country} onChange={(e) => setCountry(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Age <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} maxLength={10} />
                </div>
                <Button className="w-full" disabled={busy} onClick={handleSignUp}>Create account</Button>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
