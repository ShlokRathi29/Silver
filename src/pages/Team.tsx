import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Role =
    | "owner"
    | "admin"
    | "editor"
    | "researcher"
    | "reviewer";

type TeamMember = {
    id: string;
    full_name: string | null;
    role: Role;
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

const ALL_ROLES: Role[] = [
    "owner",
    "admin",
    "editor",
    "researcher",
    "reviewer",
];

function formatRole(role: Role) {
    return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

export default function Team() {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentRole, setCurrentRole] = useState<Role | null>(null);

    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    async function loadTeam() {
        setLoading(true);
        setError("");

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                throw new Error("You are not authenticated.");
            }

            setCurrentUserId(user.id);

            const { data: currentProfile, error: profileError } =
                await supabase
                    .from("profiles")
                    .select("id, role, is_active")
                    .eq("id", user.id)
                    .single();

            if (profileError) {
                throw profileError;
            }

            if (!currentProfile.is_active) {
                throw new Error("Your account is inactive.");
            }

            const role = currentProfile.role as Role;
            setCurrentRole(role);

            if (role !== "owner" && role !== "admin") {
                setMembers([]);
                return;
            }

            const { data, error: membersError } = await supabase
                .from("profiles")
                .select(
                    "id, full_name, role, is_active, created_at, updated_at"
                )
                .order("created_at", { ascending: true });

            if (membersError) {
                throw membersError;
            }

            setMembers((data || []) as TeamMember[]);
        } catch (err: any) {
            setError(err?.message || "Failed to load team.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadTeam();
    }, []);

    async function updateMember(
        member: TeamMember,
        nextRole: Role,
        nextActive: boolean
    ) {
        setError("");
        setSuccess("");

        if (!currentUserId || !currentRole) {
            return;
        }

        // Never allow a user to modify their own account through Team.
        if (member.id === currentUserId) {
            setError("You cannot modify your own account from Team.");
            return;
        }

        // Admin cannot modify an owner.
        if (currentRole === "admin" && member.role === "owner") {
            setError("Admins cannot modify an owner.");
            return;
        }

        // Admin cannot promote anyone to owner.
        if (currentRole === "admin" && nextRole === "owner") {
            setError("Admins cannot assign the owner role.");
            return;
        }

        if (currentRole !== "owner" && currentRole !== "admin") {
            setError("You do not have permission to manage the team.");
            return;
        }

        const confirmed = window.confirm(
            `Update ${member.full_name || "this user"}?\n\n` +
            `Role: ${formatRole(member.role)} → ${formatRole(nextRole)}\n` +
            `Status: ${member.is_active ? "Active" : "Inactive"} → ${nextActive ? "Active" : "Inactive"
            }`
        );

        if (!confirmed) {
            return;
        }

        setSavingId(member.id);

        try {
            const { error: updateError } = await supabase
                .from("profiles")
                .update({
                    role: nextRole,
                    is_active: nextActive,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", member.id);

            if (updateError) {
                throw updateError;
            }

            setSuccess(
                `${member.full_name || "User"} was updated successfully.`
            );

            await loadTeam();
        } catch (err: any) {
            setError(err?.message || "Failed to update team member.");
        } finally {
            setSavingId(null);
        }
    }

    if (loading) {
        return (
            <div className="page">
                <div className="empty-state">Loading team...</div>
            </div>
        );
    }

    if (currentRole !== "owner" && currentRole !== "admin") {
        return (
            <div className="page">
                <div className="page-header">
                    <div>
                        <h1>Team</h1>
                        <p>Manage CreatorGear team access.</p>
                    </div>
                </div>

                <div className="error">
                    You do not have permission to access Team management.
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1>Team</h1>
                    <p>
                        Manage users, roles, and account access.
                    </p>
                </div>

                <button
                    type="button"
                    className="secondary-button"
                    onClick={loadTeam}
                    disabled={loading}
                >
                    Refresh
                </button>
            </div>

            {error && <div className="error">{error}</div>}

            {success && (
                <div className="success-message">
                    {success}
                </div>
            )}

            <div className="team-summary">
                <div className="team-summary-card">
                    <span>Total Members</span>
                    <strong>{members.length}</strong>
                </div>

                <div className="team-summary-card">
                    <span>Active Members</span>
                    <strong>
                        {members.filter((member) => member.is_active).length}
                    </strong>
                </div>

                <div className="team-summary-card">
                    <span>Your Role</span>
                    <strong>
                        {currentRole ? formatRole(currentRole) : "-"}
                    </strong>
                </div>
            </div>

            <div className="table-card team-table-card">
                {members.length === 0 ? (
                    <div className="empty-state">
                        No team members found.
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Joined</th>
                                <th>Access</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {members.map((member) => {
                                const isSelf = member.id === currentUserId;
                                const isOwner = member.role === "owner";

                                const canManage =
                                    !isSelf &&
                                    currentRole === "owner" ||
                                    (!isSelf &&
                                        currentRole === "admin" &&
                                        !isOwner);

                                return (
                                    <TeamMemberRow
                                        key={member.id}
                                        member={member}
                                        currentRole={currentRole}
                                        canManage={canManage}
                                        saving={savingId === member.id}
                                        onSave={updateMember}
                                        isSelf={isSelf}
                                    />
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

type TeamMemberRowProps = {
    member: TeamMember;
    currentRole: Role;
    canManage: boolean;
    saving: boolean;
    isSelf: boolean;
    onSave: (
        member: TeamMember,
        nextRole: Role,
        nextActive: boolean
    ) => Promise<void>;
};

function TeamMemberRow({
    member,
    currentRole,
    canManage,
    saving,
    isSelf,
    onSave,
}: TeamMemberRowProps) {
    const [role, setRole] = useState<Role>(member.role);
    const [active, setActive] = useState(member.is_active);

    useEffect(() => {
        setRole(member.role);
        setActive(member.is_active);
    }, [member.role, member.is_active]);

    const hasChanges =
        role !== member.role || active !== member.is_active;

    const availableRoles =
        currentRole === "admin"
            ? ALL_ROLES.filter((item) => item !== "owner")
            : ALL_ROLES;

    return (
        <tr>
            <td>
                <div className="team-user">
                    <strong>
                        {member.full_name || "Unnamed user"}
                    </strong>

                    <span className="team-user-id">
                        {member.id}
                    </span>
                </div>
            </td>

            <td>
                {canManage ? (
                    <select
                        className="team-role-select"
                        value={role}
                        onChange={(event) =>
                            setRole(event.target.value as Role)
                        }
                        disabled={saving}
                    >
                        {availableRoles.map((item) => (
                            <option key={item} value={item}>
                                {formatRole(item)}
                            </option>
                        ))}
                    </select>
                ) : (
                    <span className={`role-badge role-${member.role}`}>
                        {formatRole(member.role)}
                    </span>
                )}
            </td>

            <td>
                <span
                    className={
                        member.is_active
                            ? "status status-active"
                            : "status status-inactive"
                    }
                >
                    {member.is_active ? "Active" : "Inactive"}
                </span>
            </td>

            <td>{formatDate(member.created_at)}</td>

            <td>
                {canManage ? (
                    <label className="team-toggle">
                        <input
                            type="checkbox"
                            checked={active}
                            onChange={(event) =>
                                setActive(event.target.checked)
                            }
                            disabled={saving}
                        />
                        <span>
                            {active ? "Enabled" : "Disabled"}
                        </span>
                    </label>
                ) : (
                    <span className="team-access-text">
                        {isSelf
                            ? "Your account"
                            : member.role === "owner"
                                ? "Owner"
                                : "Restricted"}
                    </span>
                )}
            </td>

            <td>
                {canManage ? (
                    <button
                        type="button"
                        className="edit-button"
                        disabled={!hasChanges || saving}
                        onClick={() =>
                            onSave(member, role, active)
                        }
                    >
                        {saving ? "Saving..." : "Save"}
                    </button>
                ) : (
                    <span className="team-protected">
                        Protected
                    </span>
                )}
            </td>
        </tr>
    );
}