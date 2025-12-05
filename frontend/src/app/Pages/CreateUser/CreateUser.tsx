import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";


import {  Card,CardHeader,CardContent,CardFooter,} from "../../design_system/components/ui/Card";
import { Button } from "../../design_system/components/ui/Button";
import { Input } from "../../design_system/components/ui/Input";

export const CreateUser = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [first_name, setFirstName] = useState("");
  const [last_name, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successEmail, setSuccessEmail] = useState(false);

  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
        const response = await fetch("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({email,username,first_name,last_name,password,})
      });
      

      if (response.ok) {
        setSuccess(true);
        console.log("signup successful");
      } else {
        const data = await response.json().catch(() => null);
        setError(data?.detail ?? "Signup failed");
        return;
      }
        
      const emailResponse = await fetch("/users/send_verification_mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({email}),});
        
        if (!emailResponse.ok){
            const data = await emailResponse.json().catch(() => null);
            console.log("mail error:", data);
            setError(data?.detail ?? "User created, but verification failed");
            return;
            }
            setSuccessEmail(true);
            // Wait for verification
            await new Promise((resolve) => setTimeout(resolve, 2000));
            console.log("signup and verification successful");
            navigate("/");
    } catch (error) {
      console.error(error);
      setError("Network error");
    } finally {
      console.log("Request has finished");
    }
};

    return(
    <div className="min-h-screen flex items-center justify-center bg-bg text-text">
      <Card variant="elevated" className="w-full max-w-sm">
        <CardHeader>
          <h1 className="text-xl font-semibold">Welcome To AI Calendar</h1>
          <p className="text-sm text-muted">
            Create User
          </p>
        </CardHeader>
         <form onSubmit = {onSubmit}>  
          <CardContent className="space-y-3">
            <Input label="First Name" type="first_name" value = {first_name} onChange = {(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
            />
            <Input label="Last Name" type="last_name" value = {last_name} onChange = {(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
            />
            <Input label="User Name" type="username" value = {username} onChange = {(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
            />    
            <Input label="Email" type="email" value = {email} onChange = {(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            />
            <Input label="Password" type="password" value = {password} onChange = {(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} 
            />

            {success && (<p className="text-sm text-green-600 text-center"> Please check email for verification link </p>)}
            {successEmail && (<p className="text-sm text-green-600 text-center"> User created, accessing AICalendar ...</p>)}
          </CardContent>
          <CardFooter>
            <Button className="w-full mt-2" type = "submit"> Create </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};        