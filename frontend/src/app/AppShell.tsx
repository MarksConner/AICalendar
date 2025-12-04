import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Button } from "./design_system/components/ui/Button";
import { SidePanel } from "./design_system/components/ui/SidePanel";
import { Banner } from "./design_system/components/ui/Banner";
import { Toast } from "./design_system/components/ui/Toast";
import type React from "react";

export function AppShell() {
  const navigate = useNavigate();

  return (
    <div className="app-root">
      {/* Left sidebar */}
      <aside className="app-sidebar">
        <div className="sidebar-header">AI Calendar</div>

        <nav className="sidebar-nav">
          <NavItem to="/">Dashboard</NavItem>
          <NavItem to="/today">Today&apos;s plan</NavItem>
          <NavItem to="/proposals">Proposals</NavItem>
        </nav>
        
      </aside>

      {/* Main column */}
      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar-left">Welcome back</div>
          <div className="app-topbar-right">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate("/login")}
            >
            Log out
          </Button>
          </div>
        </header>

        <div className="app-content">
          <main className="app-main-content">
            <div className="app-toast-area">
              <Toast
                variant="info"
                title="Tip"
                description="Use Today’s plan to see a detailed timeline for your day."
              />
            </div>
            <Outlet />
          </main>

          <aside className="app-right-panel">
            <Banner
              variant="success"
              title="AI insights"
              message="Leave-by time suggestions and conflict warnings will appear here."
            />
          </aside>
        </div>
      </div>

      <SidePanel
        isOpen={false}
        onClose={() => {}}
        title="Details"
        side="right"
      >
        <p className="text-body text-muted">
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
        "nav-item" + (isActive ? " nav-item-active" : "")
      }
    >
      {children}
    </NavLink>
  );
}