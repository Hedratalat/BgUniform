import { useState } from "react";
import { Outlet } from "react-router-dom";
import NavBarDash from "../NavBarDash/NavBarDash";
import SideBarDash from "../SideBarDash/SideBarDash";

export default function DashBoardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div
      dir="ltr"
      className="min-h-screen flex flex-col lg:flex-row bg-gray-50"
    >
      {/* Sidebar */}
      <SideBarDash isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* main content*/}
      <div className="flex-1 flex flex-col">
        <NavBarDash onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
