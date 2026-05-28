import { View, Text, TouchableOpacity, StatusBar } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const STARS = [
  {top:'6%',left:'10%',s:2},{top:'12%',left:'75%',s:3},{top:'20%',left:'42%',s:1.5},
  {top:'4%',left:'55%',s:2},{top:'32%',left:'90%',s:2},{top:'10%',left:'28%',s:1.5},
  {top:'45%',left:'4%',s:3},{top:'52%',left:'88%',s:2},{top:'25%',left:'18%',s:2},
  {top:'68%',left:'22%',s:1.5},{top:'75%',left:'70%',s:2},{top:'18%',left:'92%',s:1.5},
  {top:'38%',left:'60%',s:1},{top:'60%',left:'50%',s:2},{top:'85%',left:'40%',s:1.5},
]

export default function LandingScreen({ navigation }: any) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080b18' }}>
      <StatusBar barStyle="light-content" backgroundColor="#080b18" />

      {STARS.map((st, i) => (
        <View key={i} style={{
          position: 'absolute', width: st.s, height: st.s, borderRadius: st.s,
          backgroundColor: 'rgba(255,255,255,0.55)', top: st.top as any, left: st.left as any
        }} />
      ))}

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        {/* Logo */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <View style={{
            width: 110, height: 110, borderRadius: 32,
            backgroundColor: '#110a2e', borderWidth: 1.5,
            borderColor: 'rgba(139,92,246,0.45)', alignItems: 'center',
            justifyContent: 'center', marginBottom: 22,
            shadowColor: '#7c3aed', shadowOpacity: 0.6, shadowRadius: 24, elevation: 10
          }}>
            <Text style={{ fontSize: 52, fontWeight: '900', color: '#a78bfa' }}>L</Text>
          </View>
          <Text style={{ color: '#fff', fontSize: 40, fontWeight: '800', letterSpacing: 1.5 }}>LinkSy</Text>
          <Text style={{ color: '#6b7280', fontSize: 15, marginTop: 10, textAlign: 'center' }}>
            Connect with anyone, anywhere.
          </Text>
        </View>

        {/* Log In Button */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          style={{
            width: '100%', backgroundColor: '#7c3aed', borderRadius: 18,
            paddingVertical: 17, flexDirection: 'row', alignItems: 'center',
            justifyContent: 'center', marginBottom: 14,
            shadowColor: '#7c3aed', shadowOpacity: 0.5, shadowRadius: 16, elevation: 8
          }}
        >
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', marginRight: 10 }}>Log In</Text>
          <Text style={{ color: '#fff', fontSize: 20 }}>→</Text>
        </TouchableOpacity>

        {/* Create Account Button */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Register')}
          style={{
            width: '100%', borderRadius: 18, paddingVertical: 17,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
            backgroundColor: 'rgba(255,255,255,0.04)'
          }}
        >
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600', marginRight: 10 }}>Create Account</Text>
          <Text style={{ color: '#fff', fontSize: 20 }}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Feature cards */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 36, gap: 10 }}>
        {[
          { icon: '💬', title: 'Chat', desc: 'Instant messaging' },
          { icon: '👥', title: 'Connect', desc: 'With friends' },
          { icon: '🔒', title: 'Secure', desc: 'Your privacy' },
        ].map(item => (
          <View key={item.title} style={{
            flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20,
            padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)'
          }}>
            <View style={{
              width: 46, height: 46, borderRadius: 14,
              backgroundColor: 'rgba(124,58,237,0.2)', alignItems: 'center',
              justifyContent: 'center', marginBottom: 8
            }}>
              <Text style={{ fontSize: 22 }}>{item.icon}</Text>
            </View>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{item.title}</Text>
            <Text style={{ color: '#6b7280', fontSize: 10, textAlign: 'center', marginTop: 2 }}>{item.desc}</Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  )
}