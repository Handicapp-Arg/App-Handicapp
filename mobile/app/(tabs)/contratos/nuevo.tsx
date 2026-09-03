import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useCreateContract, useLookupUserByEmail } from '../../../hooks/use-contracts';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { haptic } from '../../../lib/haptics';
import { colors } from '../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight, touch } from '../../../styles/tokens';

const DEFAULT_BODY = `CONTRATO DE PENSIÓN EQUINA

Entre el establecimiento y el propietario, se acuerda:

1. El caballo quedará alojado en las instalaciones del establecimiento.
2. El propietario se compromete al pago mensual según lo acordado.
3. El establecimiento proveerá alimentación, veterinaria básica y cuidados diarios.
4. Gastos extraordinarios serán consultados previamente con el propietario.
5. El contrato tiene duración mínima de 3 meses, renovable automáticamente.

Firmado digitalmente en HandicApp.`;

export default function NuevoContratoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const createContract = useCreateContract();

  const [title, setTitle] = useState('Contrato de Pensión');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [body, setBody] = useState(DEFAULT_BODY);
  const [emailToSearch, setEmailToSearch] = useState('');
  const { data: foundUser, isFetching: searchingUser } = useLookupUserByEmail(emailToSearch);

  const canSubmit = !!foundUser && !!title.trim() && !createContract.isPending;

  const submit = async () => {
    if (!foundUser) return;
    await createContract.mutateAsync({ owner_id: foundUser.id, title: title.trim(), body });
    haptic.success();
    router.back();
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader scrollable showBack title="Nuevo contrato" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Text style={s.fieldLabel}>Email del propietario *</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            style={[s.input, { flex: 1 }]}
            value={ownerEmail}
            onChangeText={setOwnerEmail}
            placeholder="propietario@email.com"
            placeholderTextColor={c.textFaint}
            keyboardType="email-address"
            autoCapitalize="none"
            textContentType="emailAddress"
            returnKeyType="search"
            onSubmitEditing={() => setEmailToSearch(ownerEmail.trim())}
          />
          <TouchableOpacity
            style={[s.searchBtn, searchingUser && { opacity: 0.6 }]}
            onPress={() => setEmailToSearch(ownerEmail.trim())}
            disabled={searchingUser}
            activeOpacity={0.8}
          >
            {searchingUser
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.searchBtnText}>Buscar</Text>
            }
          </TouchableOpacity>
        </View>

        {emailToSearch && !searchingUser && (
          foundUser ? (
            <View style={s.userFound}>
              <Check size={18} color={c.success} strokeWidth={2.5} />
              <View style={{ flex: 1 }}>
                <Text style={s.userFoundName}>{foundUser.name}</Text>
                <Text style={s.userFoundRole}>{foundUser.role}</Text>
              </View>
            </View>
          ) : (
            <View style={s.userNotFound}>
              <Text style={s.userNotFoundText}>No se encontró ningún usuario con ese email.</Text>
            </View>
          )
        )}

        <Text style={[s.fieldLabel, { marginTop: space[3] }]}>Título *</Text>
        <TextInput style={s.input} value={title} onChangeText={setTitle} placeholderTextColor={c.textFaint} returnKeyType="next" />

        <Text style={[s.fieldLabel, { marginTop: space[3] }]}>Cuerpo del contrato *</Text>
        <TextInput
          style={[s.input, s.bodyInput]}
          value={body} onChangeText={setBody} multiline placeholderTextColor={c.textFaint}
        />
        <Text style={s.hint}>El propietario podrá firmar o rechazar el contrato desde su app.</Text>
      </ScrollView>

      <View style={[s.footer, { paddingBottom: insets.bottom + space[4] }]}>
        <TouchableOpacity style={[s.cancelBtn, { flex: 1 }]} onPress={() => router.back()}>
          <Text style={s.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.submitBtn, { flex: 1 }, !canSubmit && { opacity: 0.5 }]}
          disabled={!canSubmit}
          onPress={submit}
          activeOpacity={0.85}
        >
          {createContract.isPending
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.submitBtnText}>Crear contrato</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  body: { paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[8], gap: space[2] },
  fieldLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  input: { borderRadius: radius.md, paddingHorizontal: space[4], paddingVertical: space[3], fontSize: text.base, color: c.text, backgroundColor: c.surfaceAlt },
  bodyInput: { height: 220, textAlignVertical: 'top', paddingTop: space[3] },
  hint: { fontSize: text.xs, color: c.textFaint, marginTop: space[2] },
  searchBtn: { height: touch.field, borderRadius: radius.md, backgroundColor: c.brand, paddingHorizontal: space[4], justifyContent: 'center', alignItems: 'center', minWidth: 70 },
  searchBtnText: { fontSize: text.md, fontWeight: weight.bold, color: colors.white },
  userFound: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.successSoft, borderRadius: radius.md, padding: space[3] },
  userFoundName: { fontSize: text.sm, fontWeight: weight.bold, color: c.success },
  userFoundRole: { fontSize: text.xs, color: c.textMuted, textTransform: 'capitalize' },
  userNotFound: { backgroundColor: c.dangerSoft, borderRadius: radius.md, padding: space[3] },
  userNotFoundText: { fontSize: text.xs, color: c.danger },
  footer: { flexDirection: 'row', gap: space[3], paddingHorizontal: space[4], paddingTop: space[3], borderTopWidth: 1, borderTopColor: c.border },
  cancelBtn: { height: touch.button, justifyContent: 'center', borderRadius: radius.md, backgroundColor: c.surfaceAlt, alignItems: 'center' },
  cancelBtnText: { fontSize: text.md, fontWeight: weight.semibold, color: c.textMuted },
  submitBtn: { height: touch.button, justifyContent: 'center', borderRadius: radius.md, backgroundColor: c.brand, alignItems: 'center' },
  submitBtnText: { fontSize: text.md, fontWeight: weight.extrabold, color: colors.white },
});
