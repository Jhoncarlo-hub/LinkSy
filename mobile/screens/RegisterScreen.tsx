import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StatusBar, Alert, ActivityIndicator, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'

const C = {
  bg: '#080b18', input: '#141728', accent: '#7c3aed',
  border: 'rgba(255,255,255,0.07)', text: '#fff', muted: '#6b7280',
}

const Field = ({ icon, placeholder, value, onChange, secure, keyboardType, right }: any) => {
  const [show, setShow] = useState(false)
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', backgroundColor: C.input,
      borderRadius: 14, paddingHorizontal: 16, marginBottom: 14,
      borderWidth: 1, borderColor: C.border
    }}>
      <Text style={{ fontSize: 16, marginRight: 10 }}>{icon}</Text>
      <TextInput
        value={value} onChangeText={onChange}
        placeholder={placeholder} placeholderTextColor={C.muted}
        secureTextEntry={secure && !show}
        keyboardType={keyboardType || 'default'}
        autoCapitalize="none"
        style={{ flex: 1, color: C.text, paddingVertical: 16, fontSize: 15 }}
      />
      {secure && (
        <TouchableOpacity onPress={() => setShow(p => !p)}>
          <Text style={{ fontSize: 18 }}>{show ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      )}
      {right && <Text style={{ color: C.muted, fontSize: 18 }}>→</Text>}
    </View>
  )
}

export default function RegisterScreen({ navigation }: any) {
  const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const set = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleRegister = async () => {
    if (!form.fullName || !form.username || !form.email || !form.password)
      return Alert.alert('Error', 'Fill in all fields')
    if (form.password !== form.confirm)
      return Alert.alert('Error', 'Passwords do not match')

    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email: form.email, password: form.password })
    if (error) { setLoading(false); return Alert.alert('Error', error.message) }

    await supabase.from('profiles').insert({
      id: data.user!.id,
      full_name: form.fullName,
      username: form.username,
      is_online: true,
    })
    setLoading(false)
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user!.id).single()
    navigation.replace('Chat', { user: profile })
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 20 }}>
          <Text style={{ color: C.text, fontSize: 26 }}>←</Text>
        </TouchableOpacity>

        <View style={{ paddingHorizontal: 28, paddingBottom: 40 }}>
          <Text style={{ color: C.text, fontSize: 28, fontWeight: '800', marginBottom: 6 }}>
            Create your account ✨
          </Text>
          <Text style={{ color: C.muted, fontSize: 14, marginBottom: 32 }}>Sign up to get started</Text>

          <Field icon="👤" placeholder="Enter your full name" value={form.fullName} onChange={set('fullName')} right />
          <Field icon="@" placeholder="Enter your username" value={form.username} onChange={set('username')} right />
          <Field icon="✉️" placeholder="Enter your email" value={form.email} onChange={set('email')} keyboardType="email-address" right />
          <Field icon="🔒" placeholder="Create a password" value={form.password} onChange={set('password')} secure />
          <Field icon="🔒" placeholder="Confirm your password" value={form.confirm} onChange={set('confirm')} secure />

          <TouchableOpacity
            onPress={handleRegister} disabled={loading}
            style={{
              backgroundColor: C.accent, borderRadius: 16, paddingVertical: 17,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              marginTop: 8, marginBottom: 24,
              shadowColor: C.accent, shadowOpacity: 0.5, shadowRadius: 14, elevation: 7
            }}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', marginRight: 10 }}>Sign up</Text>
                  <Text style={{ color: '#fff', fontSize: 20 }}>→</Text>
                </>
            }
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
            <Text style={{ color: C.muted, fontSize: 14 }}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.replace('Login')}>
              <Text style={{ color: C.accent, fontSize: 14, fontWeight: '700' }}>Log in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}