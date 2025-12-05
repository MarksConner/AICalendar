import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";

import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "../../design_system/components/ui/Card";
import { Button } from "../../design_system/components/ui/Button";
import { Input } from "../../design_system/components/ui/Input";

export const LoginPage = () => {
  const [email, SetEmail] = useState("");
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) =>{e.preventDefault();setError(null);
      try{
        const response = await fetch("/users/login",{
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ email, password })
        });

        if (response.ok){
            setSuccess(true);
            console.log("login sucessfull")

            const data = await response.json();
            localStorage.setItem("access_token", data.access_token); 
            console.log("TOKEN")
            console.log(data.access_token)
            navigate("/");
            return;
          }
        else {
            const data = await response.json().catch(() => null);
            setError(data?.detail ?? "Login failed");
            return;
        }
      }
        catch (error){
          console.error(error);
        }
        finally{
          console.log("Request has finished");
        }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg text-text">
      <Card variant="elevated" className="w-full max-w-sm">
        <CardHeader>
          <h1 className="text-xl font-semibold">Welcome back</h1>
          <p className="text-sm text-muted">
            Log in to view your AI-powered schedule.
          </p>
        </CardHeader>

        <form onSubmit = {onSubmit}>  
          <CardContent className="space-y-3">
            <Input label="Email" type="email" value = {email} onChange = {(e: React.ChangeEvent<HTMLInputElement>) => SetEmail(e.target.value)}
            />
            <Input label="Password" type="password" value = {password} onChange = {(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} 
            />
            {success && (<p className="text-sm text-green-600 text-center"> Login successful!</p>
        )}
          </CardContent>
    
          <CardFooter>
            <Button className="w-full mt-2" type = "submit"> Log in</Button>
            <Button className="w-full" type="button" onClick={() => navigate("/provide-email")} >Forgot Passwords Click to recover</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};