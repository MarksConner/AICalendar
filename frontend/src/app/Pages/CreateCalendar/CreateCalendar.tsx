import { useState } from "react";
import type React from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "../../design_system/components/ui/Card";
import { Button } from "../../design_system/components/ui/Button";
import { Input } from "../../design_system/components/ui/Input";

function toISODateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString();
}

export const CreateCalendar = () => {
  const [calendarName, setCalendarName] = useState("");
  const [icsFile, setIcsFile] = useState<File | null>(null);
  const [dateStart, setStartDate] = useState("");
  const [dateEnd, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();


  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const userID = localStorage.getItem("user_id");
    if (!userID) {
        setError("User not logged in");
      return;
    }

    const formData = new FormData();
    formData.append("user_id", userID!);
    formData.append("calendar_name", calendarName);
    formData.append("date_start", toISODateTime(dateStart));
    formData.append("date_end", toISODateTime(dateEnd));

    if (icsFile) {
      formData.append("file", icsFile);
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/calendar/create", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        setError("Create calendar failed");
        return;
      }

      const data = await response.json();
      console.log("Calendar created JSON:", data);
      setSuccess(true);
      navigate("/");
    } catch (error) {
      setError("Unexpected error during calendar creation");
      setSuccess(false);
    } finally {
      console.log("Request has finished");
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <Card className="w-96 mx-auto mt-20">
        <CardHeader>
          <h2 className="text-2xl font-bold text-center">
            Import New Calendar
          </h2>
        </CardHeader>
        <CardContent>
          <Input type="text" placeholder="Calendar Name" value={calendarName} onChange={(e) => setCalendarName(e.target.value)} required/>
          <Input type="file" accept=".ics" onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
                setIcsFile(e.target.files[0]);
            }
          }}
          />
          <Input type="date" placeholder="Start Date" value={dateStart} onChange={(e) => setStartDate(e.target.value)} required/>
          <Input type="date" placeholder="End Date" value={dateEnd} onChange={(e) => setEndDate(e.target.value)} required/>
        </CardContent>
        <CardFooter>
          {typeof error === "string" && error.length > 0 && (
            <p className="text-sm text-red-600 text-center">
              Errors during calendar creation, please try again.
              <br />
              <span className="text-xs">{error}</span>
            </p>
          )}
          <Button className="w-full mt-2" type="submit">
            Create Calendar
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};