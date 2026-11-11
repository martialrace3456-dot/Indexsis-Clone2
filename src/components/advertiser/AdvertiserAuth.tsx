import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAdvertiserSession } from "@/hooks/useAdvertiserSession";

export function AdvertiserAuth() {
  const { login, register } = useAdvertiserSession();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSignIn = async () => {
    if (!username.trim() || !password) { toast.error("Enter username and password"); return; }
    setBusy(true);
    const { error } = await login(username.trim(), password);
    setBusy(false);
    if (error) toast.error(error);
    else toast.success("Signed in");
  };

  const handleSignUp = async () => {
    if (username.length < 3 || username.length > 20) { toast.error("Username must be 3–20 characters"); return; }
    if (password.length < 4) { toast.error("Password must be at least 4 characters"); return; }
    if (email && !/^.+@.+\..+$/.test(email)) { toast.error("Enter a valid email"); return; }
    setBusy(true);
    const { error } = await register(username.trim(), password, email.trim() || undefined, country.trim() || undefined, ageGroup.trim() || undefined);
    setBusy(false);
    if (error) toast.error(error);
    else toast.success("Account created — you're signed in. The same account can also play the game.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Advertiser Portal</CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage your ads, fund your account, and bid for runtime. Your username/password is the same one used in the game.
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-3 mt-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} maxLength={20} />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button className="w-full" disabled={busy} onClick={handleSignIn}>Sign in</Button>
            </TabsContent>

            <TabsContent value="signup" className="space-y-3 mt-4">
              <div className="space-y-2">
                <Label>Username (also used in-game)</Label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="3–20 characters" />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
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
        </CardContent>
      </Card>
    </div>
  );
}