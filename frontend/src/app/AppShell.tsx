import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Button } from "./design_system/components/ui/Button";
import { SidePanel } from "./design_system/components/ui/SidePanel";
import { Banner } from "./design_system/components/ui/Banner";
import { Toast } from "./design_system/components/ui/Toast";

export function AppShell() {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-bg text-text">
      {/* Left navigation */}
      <aside className="w-64 border-r border-border flex flex-col">
        <div className="p-4 text-lg font-semibold">AI Calendar</div>
        <nav className="flex-1 px-2 space-y-1">
          <NavItem to="/">Dashboard</NavItem>
          <NavItem to="/today">Today&apos;s plan</NavItem>
          <NavItem to="/proposals">Proposals</NavItem>
        </nav>
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-sm"
            onClick={() => navigate("/login")}
          >
            Log out
          </Button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="h-14 border-b border-border flex items-center justify-between px-4">
          <div className="text-sm text-muted">Welcome back</div>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="secondary">
              Add task
            </Button>
          </div>
        </header>

        {/* Content + right panel */}
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 p-4 overflow-y-auto">
            {/* Example global toast / banner area */}
            <div className="mb-4 space-y-2 max-w-xl">
              <Toast
                variant="info"
                title="Tip"
                description="Use Today&apos;s plan to see a detailed timeline for your day."
              />
            </div>
            <Outlet />
          </main>

          {/* Right side panel (we'll later swap this for SidePanel-based patterns) */}
          <aside className="w-80 border-l border-border p-4 space-y-3">
            <Banner
              variant="success"
              title="AI insights"
              message="Leave-by time suggestions and conflict warnings will appear here."
            />
          </aside>
        </div>
      </div>

      {/* Example: global slide-out panel (closed by default) */}
      <SidePanel
        isOpen={false}
        onClose={() => {}}
        title="Details"
        side="right"
      >
        <p className="text-sm text-muted">
          You can later use this for a slide-out details or assistant panel.
        </p>
      </SidePanel>
    </div>
  );
}

function NavItem({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        [
          "flex items-center px-3 py-2 rounded-md text-sm transition-colors",
          isActive
            ? "bg-primary text-white"
            : "text-muted hover:bg-surface hover:text-text",
        ].join(" ")
      }
    >
      {children}
    </NavLink>
  );
}