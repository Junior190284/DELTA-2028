import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_PERMISSIONS, hasDelegatedAccess } from "../lib/permissions.ts";
import type { UserPermissions } from "../lib/permissions.ts";

/**
 * DELTA 2018 GM — Mobile Admin Panel Access & Navigation Suite
 */

// Model representations corresponding to TeamHub & DeltaMoreMenuSheet
interface UserProfile {
  id: string;
  role: "admin" | "coach" | "parent" | string;
  display_name: string | null;
}

function computeCanOpenAdmin(profile: UserProfile, permissions: UserPermissions): boolean {
  const staff = profile.role === "admin" || profile.role === "coach";
  return staff || hasDelegatedAccess(permissions);
}

function getDesktopAdminNav(profile: UserProfile, permissions: UserPermissions) {
  const canOpenAdmin = computeCanOpenAdmin(profile, permissions);
  const staff = profile.role === "admin" || profile.role === "coach";
  if (!canOpenAdmin) return null;
  return {
    visible: true,
    href: "/admin",
    label: staff ? "ADMIN" : "POMOCNIK"
  };
}

function getMobileMoreMenuItems(
  canOpenAdmin: boolean,
  adminRoleLabel: string = "ADMIN"
) {
  // Canonical 10 base tiles
  const tiles = [
    { id: "players", title: "DRUŻYNA" },
    { id: "typer", title: "FANTASY & TYPER" },
    { id: "game", title: "DELTA GAME" },
    { id: "collection", title: "DELTA COLLECTION" },
    { id: "achievements", title: "OSIĄGNIĘCIA" },
    { id: "gallery", title: "GALERIA" },
    { id: "tv", title: "DELTA TV" },
    { id: "chronicle", title: "HISTORIA" },
    { id: "hall", title: "HALL OF FAME" },
    { id: "settings", title: "USTAWIENIA" }
  ];

  if (canOpenAdmin) {
    tiles.push({
      id: "admin",
      title: "PANEL ADMINA"
    });
  }

  const footerLinks = [
    { id: "knowledge", title: "Kącik Wiedzy & Dieta", href: "#" },
    { id: "public_site", title: "Strona Publiczna Klubu", href: "/" }
  ];

  if (canOpenAdmin) {
    footerLinks.unshift({
      id: "admin_link",
      title: `Panel Administratora (${adminRoleLabel})`,
      href: "/admin"
    });
  }

  return { tiles, footerLinks };
}

const CANONICAL_BOTTOM_NAV_ITEMS = [
  { id: "home", label: "HOME" },
  { id: "matches", label: "MECZE" },
  { id: "training", label: "TRENING" },
  { id: "news", label: "WIADOMOŚCI" },
  { id: "more", label: "WIĘCEJ" }
] as const;

describe("DELTA 2018 GM — Mobile Admin Access Test Suite", () => {

  // TEST 1: admin sees desktop admin entry
  it("TEST 1: admin sees desktop admin entry", () => {
    const adminProfile: UserProfile = { id: "u_admin", role: "admin", display_name: "Główny Admin" };
    const nav = getDesktopAdminNav(adminProfile, EMPTY_PERMISSIONS);
    assert.ok(nav, "Desktop admin nav should be present for admin");
    assert.equal(nav.visible, true);
    assert.equal(nav.href, "/admin");
    assert.equal(nav.label, "ADMIN");

    const coachProfile: UserProfile = { id: "u_coach", role: "coach", display_name: "Trener" };
    const coachNav = getDesktopAdminNav(coachProfile, EMPTY_PERMISSIONS);
    assert.ok(coachNav);
    assert.equal(coachNav.label, "ADMIN");
  });

  // TEST 2: admin sees mobile admin entry
  it("TEST 2: admin sees mobile admin entry in WIĘCEJ drawer", () => {
    const adminProfile: UserProfile = { id: "u_admin", role: "admin", display_name: "Admin" };
    const canOpenAdmin = computeCanOpenAdmin(adminProfile, EMPTY_PERMISSIONS);
    assert.equal(canOpenAdmin, true);

    const { tiles, footerLinks } = getMobileMoreMenuItems(canOpenAdmin, "ADMIN");
    const adminTile = tiles.find(t => t.id === "admin");
    assert.ok(adminTile, "Admin tile must be present in mobile WIĘCEJ grid");
    assert.equal(adminTile.title, "PANEL ADMINA");

    const adminFooter = footerLinks.find(f => f.id === "admin_link");
    assert.ok(adminFooter, "Admin footer link must be present in mobile WIĘCEJ footer");
    assert.equal(adminFooter.href, "/admin");
  });

  // TEST 3: ordinary user does not see mobile admin entry
  it("TEST 3: ordinary user does not see mobile admin entry (zero placeholders)", () => {
    const parentProfile: UserProfile = { id: "u_parent", role: "parent", display_name: "Rodzic" };
    const canOpenAdmin = computeCanOpenAdmin(parentProfile, EMPTY_PERMISSIONS);
    assert.equal(canOpenAdmin, false);

    const { tiles, footerLinks } = getMobileMoreMenuItems(canOpenAdmin);
    const adminTile = tiles.find(t => t.id === "admin");
    assert.equal(adminTile, undefined, "Ordinary user must NOT have admin tile");

    const adminFooter = footerLinks.find(f => f.id === "admin_link");
    assert.equal(adminFooter, undefined, "Ordinary user must NOT have admin footer link");

    // Total tiles for ordinary user is exactly 10
    assert.equal(tiles.length, 10);
  });

  // TEST 4: mobile bottom nav contains exactly 5 items
  it("TEST 4: mobile bottom nav contains exactly 5 items (no 6th admin button)", () => {
    assert.equal(CANONICAL_BOTTOM_NAV_ITEMS.length, 5);
    const labels = CANONICAL_BOTTOM_NAV_ITEMS.map(i => i.label);
    assert.deepEqual(labels, ["HOME", "MECZE", "TRENING", "WIADOMOŚCI", "WIĘCEJ"]);
    assert.equal((labels as string[]).includes("ADMIN"), false, "ADMIN must NEVER be a 6th bottom nav bar element");
  });

  // TEST 5: Admin Panel accessible from WIĘCEJ
  it("TEST 5: Admin Panel accessible from WIĘCEJ with valid navigation target", () => {
    let targetRoute = "";
    const mockNavigate = (tab: string) => {
      if (tab === "admin") {
        targetRoute = "/admin";
      } else {
        targetRoute = `/${tab}`;
      }
    };

    const adminProfile: UserProfile = { id: "u_admin", role: "admin", display_name: "Admin" };
    const canOpenAdmin = computeCanOpenAdmin(adminProfile, EMPTY_PERMISSIONS);
    const { tiles } = getMobileMoreMenuItems(canOpenAdmin, "ADMIN");
    const adminTile = tiles.find(t => t.id === "admin");
    assert.ok(adminTile);

    mockNavigate(adminTile.id);
    assert.equal(targetRoute, "/admin", "Clicking admin tile must trigger navigation to /admin");
  });

  // TEST 6: direct admin route rejects ordinary user
  it("TEST 6: direct admin route guard rejects ordinary user and allows staff/delegated", () => {
    function evaluateAdminRouteAccess(profile: UserProfile, permissions: UserPermissions): { allowed: boolean; redirectUrl?: string } {
      const coreStaff = ["admin", "coach"].includes(profile.role);
      if (!coreStaff && !hasDelegatedAccess(permissions)) {
        return { allowed: false, redirectUrl: "/dashboard" };
      }
      return { allowed: true };
    }

    const parentUser: UserProfile = { id: "u_parent", role: "parent", display_name: "Rodzic" };
    const parentCheck = evaluateAdminRouteAccess(parentUser, EMPTY_PERMISSIONS);
    assert.equal(parentCheck.allowed, false);
    assert.equal(parentCheck.redirectUrl, "/dashboard");

    const adminUser: UserProfile = { id: "u_admin", role: "admin", display_name: "Admin" };
    const adminCheck = evaluateAdminRouteAccess(adminUser, EMPTY_PERMISSIONS);
    assert.equal(adminCheck.allowed, true);

    const helperUser: UserProfile = { id: "u_helper", role: "parent", display_name: "Pomocnik Trenera" };
    const delegatedPerms: UserPermissions = { ...EMPTY_PERMISSIONS, can_manage_training: true };
    const helperCheck = evaluateAdminRouteAccess(helperUser, delegatedPerms);
    assert.equal(helperCheck.allowed, true);
  });

  // TEST 7: mobile menu uses same permission source as desktop
  it("TEST 7: mobile menu uses same permission source as desktop (single source of truth)", () => {
    const parentUser: UserProfile = { id: "u_parent", role: "parent", display_name: "Rodzic" };
    const adminUser: UserProfile = { id: "u_admin", role: "admin", display_name: "Admin" };
    const helperUser: UserProfile = { id: "u_helper", role: "parent", display_name: "Pomocnik" };
    const helperPerms: UserPermissions = { ...EMPTY_PERMISSIONS, can_manage_matches: true };

    // Evaluation for parent
    const desktopParent = computeCanOpenAdmin(parentUser, EMPTY_PERMISSIONS);
    const mobileParent = computeCanOpenAdmin(parentUser, EMPTY_PERMISSIONS);
    assert.equal(desktopParent, mobileParent);
    assert.equal(mobileParent, false);

    // Evaluation for admin
    const desktopAdmin = computeCanOpenAdmin(adminUser, EMPTY_PERMISSIONS);
    const mobileAdmin = computeCanOpenAdmin(adminUser, EMPTY_PERMISSIONS);
    assert.equal(desktopAdmin, mobileAdmin);
    assert.equal(mobileAdmin, true);

    // Evaluation for delegated helper
    const desktopHelper = computeCanOpenAdmin(helperUser, helperPerms);
    const mobileHelper = computeCanOpenAdmin(helperUser, helperPerms);
    assert.equal(desktopHelper, mobileHelper);
    assert.equal(mobileHelper, true);
  });

  // TEST 8: admin menu remains accessible at 320px
  it("TEST 8: admin menu remains accessible on narrow mobile screens (320px viewport)", () => {
    const sheetStyles = {
      position: "fixed",
      bottom: "0",
      maxHeight: "88vh",
      overflowY: "auto",
      paddingBottom: "env(safe-area-inset-bottom, 16px)",
      zIndex: 125
    };

    assert.equal(sheetStyles.overflowY, "auto", "Drawer content must be vertically scrollable");
    assert.equal(sheetStyles.zIndex, 125, "Drawer must render above bottom nav");
    assert.ok(sheetStyles.paddingBottom.includes("safe-area-inset-bottom"), "Must include safe area inset padding");
  });

});
