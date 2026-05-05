import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { useNotifications } from '../../lib/notifications';
import { colors } from '../../lib/colors';

const ROLE_LABELS: Record<string, string> = {
  propietario: 'Propietario',
  establecimiento: 'Establecimiento',
  veterinario: 'Veterinario',
  admin: 'Administrador',
};

export default function PerfilScreen() {
  const { user, logout } = useAuth();
  const { notifications, unread, markAllRead } = useNotifications();
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Querés cerrar tu sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: logout },
    ]);
  };

  if (!user) return null;

  const initials = user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.userName}>{user.name}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{ROLE_LABELS[user.role] ?? user.role}</Text>
        </View>
        <Text style={styles.userEmail}>{user.email}</Text>
      </View>

      {/* Permisos */}
      {user.permissions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permisos activos</Text>
          <View style={styles.permGrid}>
            {user.permissions.map((p) => (
              <View key={p} style={styles.permBadge}>
                <Text style={styles.permText}>{p}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Notificaciones recientes */}
      {notifications.length > 0 && (
        <View style={styles.section}>
          <View style={styles.notifHeader}>
            <Text style={styles.sectionTitle}>Notificaciones</Text>
            {unread > 0 && (
              <TouchableOpacity onPress={markAllRead}>
                <Text style={styles.markRead}>Marcar todas como leídas</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.notifList}>
            {notifications.slice(0, 8).map((n) => (
              <View key={n.id} style={[styles.notifItem, !n.read && styles.notifUnread]}>
                {!n.read && <View style={styles.notifDot} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifTitle}>{n.title}</Text>
                  <Text style={styles.notifMsg} numberOfLines={2}>{n.message}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Cerrar sesión */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray50 },
  content: { padding: 20, gap: 24, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', gap: 8 },
  avatar: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: colors.white },
  userName: { fontSize: 20, fontWeight: '800', color: colors.gray900 },
  roleBadge: {
    backgroundColor: colors.primary, borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 5,
  },
  roleText: { fontSize: 13, fontWeight: '700', color: colors.white },
  userEmail: { fontSize: 14, color: colors.gray500 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.gray900 },
  permGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  permBadge: {
    backgroundColor: colors.white, borderRadius: 8,
    borderWidth: 1, borderColor: colors.gray200,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  permText: { fontSize: 12, fontWeight: '500', color: colors.gray700 },
  logoutBtn: {
    backgroundColor: '#fef2f2', borderRadius: 14, borderWidth: 1, borderColor: '#fecaca',
    paddingVertical: 14, alignItems: 'center',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: colors.red700 },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  markRead: { fontSize: 12, fontWeight: '600', color: colors.primary },
  notifList: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.gray100, overflow: 'hidden' },
  notifItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.gray50 },
  notifUnread: { backgroundColor: '#f0f4ff' },
  notifDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 5, flexShrink: 0 },
  notifTitle: { fontSize: 13, fontWeight: '700', color: colors.gray900 },
  notifMsg: { fontSize: 12, color: colors.gray500, marginTop: 2 },
});
