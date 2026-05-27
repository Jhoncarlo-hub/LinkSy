import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StatusBar, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) { setError(signInError.message); setLoading(false); return }
    navigation.replace('Chat')
    setLoading(false)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 32 }}>
            <Text style={{ color: '#6b7280', fontSize: 14 }}>← Back</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#ffffff', marginBottom: 8 }}>Welcome back</Text>
          <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 32 }}>Login to your account</Text>
          {error !== '' && (
            <View style={{ backgroundColor: '#2a1515', borderWidth: 1, borderColor: '#ef4444', borderRadius: 10, padding: 12, marginBottom: 16 }}>
              <Text style={{ color: '#ef4444', fontSize: 13 }}>{error}</Text>
            </View>
          )}
          <Text style={{ color: '#e5e7eb', fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Email</Text>
          <TextInput value={email} onChangeText={setEmail} placeholder="Enter your email" placeholderTextColor="#4b5563" keyboardType="email-address" autoCapitalize="none" style={{ backgroundColor: '#161616', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 10, padding: 14, color: '#ffffff', fontSize: 14, marginBottom: 16 }} />
          <Text style={{ color: '#e5e7eb', fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Password</Text>
          <View style={{ position: 'relative', marginBottom: 24 }}>
            <TextInput value={password} onChangeText={setPassword} placeholder="Enter your password" placeholderTextColor="#4b5563" secureTextEntry={!showPassword} style={{ backgroundColor: '#161616', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 10, padding: 14, color: '#ffffff', fontSize: 14, paddingRight: 50 }} />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 14, top: 14 }}>
              <Text style={{ fontSize: 18 }}>{showPassword ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={handleLogin} disabled={loading} style={{ backgroundColor: '#ffffff', borderRadius: 12, padding: 16, alignItems: 'center', opacity: loading ? 0.7 : 1 }}>
            <Text style={{ color: '#000000', fontSize: 15, fontWeight: '700' }}>{loading ? 'Signing in...' : 'Login'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={{ marginTop: 20, alignItems: 'center' }}>
            <Text style={{ color: '#6b7280', fontSize: 13 }}>Don't have an account? <Text style={{ color: '#ffffff', fontWeight: '700' }}>Sign up</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}