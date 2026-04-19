import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import MuiLink from "@mui/material/Link";
import {
  CalendarDays,
  Brain,
  Clock,
  Users,
  Zap,
  GraduationCap,
  ArrowRight,
  BookOpen,
  Target,
  ExternalLink,
} from "lucide-react";
import { Button } from "../../design_system/components/ui/Button";

// Brand colors
const PRIMARY = "#5a85e2";
const PRIMARY_DARK = "#3b65c8";
const BG_DARK = "#0f172a";   // dark navy background
const BG_MID = "#1e2d4a";    // mid-tone for gradient

// Top navbar with smooth-scroll links and Get Started CTA
function NavBar() {
  const navigate = useNavigate();
  return (
    <Box
      component="nav"
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backdropFilter: "blur(12px)",
        backgroundColor: "rgba(15, 23, 42, 0.85)",
        borderBottom: "1px solid rgba(90, 133, 226, 0.2)",
        px: 3,
        py: 1.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {/* Logo */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box
          component="img"
          src="/SmartCalendar_Logo.svg"
          alt="AI Calendar Agent logo"
          sx={{ width: 28, height: 28, borderRadius: 1 }}
        />
        <Typography
          variant="h6"
          fontWeight={700}
          sx={{ color: "#fff", letterSpacing: "-0.5px" }}
        >
          AI Calendar Agent
        </Typography>
      </Box>

      {/* Section links — hidden on mobile */}
      <Box
        component="ul"
        sx={{
          display: { xs: "none", md: "flex" },
          gap: 3,
          listStyle: "none",
          m: 0,
          p: 0,
        }}
      >
        {["About", "Team", "Project", "Resources"].map((label) => (
          <Box
            key={label}
            component="li"
            sx={{
              color: "rgba(255,255,255,0.65)",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
              transition: "color 0.2s",
              "&:hover": { color: "#fff" },
            }}
            onClick={() =>
              document
                .getElementById(label.toLowerCase())
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            {label}
          </Box>
        ))}
      </Box>

      <Button size="sm" onClick={() => navigate("/login")}>
        Get Started
      </Button>
    </Box>
  );
}

// Full-height hero with tagline, Get Started CTA, and a decorative AI card mockup
function HeroSection() {
  const navigate = useNavigate();
  return (
    <Box
      id="about"
      sx={{
        minHeight: "100vh",
        background: `linear-gradient(135deg, ${BG_DARK} 0%, ${BG_MID} 60%, #1a3060 100%)`,
        display: "flex",
        alignItems: "center",
        pt: 10,
        pb: 8,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow blobs */}
      <Box
        sx={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(90,133,226,0.18) 0%, transparent 70%)`,
          top: -100,
          right: -100,
          pointerEvents: "none",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(90,133,226,0.12) 0%, transparent 70%)`,
          bottom: -50,
          left: -50,
          pointerEvents: "none",
        }}
      />

      <Container maxWidth="lg">
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: "center",
            gap: 6,
          }}
        >
          {/* Left: text and CTAs */}
          <Box sx={{ flex: 1, zIndex: 1 }}>
            {/* Context badges */}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 3 }}>
              {["CS 426", "Team 32", "Spring 2026", "UNR"].map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  sx={{
                    bgcolor: "rgba(90,133,226,0.18)",
                    color: "#93b4f0",
                    border: "1px solid rgba(90,133,226,0.35)",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                  }}
                />
              ))}
            </Box>

            {/* Headline with gradient accent */}
            <Typography
              variant="h2"
              fontWeight={800}
              sx={{
                color: "#fff",
                lineHeight: 1.1,
                letterSpacing: "-1px",
                mb: 1,
                fontSize: { xs: "2.5rem", md: "3.5rem" },
              }}
            >
              AI Calendar
            </Typography>
            <Typography
              variant="h2"
              fontWeight={800}
              sx={{
                background: `linear-gradient(90deg, ${PRIMARY} 0%, #93b4f0 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                lineHeight: 1.1,
                letterSpacing: "-1px",
                mb: 3,
                fontSize: { xs: "2.5rem", md: "3.5rem" },
              }}
            >
              Agent
            </Typography>

            <Typography
              variant="h6"
              sx={{
                color: "rgba(255,255,255,0.6)",
                fontWeight: 400,
                maxWidth: 480,
                lineHeight: 1.7,
                mb: 4,
              }}
            >
              An intelligent scheduling assistant that adapts to your life; able to
              resolve conflicts, optimize focus time, and handle the
              cognitive load of modern scheduling so you don't have to.
            </Typography>

            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Button
                size="lg"
                onClick={() => navigate("/login")}
                style={{ gap: 8 }}
              >
                Get Started
                <ArrowRight size={16} />
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() =>
                  document
                    .getElementById("project")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                style={{
                  backgroundColor: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                Learn More
              </Button>
            </Box>
          </Box>

          {/* Right: decorative AI assistant mockup card */}
          <Box
            sx={{
              flex: 1,
              display: { xs: "none", md: "flex" },
              justifyContent: "center",
              zIndex: 1,
            }}
          >
            <Box
              sx={{
                width: 340,
                bgcolor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(90,133,226,0.3)",
                borderRadius: 3,
                p: 3,
                backdropFilter: "blur(8px)",
              }}
            >
              {/* Card header */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: `rgba(90,133,226,0.2)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Brain size={18} color={PRIMARY} />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    sx={{ color: "#fff" }}
                  >
                    AI Assistant
                  </Typography>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)" }}>
                    Ready to help
                  </Typography>
                </Box>
              </Box>

              {/* Simulated AI activity items */}
              {[
                {
                  icon: <Clock size={14} color="#93b4f0" />,
                  msg: "Reschedule Tuesday's conflict?",
                  sub: "3 events affected",
                },
                {
                  icon: <Zap size={14} color="#fbbf24" />,
                  msg: "Optimizing focus blocks…",
                  sub: "Found 2 hrs of deep work",
                  active: true,
                },
                {
                  icon: <CalendarDays size={14} color="#34d399" />,
                  msg: "Weekly plan ready",
                  sub: "No conflicts detected",
                },
              ].map((item, i) => (
                <Box
                  key={i}
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1.5,
                    p: 1.5,
                    mb: 1,
                    borderRadius: 2,
                    bgcolor: item.active
                      ? "rgba(90,133,226,0.12)"
                      : "rgba(255,255,255,0.03)",
                    border: item.active
                      ? "1px solid rgba(90,133,226,0.25)"
                      : "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <Box sx={{ mt: 0.25 }}>{item.icon}</Box>
                  <Box>
                    <Typography
                      variant="caption"
                      fontWeight={600}
                      sx={{ color: "#e2e8f0", display: "block" }}
                    >
                      {item.msg}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      {item.sub}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        {/* Measurable objectives strip */}
        <Box
          sx={{
            mt: 8,
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            pt: 4,
          }}
        >
          {[
            { label: "Time saved on scheduling", icon: <Clock size={16} /> },
            { label: "Fewer calendar conflicts", icon: <Zap size={16} /> },
            { label: "Higher schedule acceptance", icon: <Target size={16} /> },
            { label: "Reliable & performant", icon: <Brain size={16} /> },
          ].map((stat) => (
            <Box
              key={stat.label}
              sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
            >
              <Box sx={{ color: PRIMARY }}>{stat.icon}</Box>
              <Typography
                variant="body2"
                sx={{ color: "rgba(255,255,255,0.55)", fontWeight: 500 }}
              >
                {stat.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}

// Project description and four measurable objectives as feature cards
function ProjectSection() {
  return (
    <Box id="project" sx={{ py: 10, bgcolor: "#f8fafc" }}>
      <Container maxWidth="lg">
        {/* Section heading */}
        <Box sx={{ maxWidth: 760, mx: "auto", textAlign: "center", mb: 7 }}>
          <Chip
            label="Project Description"
            size="small"
            icon={<BookOpen size={13} />}
            sx={{
              mb: 2,
              bgcolor: `rgba(90,133,226,0.1)`,
              color: PRIMARY_DARK,
              fontWeight: 600,
              border: `1px solid rgba(90,133,226,0.25)`,
            }}
          />
          <Typography
            variant="h3"
            fontWeight={800}
            sx={{ letterSpacing: "-0.5px", mb: 2, color: "#0f172a" }}
          >
            Why we built this
          </Typography>
          <Typography variant="body1" sx={{ color: "#546377d6", lineHeight: 1.8 }} align="justify">
          Traditional calendars are passive. They display your events, but they don't help you actually manage your time. We built our intelligent, agent-driven calendar application to change that.
Most people struggle with the hidden complexity of daily scheduling like calculating drive times, accounting for traffic, balancing personal routines, and finding time for the things they enjoy. Existing tools leave all of that work to the user. We believed there was a better way.
Our application takes a proactive role in time management by integrating real-time location services and smart automation directly into the scheduling experience. The system continuously monitors a user's position and traffic conditions, automatically adjusting departure time recommendations and sending timely notifications so users always know when it's time to leave, leaving no mental math required.
We also built this with the whole person in mind. The app respects softer scheduling preferences like preferred sleep windows, personal downtime, and recurring routines, recognizing that a good schedule isn't just about productivity — it's about wellbeing too.
Finally, we wanted to help users make the most of their free time by surfacing local events and activities tailored to their interests and open time slots.
The result is a calendar that doesn't just record your life, but also help you live it more intentionally.
          </Typography>
        </Box>

        {/* Four measurable objectives */}
        <Grid container spacing={3}>
          {[
            {
              icon: <Clock size={20} />,
              title: "Time Saved",
              desc: "Measurably reduce weekly hours spent on manual scheduling and rescheduling tasks.",
              color: "#3b82f6",
              bg: "#eff6ff",
            },
            {
              icon: <Zap size={20} />,
              title: "Fewer Conflicts",
              desc: "Detect and resolve event conflicts automatically before they disrupt your day.",
              color: "#f59e0b",
              bg: "#fffbeb",
            },
            {
              icon: <Target size={20} />,
              title: "Schedule Acceptance",
              desc: "AI-proposed adaptations users actually accept, improving autonomy and trust.",
              color: "#10b981",
              bg: "#ecfdf5",
            },
            {
              icon: <Brain size={20} />,
              title: "Performance & Reliability",
              desc: "Software-end metrics ensuring the system stays fast and dependable at scale.",
              color: "#8b5cf6",
              bg: "#f5f3ff",
            },
          ].map((item) => (
            <Grid key={item.title} size={{ xs: 12, sm: 6, md: 3 }}>
              <Box
                sx={{
                  p: 3,
                  borderRadius: 3,
                  bgcolor: "#fff",
                  border: "1px solid #e2e8f0",
                  height: "100%",
                  transition: "box-shadow 0.2s, transform 0.2s",
                  "&:hover": {
                    boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
                    transform: "translateY(-2px)",
                  },
                }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: item.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: item.color,
                    mb: 2,
                  }}
                >
                  {item.icon}
                </Box>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                  {item.title}
                </Typography>
                <Typography variant="body2" sx={{ color: "#64748b", lineHeight: 1.7 }}>
                  {item.desc}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Audience callout */}
        <Box
          sx={{
            mt: 5,
            p: 4,
            borderRadius: 3,
            bgcolor: "#fff",
            border: "1px solid #e2e8f0",
          }}
        >
          <Typography
            variant="subtitle2"
            fontWeight={700}
            sx={{ mb: 1.5, color: "#0f172a" }}
          >
            Primary Audience
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748b", lineHeight: 1.8 }}>
            University students and working professionals across any industry —
            anyone whose schedule involves interdependent commitments that
            demand intelligent, adaptive management.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

// Team members and instructors/advisors
function TeamSection() {
  const teamMembers = [
    { name: "Byron Billy", initials: "BB" },
    { name: "Connor Marks", initials: "CM" },
    { name: "Edgar Rodriguez-Angulo", initials: "ER" },
    { name: "Luis Matheus Perdomo", initials: "LP" },
  ];

  const instructors = [
    {
      name: "David Feil-Seifer",
      role: "Instructor",
      affiliation: "UNR, CSE Department",
    },
    {
      name: "Vinh Le",
      role: "Instructor",
      affiliation: "UNR, CSE Department",
    },
    {
      name: "Ankita Shukla",
      role: "External Advisor",
      affiliation: "UNR, CSE Department",
    },
  ];

  // Each member gets a unique avatar color
  const avatarColors = [PRIMARY, "#10b981", "#f59e0b", "#8b5cf6"];

  return (
    <Box id="team" sx={{ py: 10, bgcolor: "#fff" }}>
      <Container maxWidth="lg">
        {/* Section heading */}
        <Box sx={{ textAlign: "center", mb: 7 }}>
          <Chip
            label="Team 32"
            size="small"
            icon={<Users size={13} />}
            sx={{
              mb: 2,
              bgcolor: `rgba(90,133,226,0.1)`,
              color: PRIMARY_DARK,
              fontWeight: 600,
              border: `1px solid rgba(90,133,226,0.25)`,
            }}
          />
          <Typography
            variant="h3"
            fontWeight={800}
            sx={{ letterSpacing: "-0.5px", color: "#0f172a" }}
          >
            Meet the team
          </Typography>
        </Box>

        {/* Team member avatar cards */}
        <Grid container spacing={3} sx={{ mb: 6 }}>
          {teamMembers.map((member, i) => (
            <Grid key={member.name} size={{ xs: 12, sm: 6, md: 3 }}>
              <Box
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: "1px solid #e2e8f0",
                  textAlign: "center",
                  transition: "box-shadow 0.2s, transform 0.2s",
                  "&:hover": {
                    boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
                    transform: "translateY(-2px)",
                  },
                }}
              >
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    bgcolor: avatarColors[i],
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mx: "auto",
                    mb: 2,
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "1.1rem",
                  }}
                >
                  {member.initials}
                </Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  {member.name}
                </Typography>
                <Typography variant="caption" sx={{ color: "#64748b" }}>
                  Team Member
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ mb: 6 }} />

        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography
            variant="h5"
            fontWeight={700}
            sx={{ color: "#0f172a", mb: 0.5 }}
          >
            Instructors &amp; Advisors
          </Typography>
        </Box>

        {/* Instructor/advisor cards */}
        <Grid container spacing={3} justifyContent="center">
          {instructors.map((person) => (
            <Grid key={person.name} size={{ xs: 12, sm: 6, md: 4 }}>
              <Box
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <GraduationCap size={20} color="#64748b" />
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {person.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: PRIMARY, fontWeight: 600, display: "block" }}
                  >
                    {person.role}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                    {person.affiliation}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

// Category badge colors for source types
const SOURCE_CATEGORY_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  "Problem-Domain Book": { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  "Project Related":     { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  "Reference Article":   { bg: "#fdf4ff", color: "#7e22ce", border: "#e9d5ff" },
};

// References, sources, and project materials
function ResourcesSection() {
  const sources = [
    {
      category: "Problem-Domain Book",
      title: "Pinedo — Scheduling: Theory, Algorithms, and Systems (6th ed.)",
      citation: "M. Pinedo, Scheduling: Theory, Algorithms, and Systems, 6th ed. Springer.",
      desc: "Graduate-level foundation on single/multiprocessor scheduling, resource constraints, and objective design (lateness, tardiness). Useful for modeling hard constraints (no-overlap, deadlines) and soft penalties (preferences/change cost), plus case studies that map well to calendar-style optimization and latency targets.",
      url: null,
    },
    {
      category: "Project Related",
      title: "OAuth2 with Password (and Hashing), Bearer with JWT Tokens",
      citation: '"OAuth2 with password (and hashing), bearer with JWT tokens," FastAPI. Accessed Feb. 18, 2026.',
      desc: "Documentation for implementing hashes to protect sensitive data. Works with FastAPI — supports salting, hashing, password verification, and returning authenticated users.",
      url: "https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/",
    },
    {
      category: "Project Related",
      title: "IETF RFC 5545 — iCalendar Core Object Specification",
      citation: "IETF RFC 5545: Internet Calendaring and Scheduling Core Object Specification (iCalendar).",
      desc: "Authoritative standard defining events, recurrences (RRULE), exceptions (EXDATE), time zones (VTIMEZONE), alarms, and free/busy info. Essential for modeling hard/soft constraints and ensuring interoperability with Google/Microsoft APIs, especially around recurrence semantics and daylight-saving transitions.",
      url: "https://icalendar.org/RFC-Specifications/iCalendar-RFC-5545/",
    },
    {
      category: "Project Related",
      title: "The React Mega-Tutorial, Chapter 6: Building an API Client",
      citation: 'M. Grinberg, "The React Mega-Tutorial, Chapter 6: Building an API Client," miguelgrinberg.com. Accessed Feb. 18, 2026.',
      desc: "Used as inspiration for the API client structure connecting backend and frontend. The pattern reduces boilerplate and facilitates component reusability.",
      url: "https://blog.miguelgrinberg.com/post/the-react-mega-tutorial-chapter-6-building-an-api-client",
    },
    {
      category: "Reference Article",
      title: "Fielding — Architectural Styles and the Design of Network-Based Software Architectures",
      citation: 'R. T. Fielding, "Architectural Styles and the Design of Network-Based Software Architectures," ACM. Accessed Feb. 18, 2026.',
      desc: "Defines how components of a distributed web system should be built, how intermediary components should behave to reduce latency, and how security should be enforced — including how backends and frontends should interact and stay separate.",
      url: "https://dl.acm.org/doi/10.5555/932295",
    },
    {
      category: "Reference Article",
      title: "Calendar.help: Designing a Workflow-Based Scheduling Agent with Humans in the Loop",
      citation: "J. Cranshaw et al., \"Calendar.help,\" in Proc. CHI '17, ACM, New York, NY, USA, pp. 2382–2393. https://doi.org/10.1145/3025453.3025780",
      desc: "Describes a deployed assistant that structures scheduling into micro-workflows, automates common cases, and escalates edge cases. Great evidence for mixed-initiative UX and human-in-the-loop design patterns for AI calendar agents.",
      url: "https://doi.org/10.1145/3025453.3025780",
    },
  ];

  return (
    <Box id="resources" sx={{ py: 10, bgcolor: "#f8fafc" }}>
      <Container maxWidth="lg">

        {/* Section heading */}
        <Box sx={{ textAlign: "center", mb: 7 }}>
          <Chip
            label="Resources"
            size="small"
            icon={<BookOpen size={13} />}
            sx={{
              mb: 2,
              bgcolor: "rgba(90,133,226,0.1)",
              color: PRIMARY_DARK,
              fontWeight: 600,
              border: "1px solid rgba(90,133,226,0.25)",
            }}
          />
          <Typography
            variant="h3"
            fontWeight={800}
            sx={{ letterSpacing: "-0.5px", color: "#0f172a", mb: 2 }}
          >
            Resources
          </Typography>
          <Typography variant="body1" sx={{ color: "#64748b" }}>
            References, documentation, and project materials for CS 426 — Team 32.
          </Typography>
        </Box>

        {/* Source reference cards */}
        <Grid container spacing={3} sx={{ mb: 7 }}>
          {sources.map((src) => {
            const style = SOURCE_CATEGORY_STYLES[src.category];
            return (
              <Grid key={src.title} size={{ xs: 12, md: 6 }}>
                <Box
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    bgcolor: "#fff",
                    border: "1px solid #e2e8f0",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.5,
                    transition: "box-shadow 0.2s",
                    "&:hover": { boxShadow: "0 4px 20px rgba(0,0,0,0.07)" },
                  }}
                >
                  {/* Category badge */}
                  <Chip
                    label={src.category}
                    size="small"
                    sx={{
                      alignSelf: "flex-start",
                      bgcolor: style.bg,
                      color: style.color,
                      border: `1px solid ${style.border}`,
                      fontSize: "0.68rem",
                      fontWeight: 600,
                    }}
                  />

                  {/* Title and optional link */}
                  <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: "#0f172a", lineHeight: 1.4 }}>
                      {src.title}
                    </Typography>
                    {src.url && (
                      <MuiLink
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ color: PRIMARY, flexShrink: 0, mt: 0.25 }}
                        aria-label={`Open ${src.title}`}
                      >
                        <ExternalLink size={15} />
                      </MuiLink>
                    )}
                  </Box>

                  {/* Description */}
                  <Typography variant="body2" sx={{ color: "#64748b", lineHeight: 1.7, flex: 1 }}>
                    {src.desc}
                  </Typography>

                  {/* Citation in monospace */}
                  <Typography
                    variant="caption"
                    sx={{
                      color: "#94a3b8",
                      fontFamily: "monospace",
                      fontSize: "0.68rem",
                      lineHeight: 1.5,
                      borderTop: "1px solid #f1f5f9",
                      pt: 1.5,
                    }}
                  >
                    {src.citation}
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>

        <Divider sx={{ mb: 7 }} />

        {/* Project materials */}
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography variant="h5" fontWeight={700} sx={{ color: "#0f172a" }}>
            Project Materials
          </Typography>
        </Box>
        <Grid container spacing={3} justifyContent="center">
          {[
            { title: "Project Poster", desc: "Our CS 426 project poster summarizing the AI Calendar Agent's goals, design, and results." },
            { title: "Demo Video",     desc: "A walkthrough of the AI Calendar Agent in action." },
            { title: "Source Code",    desc: "Full project repository including frontend and backend." },
          ].map((res) => (
            <Grid key={res.title} size={{ xs: 12, sm: 6, md: 4 }}>
              <Box
                sx={{
                  p: 3,
                  borderRadius: 3,
                  bgcolor: "#fff",
                  border: "1px solid #e2e8f0",
                  height: "100%",
                }}
              >
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                  {res.title}
                </Typography>
                <Typography variant="body2" sx={{ color: "#64748b", lineHeight: 1.7, mb: 2 }}>
                  {res.desc}
                </Typography>
                <Chip
                  label="Coming soon"
                  size="small"
                  sx={{ bgcolor: "#f1f5f9", color: "#64748b", fontSize: "0.7rem" }}
                />
              </Box>
            </Grid>
          ))}
        </Grid>

      </Container>
    </Box>
  );
}

// Page footer with project attribution
function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        py: 4,
        bgcolor: BG_DARK,
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CalendarDays size={18} color={PRIMARY} />
            <Typography
              variant="body2"
              fontWeight={700}
              sx={{ color: "rgba(255,255,255,0.85)" }}
            >
              AI Calendar Agent
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.35)" }}>
            CS 426 Senior Project · Team 32 · Spring 2026 · University of
            Nevada, Reno · CSE Department
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

// Root landing page — redirects to /today if user is already logged in
export function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      navigate("/today", { replace: true });
    }
  }, [navigate]);

  return (
    <Box sx={{ fontFamily: 'system-ui, -apple-system, "Inter", sans-serif' }}>
      <NavBar />
      <HeroSection />
      <ProjectSection />
      <TeamSection />
      <ResourcesSection />
      <Footer />
    </Box>
  );
}
