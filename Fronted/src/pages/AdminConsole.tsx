import { useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { StatusChip } from '@/components/ui/StatusChip';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import type { User, UserRole } from '@/types';
import { createUser, listSystemUnits, listUsers, updateUserRole, type SystemUnit } from '@/api/admin';
import { useToast } from '@/components/ui/Toast';

const ROLE_FLOW: UserRole[] = ['VIEWER', 'OPERATOR', 'MANAGER', 'ADMIN'];

export default function AdminConsolePage() {
  const { success, error, info } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [systemUnits, setSystemUnits] = useState<SystemUnit[]>([]);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [department, setDepartment] = useState('Operations');
  const [role, setRole] = useState<UserRole>('VIEWER');

  useEffect(() => {
    Promise.all([listUsers(), listSystemUnits()])
      .then(([userRows, unitRows]) => {
        setUsers(userRows);
        setSystemUnits(unitRows);
      })
      .catch(() => error('Admin Data Unavailable', 'The backend could not load admin data.'));
  }, []);

  const handleAddUser = () => {
    setAddUserOpen(true);
  };

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const user = await createUser({
        email,
        display_name: displayName,
        department,
        role,
      });
      setUsers((current) => [user, ...current]);
      setAddUserOpen(false);
      setEmail('');
      setDisplayName('');
      setDepartment('Operations');
      setRole('VIEWER');
      success('User Created', `${user.displayName} was added to the NEXUS directory.`);
      info('Login Setup', 'Create the matching Supabase Auth user or run the local auth seed command before using this account to sign in.');
    } catch {
      error('User Not Created', 'The backend rejected the user creation request.');
    }
  };

  const handleCycleRole = async (user: User) => {
    const nextRole = ROLE_FLOW[(ROLE_FLOW.indexOf(user.role) + 1) % ROLE_FLOW.length];
    try {
      const updated = await updateUserRole(user.id, nextRole);
      setUsers((current) => current.map((row) => (row.id === updated.id ? updated : row)));
      success('Role Updated', `${updated.displayName} is now ${updated.role}.`);
    } catch {
      error('Role Not Updated', 'The backend rejected the RBAC update.');
    }
  };

  const statusForUnit = (unit: SystemUnit) => {
    if (['Healthy', 'Clear'].includes(unit.status)) return 'success' as const;
    if (['Active', 'Backlog', 'Attention'].includes(unit.status)) return 'warning' as const;
    return 'neutral' as const;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Admin Console"
        subtitle="User management, role-based access control (RBAC), and node configuration"
      >
        <Button
          variant="primary"
          onClick={handleAddUser}
          leftIcon={<span className="material-symbols-outlined text-[18px]">person_add</span>}
        >
          Add User
        </Button>
      </PageHeader>

      {/* User Directory */}
      <GlassCard padding="none">
        <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
          <h2 className="text-section-title font-section-title text-on-surface">User Directory</h2>
          <span className="text-label-caps font-label-caps text-on-surface-variant">{users.length} Active Operators</span>
        </div>
        <div className="overflow-x-auto">
          <table className="nexus-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-semibold text-on-surface flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-body-sm font-bold">
                      {u.displayName.charAt(0)}
                    </div>
                    {u.displayName}
                  </td>
                  <td className="font-mono-data text-mono-data text-on-surface-variant text-[12px]">{u.email}</td>
                  <td>
                    <span className="px-2 py-0.5 rounded text-label-caps font-label-caps bg-surface-container-high text-primary font-semibold">
                      {u.role}
                    </span>
                  </td>
                  <td className="text-on-surface-variant">{u.department}</td>
                  <td><StatusChip status="success" label="Active" /></td>
                  <td>
                    <Button variant="ghost" size="sm" onClick={() => handleCycleRole(u)}>Edit Permissions</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* RBAC Matrix Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard>
          <h3 className="text-section-title font-section-title text-on-surface mb-4">Role Permissions Matrix</h3>
          <div className="space-y-3 text-body-sm">
            {[
              { role: 'ADMIN', perms: 'Full read/write/override access across all 12 modules.' },
              { role: 'MANAGER', perms: 'Approval authorization, manual order creation, export reports.' },
              { role: 'OPERATOR', perms: 'Inventory updates, fulfillment dispatch, request creation.' },
              { role: 'VIEWER', perms: 'Read-only access to dashboard and public telemetry.' },
            ].map((r) => (
              <div key={r.role} className="p-3 bg-surface-container rounded-lg">
                <p className="font-bold text-primary mb-1">{r.role}</p>
                <p className="text-on-surface-variant">{r.perms}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="text-section-title font-section-title text-on-surface mb-4">System Units</h3>
          <div className="space-y-3 text-body-sm">
            {systemUnits.map((n) => (
              <div key={n.name} className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
                <span className="font-mono-data text-mono-data text-on-surface">{n.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-metadata font-metadata text-on-surface-variant">Load: {n.load}</span>
                  <StatusChip status={statusForUnit(n)} label={n.status} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <Modal
        isOpen={addUserOpen}
        onClose={() => setAddUserOpen(false)}
        title="Add NEXUS User"
        subtitle="Create a backend RBAC account in the connected database"
        icon="person_add"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="name@nexus.corp"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Display Name"
            placeholder="Operator Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
          <Input
            label="Department"
            placeholder="Operations"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            required
          />
          <div>
            <label className="font-label-caps text-label-caps text-on-surface-variant uppercase block mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full bg-surface-container-high border border-outline-variant/20 rounded-lg p-2.5 text-body-sm text-on-surface outline-none"
            >
              {ROLE_FLOW.map((roleOption) => (
                <option key={roleOption} value={roleOption}>
                  {roleOption}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
            <Button variant="secondary" type="button" onClick={() => setAddUserOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create User
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
