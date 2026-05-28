import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StatusBar, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'

const C = {
  bg: '#080b18', card: '#0e1121', input: '#141728',
  accent: '#7c3aed', border: 'rgba(255,255,255,0.07)',
  text: '#fff', muted: '#6b7280',
}

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Error', 'Fill in all fields')
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setLoading(false); return Alert.alert('Login Failed', error.message) }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
    await supabase.from('profiles').update({ is_online: true }).eq('id', data.user.id)
    setLoading(false)
    navigation.replace('Chat', { user: profile })
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 20 }}>
        <Text style={{ color: C.text, fontSize: 26 }}>←</Text>
      </TouchableOpacity>

      <View style={{ flex: 1, paddingHorizontal: 28 }}>
        {/* Lock illustration */}
        <View style={{ alignItems: 'center', marginBottom: 36 }}>
          <View style={{
            width: 100, height: 100, borderRadius: 28,
            backgroundColor: 'rgba(124,58,237,0.15)', alignItems: 'center',
            justifyContent: 'center', marginBottom: 20,
            borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)',
            shadowColor: '#7c3aed', shadowOpacity: 0.4, shadowRadius: 20
          }}>
            <Text style={{ fontSize: 46 }}>🔐</Text>
          </View>
          <Text style={{ color: C.text, fontSize: 28, fontWeight: '800' }}>Welcome back! 👋</Text>
          <Text style={{ color: C.muted, fontSize: 14, marginTop: 6 }}>Login to your account</Text>
        </View>

        {/* Email */}
        <Text style={{ color: C.muted, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Email</Text>
        <View style={{
          flexDirection: 'row', alignItems: 'center', backgroundColor: C.input,
          borderRadius: 14, paddingHorizontal: 16, marginBottom: 16,
          borderWidth: 1, borderColor: C.border
        }}>
          <Text style={{ fontSize: 16, marginRight: 10 }}>✉️</Text>
          <TextInput
            value={email} onChangeText={setEmail}
            placeholder="Enter your email" placeholderTextColor={C.muted}
            style={{ flex: 1, color: C.text, paddingVertical: 16, fontSize: 15 }}
            keyboardType="email-address" autoCapitalize="none"
          />
        </View>

        {/* Password */}
        <Text style={{ color: C.muted, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Password</Text>
        <View style={{
          flexDirection: 'row', alignItems: 'center', backgroundColor: C.input,
          borderRadius: 14, paddingHorizontal: 16, marginBottom: 8,
          borderWidth: 1, borderColor: C.border
        }}>
          <Text style={{ fontSize: 16, marginRight: 10 }}>🔒</Text>
          <TextInput
            value={password} onChangeText={setPassword}
            placeholder="Enter your password" placeholderTextColor={C.muted}
            secureTextEntry={!showPass}
            style={{ flex: 1, color: C.text, paddingVertical: 16, fontSize: 15 }}
          />
          <TouchableOpacity onPress={() => setShowPass(!showPass)}>
            <Text style={{ fontSize: 18 }}>{showPass ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={{ alignSelf: 'flex-end', marginBottom: 32 }}>
          <Text style={{ color: C.accent, fontSize: 13, fontWeight: '600' }}>Forgot password?</Text>
        </TouchableOpacity>

        {/* Login button */}
        <TouchableOpacity
          onPress={handleLogin} disabled={loading}
          style={{
            backgroundColor: C.accent, borderRadius: 16, paddingVertical: 17,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            marginBottom: 20, shadowColor: C.accent, shadowOpacity: 0.5, shadowRadius: 14, elevation: 7
          }}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <>
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', marginRight: 10 }}>Log In</Text>
                <Text style={{ color: '#fff', fontSize: 20 }}>→</Text>
              </>
          }
        </TouchableOpacity>

        {/* Divider */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
          <Text style={{ color: C.muted, marginHorizontal: 14, fontSize: 13 }}>or</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
          <Text style={{ color: C.muted, fontSize: 14 }}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.replace('Register')}>
            <Text style={{ color: C.accent, fontSize: 14, fontWeight: '700' }}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}