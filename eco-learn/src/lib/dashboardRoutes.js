const DASHBOARD_PATHS = {
  student: "/dashboard/student",
  teacher: "/dashboard/teacher",
  schoolAdmin: "/dashboard/school-admin",
  ngoAdmin: "/dashboard/ngo-admin",
};

export function getDashboardPath(role) {
  return DASHBOARD_PATHS[role] || "/dashboard";
}

export function isDashboardRole(role) {
  return Boolean(DASHBOARD_PATHS[role]);
}

export function listDashboards() {
  return Object.entries(DASHBOARD_PATHS).map(([role, path]) => ({ role, path }));
}

export { DASHBOARD_PATHS };
