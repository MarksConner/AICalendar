import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "../../design_system/components/ui/Card";
import { Button } from "../../design_system/components/ui/Button";
import { Input } from "../../design_system/components/ui/Input";

export const ResetLogin = () => {
  const [new_password, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email");
  const token = searchParams.get("token");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !token) {
      setError("Invalid or expired reset link");
      return;
    }

    try {
      const response = await fetch("/users/update_password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({email,token,new_password,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.detail ?? "Invalid or expired token");
        return;
      }
      navigate("/login",{ replace: true });
    } catch (err) {
      console.error(err);
      setError("Server error");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-xl font-semibold">Reset Password</h1>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            <Input type="password"placeholder="New password"value={new_password}onChange={(e) => setNewPassword(e.target.value)}required/>
            {error && (<p className="text-sm text-red-600">{error}</p>)}
          </CardContent>
          <CardFooter>
            <Button type="submit">
              Update Password
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};