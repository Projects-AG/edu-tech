import React, { useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserCog,
  Users,
  Building2,
  Search,
  CheckCircle2,
  Crown,
  Settings,
} from "lucide-react";

import "./RoleCarousel.css";

const roles = [
  {
    id: 1,
    name: "Admin",
    category: "System Administration",
    description:
      "Manage the complete EduVerse NAAC system, users, roles, permissions, and institution settings.",
    permissions: ["Full System Access", "User Management", "Role Management"],
    icon: Settings,
  },
  {
    id: 2,
    name: "Coordinator",
    category: "NAAC Coordination",
    description:
      "Coordinate accreditation activities, criteria, evidence, submissions, and overall NAAC progress.",
    permissions: ["Accreditation", "Criteria", "Evidence"],
    icon: UserCog,
  },
  {
    id: 3,
    name: "Committee Member",
    category: "Committee",
    description:
      "Participate in NAAC committees, review criteria, evidence, and accreditation-related activities.",
    permissions: ["Committee", "Criteria Review", "Evidence Review"],
    icon: Users,
  },
  {
    id: 4,
    name: "Dept. Coordinator",
    category: "Department",
    description:
      "Manage department-level criteria, metrics, evidence, and required accreditation submissions.",
    permissions: ["Department", "Metrics", "Evidence"],
    icon: Building2,
  },
  {
    id: 5,
    name: "Reviewer",
    category: "Review",
    description:
      "Review assigned criteria, evidence, comments, and accreditation review status.",
    permissions: ["Assigned Reviews", "Evidence Review", "Comments"],
    icon: Search,
  },
  {
    id: 6,
    name: "Data Approver",
    category: "Data Validation",
    description:
      "Validate institutional data, evidence, and approve submitted information before final processing.",
    permissions: ["Data Validation", "Evidence", "Approvals"],
    icon: CheckCircle2,
  },
  {
    id: 7,
    name: "Principal / Director",
    category: "Institution Leadership",
    description:
      "Monitor institution-level accreditation progress, approvals, reports, and analytics.",
    permissions: ["Institution Overview", "Approvals", "Reports"],
    icon: Crown,
  },
];

function RoleCarousel({ selectedRole, onSelect }) {
  const carouselRef = useRef(null);

  const scrollLeft = () => {
    carouselRef.current?.scrollBy({
      left: -320,
      behavior: "smooth",
    });
  };

  const scrollRight = () => {
    carouselRef.current?.scrollBy({
      left: 320,
      behavior: "smooth",
    });
  };

  return (
    <div className="role-carousel-wrapper">

      {/* Header */}
      <div className="role-carousel-header">
        <div>
          <div className="role-carousel-title">
            <ShieldCheck size={22} />
            Select Your Role
          </div>

          <p className="role-carousel-subtitle">
            Your available role is determined by your institutional
            permissions.
          </p>
        </div>

        <div className="role-carousel-controls">
          <button
            type="button"
            onClick={scrollLeft}
            className="carousel-control"
            aria-label="Previous roles"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            type="button"
            onClick={scrollRight}
            className="carousel-control"
            aria-label="Next roles"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Role Cards */}
      <div
        ref={carouselRef}
        className="role-carousel"
      >
        {roles.map((role) => {
          const Icon = role.icon;

          const isSelected =
            selectedRole?.id === role.id ||
            selectedRole?.name === role.name;

          return (
            <button
              type="button"
              key={role.id}
              className={`role-carousel-card ${
                isSelected ? "role-carousel-card-selected" : ""
              }`}
              onClick={() => onSelect?.(role)}
            >
              {/* Icon */}
              <div className="role-carousel-icon">
                <Icon size={25} />
              </div>

              {/* Role information */}
              <div className="role-carousel-content">
                <span className="role-carousel-category">
                  {role.category}
                </span>

                <h3>{role.name}</h3>

                <p>{role.description}</p>

                {/* Permissions */}
                <div className="role-carousel-permissions">
                  {role.permissions.map((permission) => (
                    <span key={permission}>
                      {permission}
                    </span>
                  ))}
                </div>
              </div>

              {/* Selection indicator */}
              <div className="role-carousel-select">
                {isSelected ? "Selected" : "Select Role"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default RoleCarousel;