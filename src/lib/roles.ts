import type {User} from '@skillforge/vite/lib/types';

type RoleSource = Pick<User, 'roles'> | { roles?: unknown } | null | undefined;

function normalizeRole(role: unknown): string {
    if (typeof role === 'string') return role.toLowerCase();
    if (role && typeof role === 'object' && 'role' in role) {
        return String((role as { role: string }).role).toLowerCase();
    }
    return '';
}

export function getNormalizedRoles(user: RoleSource): string[] {
    if (!user?.roles || !Array.isArray(user.roles)) return [];
    return user.roles.map(normalizeRole).filter(Boolean);
}

export function isAdmin(user: RoleSource): boolean {
    return getNormalizedRoles(user).includes('admin');
}

export function isInstructor(user: RoleSource): boolean {
    return getNormalizedRoles(user).includes('instructor');
}

export function canAccessAdmin(user: RoleSource): boolean {
    return isAdmin(user) || isInstructor(user);
}
